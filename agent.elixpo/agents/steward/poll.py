"""Reconcile shared follow-up memory and answer pending mentions."""

from __future__ import annotations

import asyncio
import json
import os
import re
from urllib.parse import urlparse

import structlog
from lib.github.dispatch import repository_dispatch
from lib.state.followups import FollowupRecord

from agents.steward.approval import approval_body, approval_fingerprint, create_approval
from agents.steward.celebrate import build_terminal_action
from agents.steward.fix import build_fix_action
from agents.steward.mention_policy import MentionPolicy, MentionRoute, rejection_body
from agents.steward.respond import (
    authored_by_bot,
    completed_progress_body,
    contains_mention,
    draft_reply,
    marker,
    progress_body,
    safety_check,
)

log = structlog.get_logger()
_SUBJECT_API_RE = re.compile(r"^/repos/([^/]+)/([^/]+)/(issues|pulls)/(\d+)$")


def _subject_identity(api_url: str) -> tuple[str, str, str, int] | None:
    match = _SUBJECT_API_RE.fullmatch(urlparse(api_url).path)
    if not match:
        return None
    owner, repo, kind, number = match.groups()
    return owner, repo, "pull_request" if kind == "pulls" else "issue", int(number)


def _eligible_comments(record, comments: list[dict], bot_username: str) -> list[dict]:
    return [
        comment
        for comment in comments
        if int(comment.get("id") or 0) not in record.handled_comment_ids
        and contains_mention(str(comment.get("body") or ""))
        and not authored_by_bot(str((comment.get("user") or {}).get("login") or ""), bot_username)
    ]


async def _discover_mentions(notification_api, subject_api, memory, *, ttl_days: int) -> dict[str, str]:
    """Create bounded intake records from the bot account's GitHub notifications."""
    thread_ids: dict[str, str] = {}
    try:
        notifications = await notification_api._request(
            "GET",
            "/notifications",
            params={"participating": "true", "all": "false", "per_page": 50},
        )
    except Exception as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status != 403:
            raise
        log.warning(
            "steward.notifications_unavailable",
            reason="GitHub notifications require a classic token; reconciling tracked work only",
        )
        return thread_ids
    for notification in notifications or []:
        if notification.get("reason") not in {"mention", "team_mention"}:
            continue
        identity = _subject_identity(str((notification.get("subject") or {}).get("url") or ""))
        if identity is None:
            continue
        owner, repo, kind, number = identity
        repository = f"{owner}/{repo}"
        key = f"{repository}#{number}"
        thread_ids[key] = str(notification.get("id") or "")
        if key in memory.active:
            continue
        if kind == "pull_request":
            subject = await subject_api.get_pull(owner, repo, number)
        else:
            subject = await subject_api.get_issue(owner, repo, number)
        memory.upsert(
            FollowupRecord.create(
                repository=repository,
                subject_kind=kind,
                subject_number=number,
                subject_url=str(subject.get("html_url") or ""),
                title=str(subject.get("title") or ""),
                status="mention_received",
                ttl_days=ttl_days,
            )
        )
    return thread_ids


