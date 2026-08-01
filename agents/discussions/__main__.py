"""Discussions squad entrypoint.

Run one event at a time:
  python -m agents.discussions merge
  python -m agents.discussions qna
  python -m agents.discussions respond
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import structlog

from agents.discussions.core import (
    UnsafeDraft,
    contains_mention,
    format_poll,
    merge_draft,
    public_body,
    qna_draft,
    reply_draft,
    safety_check,
)

log = structlog.get_logger()


def _event() -> dict:
    path = os.environ.get("GITHUB_EVENT_PATH", "")
    if not path:
        return {}
    return json.loads(Path(path).read_text())


def _repo_name(event: dict) -> str:
    configured = os.environ.get("ELIXPO_DISCUSSIONS_REPOSITORY", "").strip()
    event_repo = event.get("repository", {}).get("full_name", "")
    value = configured or event_repo or os.environ.get("GITHUB_REPOSITORY", "")
    if value.count("/") != 1:
        raise RuntimeError("set ELIXPO_DISCUSSIONS_REPOSITORY or GITHUB_REPOSITORY to owner/name")
    return value


def _marker(kind: str, source: str | int) -> str:
    safe_source = str(source).replace("--", "-")
    return f"<!-- elixpoo-discussions:{kind}:{safe_source} -->"


def _valid_title(value: object) -> str:
    title = str(value or "").strip()
    if not title or len(title) > 200:
        raise RuntimeError("generated discussion title must be 1–200 characters")
    return title


def _authored_by_bot(login: str, configured: str) -> bool:
    normalized = login.casefold().removesuffix("[bot]")
    return normalized in {"elixpoo", configured.casefold().removesuffix("[bot]")}


async def _handle_merge(api, discussions, router, event: dict) -> dict | None:
    pull = event.get("pull_request", {})
    if not pull or not pull.get("merged"):
        log.info("discussions.merge_skipped", reason="pull request was not merged")
        return None

    source = pull.get("node_id") or pull.get("number")
    marker = _marker("merge", source)
    if any(marker in item.get("body", "") for item in await discussions.recent()):
        log.info("discussions.duplicate_skipped", marker=marker)
        return None

    # The webhook's PR object is the authoritative merged snapshot. Fetch file
    # patches separately because webhook payloads do not include them.
    changed_files = await api.get_pull_files(discussions.owner, discussions.repo, int(pull["number"]))
    draft = await merge_draft(router, pull, changed_files)
    action = str(draft.get("action", "skip"))
    if action == "skip":
        log.info("discussions.merge_skipped", reason=str(draft.get("reason", ""))[:300])
        return None

    title = _valid_title(draft.get("title"))
    body = str(draft.get("body", "")).strip()
    if not body:
        raise RuntimeError("generated discussion body is empty")
    if action == "announcement":
        category = await discussions.category("Announcement", "Announcements")
    elif action == "poll":
        category = await discussions.category("Poll", "Polls")
        body = format_poll(body, list(draft.get("options", [])))
    else:
        raise RuntimeError(f"unknown merge decision action: {action}")

    body = public_body(body, marker)
    await safety_check(router, f"{title}\n\n{body}")
    created = await discussions.create(category.id, title, body)
    log.info("discussions.created", kind=action, url=created.get("url"))
    return created


async def _handle_qna(discussions, router) -> dict | None:
    recent = await discussions.recent()
    day = datetime.now(timezone.utc).date().isoformat()
    marker = _marker("qna", day)
    if any(marker in item.get("body", "") for item in recent):
        log.info("discussions.duplicate_skipped", marker=marker)
        return None
    draft = await qna_draft(router, [item.get("title", "") for item in recent])
    title = _valid_title(draft.get("title"))
    body = public_body(str(draft.get("body", "")), marker)
    if not str(draft.get("body", "")).strip():
        raise RuntimeError("generated Q&A body is empty")
    await safety_check(router, f"{title}\n\n{body}")
    category = await discussions.category("Q&A", "QNA", "Questions and Answers")
    created = await discussions.create(category.id, title, body)
    log.info("discussions.created", kind="qna", url=created.get("url"))
    return created


async def _handle_response(discussions, router, event: dict, bot_username: str) -> dict | None:
    discussion = event.get("discussion", {})
    comment = event.get("comment")
    source = comment or discussion
    body = str(source.get("body", ""))
    author = (source.get("user") or {}).get("login", "")
    if not discussion or not contains_mention(body) or _authored_by_bot(author, bot_username):
        log.info("discussions.response_skipped", reason="no eligible @elixpoo mention")
        return None

    source_id = source.get("node_id") or source.get("id")
    marker = _marker("reply", source_id)
    number = int(discussion["number"])
    comments = await discussions.comments(number)
    if any(marker in item.get("body", "") for item in comments):
        log.info("discussions.duplicate_skipped", marker=marker)
        return None

    mention = comment or {"body": discussion.get("body", ""), "user": discussion.get("user", {})}
    draft = await reply_draft(router, discussion, mention, comments)
    reply = public_body(draft, marker)
    await safety_check(router, reply)
    reply_to = comment.get("node_id") if comment else None
    created = await discussions.add_comment(discussion["node_id"], reply, reply_to)
    log.info("discussions.replied", url=created.get("url"))
    return created


async def _run(mode: str) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.github.discussions import GitHubDiscussions
    from rtk import Budget, Router

    if not settings.github.token:
        log.error("discussions.no_token", hint="set GITHUB_TOKEN in .env.local or Actions")
        return 1
    if not settings.pollinations.api_key:
        log.error("discussions.no_pollinations_key", hint="set ELIXPO_POLLINATIONS_API_KEY")
        return 1

    event = _event()
    owner, repo = _repo_name(event).split("/", 1)
    api = GitHubAPI.from_token(settings.github.token)
    discussions = GitHubDiscussions(api, owner, repo)
    router = Router.from_settings("discussions", budget=Budget("discussions", limit=12_000))
    try:
        if mode == "merge":
            await _handle_merge(api, discussions, router, event)
        elif mode == "qna":
            await _handle_qna(discussions, router)
        elif mode == "respond":
            await _handle_response(discussions, router, event, settings.github.bot_username)
        else:
            raise RuntimeError(f"unsupported discussions mode: {mode}")
    except UnsafeDraft as exc:
        log.warning("discussions.post_blocked", reason=str(exc))
        return 0
    finally:
        await api.close()
        await router.aclose()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Orchestrate elixpo GitHub Discussions")
    parser.add_argument("mode", choices=("merge", "qna", "respond"))
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args.mode)))


if __name__ == "__main__":
    main()
