"""Shared follow-up memory and Steward reconciliation tests."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from agents.steward.poll import _subject_identity, reconcile
from agents.steward.remember import register_submission
from agents.steward.respond import authored_by_bot, contains_mention, marker
from lib.github.gists import FollowupGist
from lib.state.followups import FollowupMemory, FollowupRecord, bounded_ttl_days


def _response(content: str):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


class FakeRouter:
    def __init__(self, *contents: str):
        self.responses = [_response(content) for content in contents]
        self.roles = []

    async def call(self, role, messages, **kwargs):
        self.roles.append(role)
        return self.responses.pop(0)


class MemoryGist:
    def __init__(self, memory: FollowupMemory | None = None):
        self.memory = memory or FollowupMemory()
        self.saves = 0

    async def load(self):
        return self.memory

    async def save(self, memory):
        self.memory = memory
        self.saves += 1


def test_followup_memory_bounds_ttl_and_tracks_completion():
    now = datetime(2026, 8, 4, tzinfo=timezone.utc)
    record = FollowupRecord.create(
        repository="elixpo/project",
        subject_number=12,
        subject_url="https://github.com/elixpo/project/pull/12",
        ttl_days=10,
        now=now,
    )
    assert bounded_ttl_days(10) == 60
    assert bounded_ttl_days(999) == 360
    assert datetime.fromisoformat(record.expires_at) == now + timedelta(days=60)

    memory = FollowupMemory()
    memory.upsert(record, now=now)
    completion = memory.complete(record.key, "merged", now=now + timedelta(days=2))

    assert record.key not in memory.active
    assert completion is not None and completion.outcome == "merged"
    assert memory.completed[-1].subject_url.endswith("/pull/12")


def test_followup_memory_prunes_expired_records():
    now = datetime(2026, 8, 4, tzinfo=timezone.utc)
    record = FollowupRecord.create(
        repository="elixpo/project",
        subject_number=4,
        subject_url="https://github.com/elixpo/project/issues/4",
        subject_kind="issue",
        now=now - timedelta(days=61),
        ttl_days=60,
    )
    memory = FollowupMemory(active={record.key: record})

    expired = memory.prune_expired(now=now)

    assert [item.outcome for item in expired] == ["expired"]
    assert memory.active == {}


@pytest.mark.asyncio
async def test_gist_store_reads_and_writes_one_json_file():
    memory = FollowupMemory(updated_at="2026-08-04T00:00:00+00:00")

    class API:
        def __init__(self):
            self.patch = None

        async def _request(self, method, path, **kwargs):
            if method == "GET":
                return {
                    "files": {
                        "elixpoo-followups.json": {
                            "content": json.dumps(memory.model_dump(mode="json")),
                            "truncated": False,
                        }
                    }
                }
            self.patch = (path, kwargs["json"])

    api = API()
    gist = FollowupGist(api, "gist-id")
    loaded = await gist.load()
    await gist.save(loaded)

    assert loaded.updated_at == memory.updated_at
    assert api.patch[0] == "/gists/gist-id"
    assert "elixpoo-followups.json" in api.patch[1]["files"]


@pytest.mark.asyncio
async def test_register_submission_is_idempotent_and_grounded_in_state():
    gist = MemoryGist()
    submit = {
        "status": "submitted",
        "pr_url": "https://github.com/elixpo/project/pull/12",
        "pr_number": 12,
        "issue_url": "https://github.com/elixpo/project/issues/9",
        "branch": "patch/example-9-a1b2",
    }
    solve = {
        "upstream_repo": "elixpo/project",
        "fork_repo": "elixpoo/project",
        "title": "Fix the example",
    }

    first = await register_submission(gist, submit, solve, ttl_days=360)
    second = await register_submission(gist, submit, solve, ttl_days=360)

    assert first.key == "elixpo/project#12"
    assert second.key == first.key
    assert len(gist.memory.active) == 1
    assert gist.saves == 2


def test_mentions_and_notification_urls_are_exact():
    assert contains_mention("Could @elixpoo check this?")
    assert not contains_mention("email@elixpoo.dev")
    assert not contains_mention("@elixpoooo")
    assert authored_by_bot("elixpoo[bot]")
    assert _subject_identity("https://api.github.com/repos/o/r/pulls/7") == ("o", "r", "pull_request", 7)
    assert _subject_identity("https://api.github.com/repos/o/r/issues/8") == ("o", "r", "issue", 8)


class FollowupAPI:
    def __init__(self, *, merged=False):
        self.merged = merged
        self.posts = []
        self.comment = {
            "id": 91,
            "body": "@elixpoo can you check the requested adjustment?",
            "created_at": "2026-08-04T00:00:00Z",
            "user": {"login": "maintainer"},
        }

    async def _request(self, method, path, **kwargs):
        if method == "GET" and path == "/notifications":
            return []
        raise AssertionError((method, path, kwargs))

    async def get_pull(self, owner, repo, number):
        assert (owner, repo, number) == ("elixpo", "project", 12)
        return {
            "title": "Fix the example",
            "body": "Small patch.",
            "state": "closed" if self.merged else "open",
            "merged_at": "2026-08-04T01:00:00Z" if self.merged else None,
        }

    async def get_issue_comments(self, owner, repo, number):
        return [] if self.merged else [self.comment]

    async def get_pull_comments(self, owner, repo, number):
        return []

    async def create_issue_comment(self, owner, repo, number, body):
        self.posts.append(body)
        return {"id": len(self.posts), "body": body}


def _tracked_memory():
    record = FollowupRecord.create(
        repository="elixpo/project",
        subject_number=12,
        subject_url="https://github.com/elixpo/project/pull/12",
        ttl_days=360,
    )
    return FollowupMemory(active={record.key: record})


@pytest.mark.asyncio
async def test_reconcile_posts_progress_then_safe_reply_and_marks_source_handled():
    api = FollowupAPI()
    gist = MemoryGist(_tracked_memory())
    router = FakeRouter("SAFE", "I’ve recorded the requested adjustment for the repository workflow.", "SAFE")

    result = await reconcile(api, gist, router, bot_username="elixpoo", ttl_days=360)

    assert result["replies"] == 1
    assert router.roles == ["safety", "steward", "safety"]
    assert marker("progress", 91) in api.posts[0]
    assert marker("reply", 91) in api.posts[1]
    assert gist.memory.active["elixpo/project#12"].handled_comment_ids == [91]
    assert gist.saves == 1


@pytest.mark.asyncio
async def test_reconcile_removes_merged_pr_without_model_calls():
    api = FollowupAPI(merged=True)
    gist = MemoryGist(_tracked_memory())
    router = FakeRouter()

    result = await reconcile(api, gist, router, bot_username="elixpoo", ttl_days=360)

    assert result["completed"] == 1
    assert gist.memory.active == {}
    assert gist.memory.completed[-1].outcome == "merged"
    assert router.roles == []