async def reconcile(
    api,
    gist,
    router,
    *,
    bot_username: str,
    ttl_days: int,
    max_replies: int = 2,
    control_repo: str = "",
    mention_policy: MentionPolicy | None = None,
    notification_api=None,
) -> dict:
    mention_policy = mention_policy or MentionPolicy.from_env()
    memory = await gist.load()
    expired = memory.prune_expired()
    notification_client = notification_api or api
    notification_threads = await _discover_mentions(
        notification_client, api, memory, ttl_days=ttl_days
    )
    replies = 0
    dispatched = 0
    terminal = 0
    fixes = 0
    approvals = 0
    rejected = 0

    for key, record in list(memory.active.items()):
        owner, repo = record.repository.split("/", 1)
        reviews: list[dict] = []
        if record.subject_kind == "pull_request":
            subject = await api.get_pull(owner, repo, record.subject_number)
            terminal_action = build_terminal_action(subject)
            if terminal_action is not None:
                if not control_repo or "/" not in control_repo:
                    raise RuntimeError("terminal reconciliation requires ELIXPO_GITHUB_CONTROL_REPO")
                if record.queue_action(terminal_action):
                    control_owner, control_name = control_repo.split("/", 1)
                    await repository_dispatch(
                        api,
                        control_owner,
                        control_name,
                        "steward_terminal",
                        {"key": key, "fingerprint": terminal_action["fingerprint"]},
                    )
                    record.status = f"{terminal_action['outcome']}_detected"
                    terminal += 1
                continue
            reviews = list(await api.get_pull_reviews(owner, repo, record.subject_number) or [])
            head_sha = str((subject.get("head") or {}).get("sha") or "")
            checks = list(await api.get_check_runs(owner, repo, head_sha) or []) if head_sha else []
            fix_action = build_fix_action(subject, reviews, checks)
            if fix_action is not None and record.fix_attempts.get(fix_action["fingerprint"], 0) < 1:
                if not control_repo or "/" not in control_repo:
                    raise RuntimeError("PR follow-up fixes require ELIXPO_GITHUB_CONTROL_REPO")
                if record.queue_action(fix_action):
                    control_owner, control_name = control_repo.split("/", 1)
                    await repository_dispatch(
                        api,
                        control_owner,
                        control_name,
                        "steward_fix",
                        {"key": key, "fingerprint": fix_action["fingerprint"]},
                    )
                    record.status = "changes_requested" if fix_action["review_ids"] else "ci_failed"
                    fixes += 1
        else:
            subject = await api.get_issue(owner, repo, record.subject_number)
            if str(subject.get("state") or "").casefold() == "closed":
                memory.complete(key, "closed")
                terminal += 1
                continue

        comments = list(await api.get_issue_comments(owner, repo, record.subject_number) or [])
        if record.subject_kind == "pull_request":
            comments.extend(await api.get_pull_comments(owner, repo, record.subject_number) or [])
            comments.extend(reviews)
        if contains_mention(str(subject.get("body") or "")):
            comments.append(
                {
                    "id": int(subject.get("id") or record.subject_number),
                    "body": subject.get("body") or "",
                    "created_at": subject.get("created_at") or "",
                    "user": subject.get("user") or {},
                }
            )
        comments.sort(key=lambda item: str(item.get("created_at") or ""))
        for comment in _eligible_comments(record, comments, bot_username):
            if replies >= max_replies:
                break
            source_id = int(comment["id"])
            author = str((comment.get("user") or {}).get("login") or "")
            route = mention_policy.route(
                author,
                record.repository,
                tracked=record.status != "mention_received" or bool(record.issue_url or record.branch),
            )
            final_marker = marker("reply", source_id)
            if any(final_marker in str(item.get("body") or "") for item in comments):
                record.remember_comment(source_id)
                continue

            if route == MentionRoute.REJECT:
                reply = rejection_body(source_id)
                await safety_check(router, reply)
                await api.create_issue_comment(owner, repo, record.subject_number, reply)
                record.remember_comment(source_id)
                rejected += 1
                replies += 1
                continue

            if route == MentionRoute.APPROVAL or (
                route == MentionRoute.VET and record.subject_kind != "issue"
            ):
                if not control_repo or "/" not in control_repo:
                    raise RuntimeError("mention approval requires ELIXPO_GITHUB_CONTROL_REPO")
                fingerprint = approval_fingerprint(record.repository, record.subject_number, source_id)
                action = {"type": "mention_approval", "fingerprint": fingerprint}
                if record.queue_action(action):
                    approval_payload = {
                        "repository": record.repository,
                        "subject_kind": record.subject_kind,
                        "subject_number": record.subject_number,
                        "subject_url": record.subject_url,
                        "source_id": source_id,
                        "author": author,
                        "body": str(comment.get("body") or "")[:3000],
                        "fingerprint": fingerprint,
                    }
                    await safety_check(router, approval_body(approval_payload))
                    approval = await create_approval(api, control_repo, approval_payload)
                    record.pending_action["approval_url"] = str(approval.get("html_url") or "")
                    record.status = "approval_required"
                    approvals += 1
                record.remember_comment(source_id)
                continue

            if route == MentionRoute.VET:
                if not control_repo or "/" not in control_repo:
                    raise RuntimeError("external mention intake requires ELIXPO_GITHUB_CONTROL_REPO")
                control_owner, control_name = control_repo.split("/", 1)
                await repository_dispatch(
                    api,
                    control_owner,
                    control_name,
                    "steward_issue_intake",
                    {
                        "issue_url": record.subject_url,
                        "source_comment_id": source_id,
                        "memory_key": record.key,
                    },
                )
                reply = (
                    "> Request accepted from an approved contributor. The issue has entered "
                    "the bounded Vet queue; no repository work starts unless Vet approves it.\n\n"
                    + final_marker
                )
                await safety_check(router, reply)
                await api.create_issue_comment(owner, repo, record.subject_number, reply)
                record.status = "intake_dispatched"
                record.remember_comment(source_id)
                dispatched += 1
                replies += 1
                continue
            progress_marker = marker("progress", source_id)
            progress_comment = next(
                (item for item in comments if progress_marker in str(item.get("body") or "")),
                None,
            )
            if progress_comment is None:
                progress = progress_body(source_id)
                await safety_check(router, progress)
                progress_comment = await api.create_issue_comment(owner, repo, record.subject_number, progress)
            draft = await draft_reply(router, record, subject, comment, comments)
            if draft.action == "repository_work":
                if not control_repo or "/" not in control_repo:
                    raise RuntimeError("repository-work intake requires ELIXPO_GITHUB_CONTROL_REPO")
                control_owner, control_name = control_repo.split("/", 1)
                await repository_dispatch(
                    api,
                    control_owner,
                    control_name,
                    "steward_issue_intake",
                    {
                        "issue_url": record.subject_url,
                        "source_comment_id": source_id,
                        "memory_key": record.key,
                    },
                )
                record.status = "intake_dispatched"
                dispatched += 1
            reply = f"{draft.body}\n\n{final_marker}"
            await safety_check(router, reply)
            await api.create_issue_comment(owner, repo, record.subject_number, reply)
            completed_progress = completed_progress_body(source_id)
            await safety_check(router, completed_progress)
            await api.update_issue_comment(owner, repo, int(progress_comment["id"]), completed_progress)
            record.remember_comment(source_id)
            replies += 1
            thread_id = notification_threads.get(key)
            if thread_id:
                await notification_client._request("PATCH", f"/notifications/threads/{thread_id}")

    await gist.save(memory)
    return {
        "active": len(memory.active),
        "completed": terminal,
        "expired": len(expired),
        "dispatched": dispatched,
        "replies": replies,
        "fixes": fixes,
        "approvals": approvals,
        "rejected": rejected,
    }


