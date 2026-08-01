"""Discussions squad entrypoint.

Run one event at a time:
  python -m agents.discussions merge
  python -m agents.discussions qna
  python -m agents.discussions respond
  python -m agents.discussions poll-mentions
  python -m agents.discussions pulse
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import structlog

from agents.discussions.core import (
    UnsafeDraft,
    contains_mention,
    emoji_title,
    merge_draft,
    public_body,
    qna_draft,
    render_activity,
    reply_draft,
    safety_check,
)
from agents.discussions.mood import Genre, Mood, MoodDecision, assess_mood

log = structlog.get_logger()

DEFAULT_DISCUSSIONS_REPOSITORY = "elixpo/elixpo"
LABEL_SPECS = {
    "announcement": {"color": "1d76db", "description": "Product and community announcements"},
    "qna": {"color": "0e8a16", "description": "Technical questions for the community"},
    "poll": {"color": "d876e3", "description": "Community polls and product decisions"},
    "mlops": {"color": "fbca04", "description": "Machine learning operations"},
    "gitops": {"color": "0052cc", "description": "GitOps workflows and operations"},
    "docker": {"color": "2496ed", "description": "Docker builds, images, and runtime"},
    "kubernetes": {"color": "326ce5", "description": "Kubernetes operations and architecture"},
    "elixpoo-generated": {"color": "6f42c1", "description": "Posted by the elixpoo contributor bot"},
    "mood-alert": {"color": "b60205", "description": "Urgent repository mood"},
    "mood-energized": {"color": "f9d0c4", "description": "Release and progress mood"},
    "mood-curious": {"color": "d4c5f9", "description": "Community decision mood"},
    "mood-mentoring": {"color": "c2e0c6", "description": "Teaching and knowledge-sharing mood"},
}


def _event() -> dict:
    path = os.environ.get("GITHUB_EVENT_PATH", "")
    if not path:
        return {}
    return json.loads(Path(path).read_text())


def _repo_name(event: dict) -> str:
    configured = os.environ.get("ELIXPO_DISCUSSIONS_REPOSITORY", "").strip()
    value = configured or DEFAULT_DISCUSSIONS_REPOSITORY
    if value.count("/") != 1:
        raise RuntimeError("set ELIXPO_DISCUSSIONS_REPOSITORY to owner/name")
    return value


def _source_repo_name(event: dict) -> str:
    value = event.get("repository", {}).get("full_name", "") or os.environ.get("GITHUB_REPOSITORY", "")
    if value.count("/") != 1:
        raise RuntimeError("merge events require a source repository in owner/name form")
    return value


def _marker(kind: str, source: str | int) -> str:
    safe_source = str(source).replace("--", "-")
    return f"<!-- elixpoo-discussions:{kind}:{safe_source} -->"


def _valid_title(value: object, emoji: str) -> str:
    title = str(value or "").strip()
    if not title:
        raise RuntimeError("generated discussion title is empty")
    titled = emoji_title(title, emoji)
    if len(titled) > 200:
        raise RuntimeError("generated discussion title with emoji must be at most 200 characters")
    return titled


def _authored_by_bot(login: str, configured: str) -> bool:
    normalized = login.casefold().removesuffix("[bot]")
    return normalized in {"elixpoo", configured.casefold().removesuffix("[bot]")}


def _labels_for(kind: str, topic: str = "general", mood: str | None = None) -> dict[str, dict[str, str]]:
    names = [kind]
    if topic in {"mlops", "gitops", "docker", "kubernetes"}:
        names.append(topic)
    mood_label = f"mood-{mood}" if mood else ""
    if mood_label in LABEL_SPECS:
        names.append(mood_label)
    names.append("elixpoo-generated")
    return {name: LABEL_SPECS[name] for name in names}


async def _publish(
    discussions,
    category_id: str,
    title: str,
    body: str,
    *,
    kind: str,
    topic: str,
    mood: str,
) -> dict:
    """Resolve/create labels before publishing, then attach them to the new Discussion."""
    labels = await discussions.ensure_labels(_labels_for(kind, topic, mood))
    created = await discussions.create(category_id, title, body)
    await discussions.add_labels(created["id"], [label.id for label in labels])
    created["labels"] = [label.name for label in labels]
    return created


def _cooldown_active(recent: list[dict], hours: int = 6) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return any(
        "<!-- elixpoo-discussions:" in item.get("body", "") and _created_at(item) >= cutoff
        for item in recent
    )


def _recent_moods(recent: list[dict], limit: int = 5) -> tuple[str, ...]:
    """Read newest mood labels while tolerating unlabeled legacy Discussions."""
    moods: list[str] = []
    for item in recent:
        raw_labels = item.get("labels") or {}
        labels = raw_labels.get("nodes", []) if isinstance(raw_labels, dict) else raw_labels
        for label in labels:
            name = str(label.get("name", "")).casefold()
            if name.startswith("mood-"):
                moods.append(name.removeprefix("mood-"))
                break
        if len(moods) >= limit:
            break
    return tuple(moods)


async def _publish_mood_activity(
    discussions,
    router,
    pulls: list[dict],
    files: list[dict],
    decision: MoodDecision,
    marker: str,
) -> dict:
    draft = await merge_draft(router, pulls, files, decision)
    genre = decision.genre
    title = _valid_title(draft.get("title"), decision.emoji)
    body = render_activity(genre, draft, pulls)
    if genre is Genre.ANNOUNCEMENT:
        category = await discussions.category("Announcement", "Announcements")
    elif genre is Genre.POLL:
        category = await discussions.category("Poll", "Polls")
    elif genre is Genre.QNA:
        category = await discussions.category("Q&A", "QNA", "Questions and Answers")
    else:
        raise RuntimeError("cannot publish a resting mood")
    body = public_body(body, marker)
    await safety_check(router, f"{title}\n\n{body}")
    created = await _publish(
        discussions,
        category.id,
        title,
        body,
        kind=genre.value,
        topic=str(draft.get("topic", "general")),
        mood=decision.mood.value,
    )
    log.info(
        "discussions.created",
        genre=genre.value,
        mood=decision.mood.value,
        labels=created["labels"],
        url=created.get("url"),
    )
    return created


async def _handle_merge(api, discussions, router, event: dict) -> dict | None:
    pull = event.get("pull_request", {})
    if not pull or not pull.get("merged"):
        log.info("discussions.merge_skipped", reason="pull request was not merged")
        return None

    source = pull.get("node_id") or pull.get("number")
    marker = _marker("merge", source)
    recent = await discussions.recent(limit=50)
    if any(marker in item.get("body", "") for item in recent):
        log.info("discussions.duplicate_skipped", marker=marker)
        return None

    # The webhook's PR object is the authoritative merged snapshot. Fetch file
    # patches separately because webhook payloads do not include them.
    source_owner, source_repo = _source_repo_name(event).split("/", 1)
    changed_files = await api.get_pull_files(source_owner, source_repo, int(pull["number"]))
    decision = assess_mood([pull], changed_files, recent_moods=_recent_moods(recent))
    log.info(
        "discussions.mood_updated",
        genre=decision.genre.value,
        mood=decision.mood.value,
        scores=decision.scores,
        signals=decision.signals,
    )
    if not decision.should_post:
        log.info("discussions.merge_skipped", reason="heuristic mood is resting")
        return None
    if decision.mood is not Mood.ALERT and _cooldown_active(recent):
        log.info("discussions.activity_deferred", reason="six-hour autonomous-post cooldown")
        return None
    return await _publish_mood_activity(discussions, router, [pull], changed_files, decision, marker)


async def _handle_qna(discussions, router) -> dict | None:
    recent = await discussions.recent()
    day = datetime.now(timezone.utc).date().isoformat()
    marker = _marker("qna", day)
    if any(marker in item.get("body", "") for item in recent):
        log.info("discussions.duplicate_skipped", marker=marker)
        return None
    if _cooldown_active(recent):
        log.info("discussions.qna_skipped", reason="six-hour autonomous-post cooldown")
        return None
    draft = await qna_draft(router, [item.get("title", "") for item in recent])
    title = _valid_title(draft.get("title"), "🧠")
    body = public_body(render_activity(Genre.QNA, draft), marker)
    await safety_check(router, f"{title}\n\n{body}")
    category = await discussions.category("Q&A", "QNA", "Questions and Answers")
    created = await _publish(
        discussions,
        category.id,
        title,
        body,
        kind="qna",
        topic=str(draft.get("topic", "general")),
        mood=Mood.MENTORING.value,
    )
    log.info("discussions.created", kind="qna", labels=created["labels"], url=created.get("url"))
    return created


async def _handle_pulse(api, discussions, router, event: dict) -> dict | None:
    """Recompute mood from recent unhandled merges and publish at a bounded cadence."""
    recent = await discussions.recent(limit=50)
    seen_text = "\n".join(item.get("body", "") for item in recent)
    source_owner, source_repo = _source_repo_name(event).split("/", 1)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    pulls = [
        pull
        for pull in await api.list_pulls(source_owner, source_repo, state="closed", per_page=30)
        if pull.get("merged_at")
        and _created_at({"createdAt": pull["merged_at"]}) >= cutoff
        and str(pull.get("node_id") or "") not in seen_text
    ][:5]
    if not pulls:
        log.info("discussions.mood_updated", mood=Mood.RESTING.value, reason="no unhandled recent merges")
        return None

    files: list[dict] = []
    for pull in pulls:
        files.extend(await api.get_pull_files(source_owner, source_repo, int(pull["number"])))
    decision = assess_mood(pulls, files, recent_moods=_recent_moods(recent))
    log.info(
        "discussions.mood_updated",
        genre=decision.genre.value,
        mood=decision.mood.value,
        scores=decision.scores,
        signals=decision.signals,
    )
    if not decision.should_post:
        return None
    if decision.mood is not Mood.ALERT and _cooldown_active(recent):
        log.info("discussions.activity_deferred", reason="six-hour autonomous-post cooldown")
        return None
    source_ids = ",".join(str(pull.get("node_id") or pull["number"]) for pull in pulls)
    return await _publish_mood_activity(
        discussions,
        router,
        pulls,
        files,
        decision,
        _marker("pulse", source_ids),
    )


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


def _webhook_actor(item: dict) -> dict:
    return {"login": (item.get("author") or {}).get("login", "")}


def _created_at(item: dict) -> datetime:
    value = str(item.get("createdAt", ""))
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


async def _poll_mentions(discussions, router, bot_username: str) -> int:
    """Catch target-repository mentions when its webhook cannot run this repository's workflow."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    handled = 0
    for raw_discussion in await discussions.recent_threads():
        discussion = {
            "node_id": raw_discussion["id"],
            "number": raw_discussion["number"],
            "title": raw_discussion.get("title", ""),
            "body": raw_discussion.get("body", ""),
            "html_url": raw_discussion.get("url", ""),
            "user": _webhook_actor(raw_discussion),
        }
        comments = raw_discussion.get("comments", {}).get("nodes", [])
        sources = [
            item
            for comment in comments
            for item in (comment, *comment.get("replies", {}).get("nodes", []))
        ]
        if _created_at(raw_discussion) >= cutoff:
            sources.append(raw_discussion)
        for raw_source in reversed(sources):
            if handled >= 5 or _created_at(raw_source) < cutoff:
                continue
            comment = None
            if raw_source is not raw_discussion:
                comment = {
                    "node_id": raw_source["id"],
                    "body": raw_source.get("body", ""),
                    "user": _webhook_actor(raw_source),
                }
            result = await _handle_response(
                discussions,
                router,
                {"discussion": discussion, "comment": comment} if comment else {"discussion": discussion},
                bot_username,
            )
            handled += int(result is not None)
    log.info("discussions.mention_poll_done", replies=handled)
    return handled


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
        elif mode == "poll-mentions":
            await _poll_mentions(discussions, router, settings.github.bot_username)
        elif mode == "pulse":
            await _handle_pulse(api, discussions, router, event)
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
    parser.add_argument("mode", choices=("merge", "qna", "respond", "poll-mentions", "pulse"))
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args.mode)))


if __name__ == "__main__":
    main()
