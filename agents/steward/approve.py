"""Execute one manually approved mention without re-running notification discovery."""

from __future__ import annotations

import argparse
import asyncio
import json
import os

import structlog
from lib.github.dispatch import repository_dispatch

from agents.steward.approval import APPROVAL_LABEL, REQUEST_LABEL, parse_approval
from agents.steward.respond import draft_reply, marker, safety_check

log = structlog.get_logger()


def _label_names(issue: dict) -> set[str]:
    return {
        str(label.get("name") or "") if isinstance(label, dict) else str(label)
        for label in issue.get("labels") or []
    }


async def execute_approval(api, gist, router, control_repo: str, issue_number: int) -> dict:
    control_owner, control_name = control_repo.split("/", 1)
    approval_issue = await api.get_issue(control_owner, control_name, issue_number)
    labels = _label_names(approval_issue)
    if REQUEST_LABEL not in labels or APPROVAL_LABEL not in labels:
        raise ValueError("approval issue must carry both request and approval labels")
    payload = parse_approval(str(approval_issue.get("body") or ""))
    memory = await gist.load()
    key = f"{payload['repository']}#{int(payload['subject_number'])}"
    record = memory.active.get(key)
    if record is None:
        raise ValueError("approved mention has no active follow-up record")
    pending = record.pending_action or {}
    if pending.get("type") != "mention_approval" or pending.get("fingerprint") != payload["fingerprint"]:
        raise ValueError("approval does not match the pending mention fingerprint")

    owner, repo = str(payload["repository"]).split("/", 1)
    number = int(payload["subject_number"])
    subject = (
        await api.get_pull(owner, repo, number)
        if payload["subject_kind"] == "pull_request"
        else await api.get_issue(owner, repo, number)
    )
    comments = list(await api.get_issue_comments(owner, repo, number) or [])
    if payload["subject_kind"] == "pull_request":
        comments.extend(await api.get_pull_comments(owner, repo, number) or [])
        comments.extend(await api.get_pull_reviews(owner, repo, number) or [])
    trigger = {
        "id": int(payload["source_id"]),
        "body": str(payload["body"]),
        "user": {"login": str(payload["author"])},
    }
    decision = await draft_reply(router, record, subject, trigger, comments)
    dispatched = False
    if decision.action == "repository_work":
        await repository_dispatch(
            api,
            control_owner,
            control_name,
            "steward_issue_intake",
            {
                "issue_url": record.subject_url,
                "source_comment_id": int(payload["source_id"]),
                "memory_key": record.key,
            },
        )
        dispatched = True
    reply = f"{decision.body}\n\n{marker('reply', payload['source_id'])}"
    await safety_check(router, reply)
    posted = await api.create_issue_comment(owner, repo, number, reply)
    record.clear_action()
    record.status = "intake_dispatched" if dispatched else "mention_replied"
    record.remember_comment(int(payload["source_id"]))
    await gist.save(memory)
    await api.update_issue(
        control_owner,
        control_name,
        issue_number,
        state="closed",
        state_reason="completed",
    )
    return {
        "status": "approved_reply_posted",
        "source": payload["subject_url"],
        "comment_url": str(posted.get("html_url") or ""),
        "dispatched_to_vet": dispatched,
    }


async def _run(issue_number: int) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.github.gists import FollowupGist
    from rtk import Budget, Router

    control_repo = settings.github.control_repo or os.getenv("GITHUB_REPOSITORY", "")
    if not settings.github.token or not settings.followups.gist_token or not settings.followups.gist_id:
        log.error("steward.approval_missing_credentials")
        return 1
    if "/" not in control_repo:
        log.error("steward.approval_missing_control_repo")
        return 1
    api = GitHubAPI.from_token(settings.github.token)
    gist_api = GitHubAPI.from_token(settings.followups.gist_token)
    router = Router.from_settings("steward", budget=Budget("steward", limit=12_000))
    try:
        result = await execute_approval(
            api,
            FollowupGist(gist_api, settings.followups.gist_id),
            router,
            control_repo,
            issue_number,
        )
    except Exception as exc:
        log.error("steward.approval_failed", error=str(exc))
        return 1
    finally:
        await api.close()
        await gist_api.close()
        await router.aclose()
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Execute one approved @elixpoo mention")
    parser.add_argument("issue_number", type=int)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args.issue_number)))


if __name__ == "__main__":
    main()
