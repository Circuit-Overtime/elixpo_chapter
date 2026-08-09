"""Shared follow-up memory and Steward reconciliation tests."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from agents.steward.celebrate import build_terminal_action, finalize_one
from agents.steward.fix import _apply, _verification_env, build_fix_action
from agents.steward.intake import IntakeRejected, seed_issue
from agents.steward.poll import _subject_identity, reconcile
from agents.steward.remember import register_submission
from agents.steward.respond import authored_by_bot, contains_mention, marker
from lib.github.gists import FollowupGist
from lib.state.followups import FollowupMemory, FollowupRecord, bounded_ttl_days
from lib.state.ledger import Ledger, PRRecord
from lib.state.store import StateStore


def _response(content: str):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


class FakeRouter:
    def __init__(self, *contents):
        self.responses = list(contents)
        self.roles = []

    async def call(self, role, messages, **kwargs):
        self.roles.append(role)
        content = self.responses.pop(0)
        if role != "steward":
            return _response(str(content))
        decision = content if isinstance(content, dict) else {"body": str(content), "action": "reply_only"}
        call = SimpleNamespace(function=SimpleNamespace(arguments=json.dumps(decision)))
        message = SimpleNamespace(content=None, tool_calls=[call])
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


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


def test_workflows_wire_turn_headroom_and_discussion_mentions():
    agent_workflow = Path(".github/workflows/elixpo-agent.yml").read_text(encoding="utf-8")
    discussion_workflow = Path(".github/workflows/discussions.yml").read_text(encoding="utf-8")
    steward_workflow = Path(".github/workflows/steward.yml").read_text(encoding="utf-8")
    intake_workflow = Path(".github/workflows/steward-intake.yml").read_text(encoding="utf-8")

    assert "ELIXPO_AGENT_MAX_TURNS || 64" in agent_workflow
    assert "discussion_comment:" in discussion_workflow
    assert "python -m agents.discussions respond" in discussion_workflow
    assert 'cron: "*/10 * * * *"' in steward_workflow
    assert "types: [steward_issue_intake]" in intake_workflow
    assert "python -m agents.steward.intake" in intake_workflow
    fix_workflow = Path(".github/workflows/steward-fix.yml").read_text(encoding="utf-8")
    terminal_workflow = Path(".github/workflows/steward-terminal.yml").read_text(encoding="utf-8")
    assert "types: [steward_fix]" in fix_workflow
    assert "python -m agents.steward.fix" in fix_workflow
    assert "types: [steward_terminal]" in terminal_workflow
    assert "python -m agents.steward.celebrate" in terminal_workflow


def test_mention_intake_seeds_only_an_available_vet_slot(tmp_path):
    from lib.state.store import StateStore

    store = StateStore(tmp_path)
    receipt = seed_issue(store, "https://github.com/o/r/issues/8", 91)

    assert receipt["status"] == "pending_vet"
    assert receipt["source"] == "steward_mention"
    assert store.read_json("pick.json")["source_comment_id"] == 91

    store.write_json(
        "pick.json",
        {"status": "pending_vet", "url": "https://github.com/another/repo/issues/3"},
    )
    with pytest.raises(IntakeRejected, match="another issue"):
        seed_issue(store, "https://github.com/o/r/issues/8", 92)


class FollowupAPI:
    def __init__(self, *, merged=False, changes_requested=False, failing=False):
        self.merged = merged
        self.changes_requested = changes_requested
        self.failing = failing
        self.posts = []
        self.dispatches = []
        self.comment = {
            "id": 91,
            "body": "@elixpoo can you check the requested adjustment?",
            "created_at": "2026-08-04T00:00:00Z",
            "user": {"login": "maintainer"},
        }

    async def _request(self, method, path, **kwargs):
        if method == "GET" and path == "/notifications":
            return []
        if method == "POST" and path.endswith("/dispatches"):
            self.dispatches.append((path, kwargs["json"]))
            return None
        raise AssertionError((method, path, kwargs))

    async def get_pull(self, owner, repo, number):
        assert (owner, repo, number) == ("elixpo", "project", 12)
        return {
            "title": "Fix the example",
            "body": "Small patch.",
            "state": "closed" if self.merged else "open",
            "merged_at": "2026-08-04T01:00:00Z" if self.merged else None,
            "closed_at": "2026-08-04T01:00:00Z" if self.merged else None,
            "head": {"sha": "abc123"},
        }

    async def get_issue(self, owner, repo, number):
        return {
            "id": number,
            "title": "Fix the example",
            "body": "Small patch.",
            "state": "open",
            "html_url": f"https://github.com/{owner}/{repo}/issues/{number}",
        }

    async def get_issue_comments(self, owner, repo, number):
        return [] if self.merged else [self.comment]

    async def get_pull_comments(self, owner, repo, number):
        return []

    async def get_pull_reviews(self, owner, repo, number):
        if not self.changes_requested:
            return []
        return [
            {
                "id": 41,
                "state": "CHANGES_REQUESTED",
                "submitted_at": "2026-08-04T00:10:00Z",
                "body": "Use the shared color token.",
                "user": {"login": "maintainer"},
            }
        ]

    async def get_check_runs(self, owner, repo, ref):
        if not self.failing:
            return []
        return [{"id": 51, "name": "typecheck", "status": "completed", "conclusion": "failure"}]

    async def create_issue_comment(self, owner, repo, number, body):
        self.posts.append(body)
        return {"id": len(self.posts), "body": body}

    async def update_issue_comment(self, owner, repo, comment_id, body):
        self.posts[comment_id - 1] = body
        return {"id": comment_id, "body": body}


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
    router = FakeRouter(
        "SAFE",
        "I’ve recorded the requested adjustment for the repository workflow.",
        "SAFE",
        "SAFE",
    )

    result = await reconcile(api, gist, router, bot_username="elixpoo", ttl_days=360)

    assert result["replies"] == 1
    assert router.roles == ["safety", "steward", "safety", "safety"]
    assert marker("progress", 91) in api.posts[0]
    assert "[x] Response prepared" in api.posts[0]
    assert marker("reply", 91) in api.posts[1]
    assert gist.memory.active["elixpo/project#12"].handled_comment_ids == [91]
    assert gist.saves == 1


@pytest.mark.asyncio
async def test_reconcile_dispatches_merged_pr_for_terminal_reconciliation_without_model_calls():
    api = FollowupAPI(merged=True)
    gist = MemoryGist(_tracked_memory())
    router = FakeRouter()

    result = await reconcile(
        api,
        gist,
        router,
        bot_username="elixpoo",
        ttl_days=360,
        control_repo="elixpoo/agent.elixpo",
    )

    assert result["completed"] == 1
    record = gist.memory.active["elixpo/project#12"]
    assert record.pending_action["kind"] == "terminal"
    assert record.pending_action["outcome"] == "merged"
    assert api.dispatches[0][1]["event_type"] == "steward_terminal"
    assert router.roles == []


@pytest.mark.asyncio
async def test_reconcile_dispatches_one_changes_requested_fingerprint():
    api = FollowupAPI(changes_requested=True)
    gist = MemoryGist(_tracked_memory())
    router = FakeRouter(
        "SAFE",
        "I’ve recorded the requested adjustment.",
        "SAFE",
        "SAFE",
    )

    result = await reconcile(
        api,
        gist,
        router,
        bot_username="elixpoo",
        ttl_days=360,
        control_repo="elixpoo/agent.elixpo",
    )

    record = gist.memory.active["elixpo/project#12"]
    assert result["fixes"] == 1
    assert record.status == "changes_requested"
    assert record.pending_action["kind"] == "fix"
    assert api.dispatches[0][1]["event_type"] == "steward_fix"


def test_fix_fingerprint_uses_latest_reviewer_state_and_current_checks():
    pull = {"head": {"sha": "head-1"}}
    reviews = [
        {
            "id": 1,
            "state": "CHANGES_REQUESTED",
            "submitted_at": "2026-08-04T00:00:00Z",
            "user": {"login": "maintainer"},
        },
        {
            "id": 2,
            "state": "APPROVED",
            "submitted_at": "2026-08-04T01:00:00Z",
            "user": {"login": "maintainer"},
        },
    ]
    checks = [
        {"id": 6, "name": "lint", "status": "completed", "conclusion": "failure"},
        {"id": 7, "name": "typecheck", "status": "completed", "conclusion": "failure"},
        {"id": 8, "name": "lint", "status": "completed", "conclusion": "success"},
    ]

    action = build_fix_action(pull, reviews, checks)

    assert action is not None
    assert action["review_ids"] == []
    assert action["check_ids"] == [7]
    assert build_fix_action(pull, reviews, []) is None
    assert build_fix_action({"head": {"sha": "head-2"}}, reviews, checks)["fingerprint"] != action["fingerprint"]


def test_followup_edit_is_confined_and_verification_env_has_no_secrets(tmp_path, monkeypatch):
    source = tmp_path / "app.ts"
    source.write_text("const color = 'blue';\n")
    implementation = SimpleNamespace(
        edits=[
            SimpleNamespace(
                path="app.ts",
                replacements=[SimpleNamespace(old="'blue'", new="'red'")],
            )
        ]
    )
    monkeypatch.setenv("AGENT_GITHUB_SOLVER_TOKEN", "secret")
    monkeypatch.setenv("ELIXPO_POLLINATIONS_API_KEY", "secret")

    changed = _apply(tmp_path, implementation, {"app.ts"})
    env = _verification_env()

    assert changed == ["app.ts"]
    assert "'red'" in source.read_text()
    assert "AGENT_GITHUB_SOLVER_TOKEN" not in env
    assert "ELIXPO_POLLINATIONS_API_KEY" not in env


@pytest.mark.asyncio
async def test_terminal_reconciliation_updates_issue_ledger_and_completes_memory(tmp_path):
    now = datetime(2026, 8, 4, tzinfo=timezone.utc)
    record = FollowupRecord.create(
        repository="elixpo/project",
        subject_number=12,
        subject_url="https://github.com/elixpo/project/pull/12",
        issue_url="https://github.com/elixpo/project/issues/9",
        now=now,
    )
    pull = {
        "state": "closed",
        "merged_at": "2026-08-04T01:00:00Z",
        "closed_at": "2026-08-04T01:00:00Z",
        "head": {"sha": "abc123"},
    }
    action = build_terminal_action(pull)
    record.queue_action(action, now=now)
    gist = MemoryGist(FollowupMemory(active={record.key: record}))
    store = StateStore(tmp_path)
    Ledger(prs={"elixpo/project#9": PRRecord(status="awaiting_review")}).save(store)

    class API:
        async def get_pull(self, owner, repo, number):
            return pull

        async def create_issue_comment(self, owner, repo, number, body):
            raise AssertionError("celebration is disabled")

    result = await finalize_one(
        API(),
        gist,
        FakeRouter(),
        store,
        key=record.key,
        fingerprint=action["fingerprint"],
    )

    assert result["outcome"] == "merged"
    assert Ledger.load(store).prs["elixpo/project#9"].status == "merged"
    assert record.key not in gist.memory.active
    assert gist.memory.completed[-1].outcome == "merged"


@pytest.mark.asyncio
async def test_reconcile_dispatches_explicit_new_issue_work():
    api = FollowupAPI()
    record = FollowupRecord.create(
        repository="elixpo/project",
        subject_kind="issue",
        subject_number=12,
        subject_url="https://github.com/elixpo/project/issues/12",
        ttl_days=360,
    )
    gist = MemoryGist(FollowupMemory(active={record.key: record}))
    router = FakeRouter(
        "SAFE",
        {"body": "I’ve queued this for the repository workflow.", "action": "repository_work"},
        "SAFE",
        "SAFE",
    )

    result = await reconcile(
        api,
        gist,
        router,
        bot_username="elixpoo",
        ttl_days=360,
        control_repo="elixpoo/agent.elixpo",
    )

    assert result["dispatched"] == 1
    assert api.dispatches[0][0] == "/repos/elixpoo/agent.elixpo/dispatches"
    assert api.dispatches[0][1]["event_type"] == "steward_issue_intake"
    assert gist.memory.active[record.key].status == "intake_dispatched"