async def _run() -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.github.gists import FollowupGist
    from rtk import Budget, Router

    if not settings.github.token or not settings.followups.gist_token or not settings.followups.gist_id:
        log.error(
            "steward.missing_credentials",
            hint="set ELIXPOO_GITHUB_AGENTIC_TOKEN, ELIXPOO_GIST_AGENTIC_TOKEN, and ELIXPOO_FOLLOWUP_GIST_ID",
        )
        return 1
    github = GitHubAPI.from_token(settings.github.token)
    notifications_token = os.getenv("ELIXPOO_GITHUB_NOTIFICATIONS_TOKEN", "").strip()
    notifications = GitHubAPI.from_token(notifications_token) if notifications_token else github
    gist_api = GitHubAPI.from_token(settings.followups.gist_token)
    router = Router.from_settings("steward", budget=Budget("steward", limit=12_000))
    try:
        result = await reconcile(
            github,
            FollowupGist(gist_api, settings.followups.gist_id),
            router,
            bot_username=settings.github.bot_username,
            ttl_days=settings.followups.ttl_days,
            control_repo=settings.github.control_repo or os.getenv("GITHUB_REPOSITORY", ""),
            notification_api=notifications,
        )
    except Exception as exc:
        log.error("steward.poll_failed", error=str(exc))
        return 1
    finally:
        await github.close()
        if notifications is not github:
            await notifications.close()
        await gist_api.close()
        await router.aclose()
    log.info("steward.poll_done", **result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    main()
