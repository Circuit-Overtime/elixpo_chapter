"""Triage tests — deterministic signals + orchestration with fake API/router."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from agents.triage.signals import deterministic_comment_signals, deterministic_signals, merge_signals
from rtk.models import ChatCompletionResponse, Choice, Message, Usage

NOW = datetime(2026, 6, 20, tzinfo=timezone.utc)


def _issue(number=1, **kw):
    base = {
        "number": number,
        "title": f"issue {number}",
        "html_url": f"https://github.com/o/r/issues/{number}",
        "body": "Steps to reproduce: run the command, then observe the documented failure output.",
        "labels": [{"name": "good first issue"}],
        "assignees": [],
        "author_association": "NONE",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-06-01T00:00:00Z",
    }
    base.update(kw)
    return base


# --- deterministic signals ---

def test_deterministic_signals():
    d = deterministic_signals(_issue(), NOW)
    assert d["labels"] == ["good first issue"]
    assert d["no_assignee"] is True
    assert d["older_than_7_days"] is True
    assert d["op_is_core_maintainer"] is False
    assert d["stale_over_365_days"] is False


def test_deterministic_maintainer_and_assignee():
    d = deterministic_signals(_issue(author_association="MEMBER", assignees=[{"login": "x"}]), NOW)
    assert d["op_is_core_maintainer"] is True
    assert d["no_assignee"] is False


def test_merge_signals_maps_llm_fuzzy():
    det = deterministic_signals(_issue(), NOW)
    sig = merge_signals(det, {"has_acceptance_criterion": True, "maintainer_claimed": True})
    assert sig.has_acceptance_criterion is True
    assert sig.no_maintainer_claim is False


def test_merge_signals_rejects_boolean_like_strings():
    det = deterministic_signals(_issue(), NOW)
    sig = merge_signals(
        det,
        {
            "has_acceptance_criterion": "true",
            "someone_claimed_recently": "false",
            "touches_internal_paths": "false",
        },
    )
    assert sig.has_acceptance_criterion is False
    assert sig.someone_claimed_recently is False
    assert sig.touches_internal_paths is False


def test_comment_claims_and_internal_paths_are_deterministic():
    issue = _issue(body="Update the public attribute helper without changing private behavior.")
    comments = [
        {
            "body": "I can try to take a stab at this.",
            "created_at": "2023-10-14T22:06:02Z",
            "author_association": "NONE",
        },
        {
            "body": "I am working on this now.",
            "created_at": "2026-06-15T00:00:00Z",
            "author_association": "NONE",
        },
    ]
    signals = deterministic_comment_signals(issue, comments, NOW)
    assert signals == {
        "someone_claimed_recently": True,
        "maintainer_claimed": False,
        "touches_internal_paths": False,
    }

    signals = deterministic_comment_signals(
        _issue(body="Change src/internal/attributes.py to normalize keys."),
        [],
        NOW,
    )
    assert signals["touches_internal_paths"] is True


def test_old_claim_is_not_recent_and_old_issue_is_stale():
    issue = _issue(
        body="Lowercase the attribute name before reading the public attributes object.",
        updated_at="2023-12-22T01:33:05Z",
    )
    comments = [
        {
            "body": "I can try to take a stab at this.",
            "created_at": "2023-10-14T22:06:02Z",
            "author_association": "NONE",
        }
    ]
    assert deterministic_signals(issue, NOW)["stale_over_365_days"] is True
    comment_signals = deterministic_comment_signals(issue, comments, NOW)
    assert comment_signals["someone_claimed_recently"] is False
    assert comment_signals["touches_internal_paths"] is False


def test_recent_unclaim_cancels_same_users_claim():
    comments = [
        {
            "id": 1,
            "body": "I will handle this.",
            "created_at": "2026-06-12T00:00:00Z",
            "author_association": "NONE",
            "user": {"login": "contributor"},
        },
        {
            "id": 2,
            "body": "I am no longer working on this.",
            "created_at": "2026-06-18T00:00:00Z",
            "author_association": "NONE",
            "user": {"login": "contributor"},
        },
    ]
    signals = deterministic_comment_signals(_issue(), comments, NOW)
    assert signals["someone_claimed_recently"] is False


# --- orchestration ---

class FakeAPI:
    def __init__(self, issues, comments=None):
        self.issues = issues
        self.comments = comments or []

    async def _request(self, method, path, **kwargs):
        if path.endswith("/comments"):
            return self.comments
        if path.endswith("/issues"):
            return self.issues
        raise AssertionError(f"unexpected {path}")


class FakeRouter:
    def __init__(self, payload):
        self._payload = payload
        self.calls = 0
        self.last_messages = []
        self.last_kwargs = {}

    async def call(self, role, messages, **kw):
        self.calls += 1
        self.last_messages = messages
        self.last_kwargs = kw
        content = json.dumps(self._payload)
        return ChatCompletionResponse(
            id="x",
            choices=[Choice(index=0, message=Message(role="assistant", content=content))],
            usage=Usage(total_tokens=50),
        )


@pytest.mark.asyncio
async def test_extraction_uses_recent_dated_comments_and_marks_them_untrusted():
    from agents.triage.extract import extract_issue_signals

    router = FakeRouter({"tractable": False, "rationale": "claimed"})
    comments = [
        {
            "created_at": f"2026-06-{day:02d}T00:00:00Z",
            "body": f"comment-{day}",
            "user": {"login": "person"},
            "author_association": "NONE",
        }
        for day in range(1, 26)
    ]
    await extract_issue_signals(router, _issue(), comments, NOW)
    system = router.last_messages[0].content
    prompt = router.last_messages[1].content
    assert "untrusted evidence" in system
    assert "TRIAGE_TIME: 2026-06-20" in prompt
    assert "comment-25" in prompt
    assert "comment-1\n" not in prompt
    assert router.last_kwargs["effort"] == "low"
    assert router.last_kwargs["max_tokens"] == 500


@pytest.mark.asyncio
async def test_triage_candidates_scores_and_ranks():
    from agents.triage.__main__ import triage_candidates

    api = FakeAPI([_issue(1), _issue(2)])
    router = FakeRouter(
        {
            "has_acceptance_criterion": True,
            "tractable": True,
            "complexity": "small",
            "estimated_files": 3,
            "confidence": 0.9,
            "needs_maintainer_decision": False,
            "needs_external_access": False,
            "needs_specialized_hardware": False,
            "rationale": "clear scope",
        }
    )
    out = await triage_candidates(api, router, [{"full_name": "o/r"}], NOW)

    assert len(out) == 2
    assert router.calls == 2               # one LLM call per shortlisted issue
    assert all(t.score >= 8 for t in out)  # good-first + no-assignee + accept + aged
    assert all(t.tractable for t in out)
    assert all(t.easy for t in out)
    assert all(t.estimated_files == 3 for t in out)
    assert out[0].rationale == "clear scope"


@pytest.mark.asyncio
async def test_triage_handles_bad_llm_json():
    from agents.triage.__main__ import triage_candidates

    api = FakeAPI([_issue(1)])

    class BadRouter:
        calls = 0

        async def call(self, role, messages, **kw):
            return ChatCompletionResponse(
                id="x",
                choices=[Choice(index=0, message=Message(role="assistant", content="not json"))],
                usage=Usage(),
            )

    out = await triage_candidates(api, BadRouter(), [{"full_name": "o/r"}], NOW)
    assert len(out) == 1
    assert out[0].tractable is False       # missing → safe default, still scored
    assert out[0].easy is False
    assert out[0].blockers


@pytest.mark.asyncio
async def test_triage_rejects_ambiguous_or_privileged_work():
    from agents.triage.__main__ import triage_candidates

    router = FakeRouter(
        {
            "has_acceptance_criterion": True,
            "tractable": True,
            "complexity": "unknown",
            "estimated_files": 0,
            "confidence": 0.4,
            "needs_maintainer_decision": True,
            "needs_external_access": True,
            "needs_specialized_hardware": False,
            "rationale": "requirements and access are unresolved",
        }
    )
    out = await triage_candidates(FakeAPI([_issue(3)]), router, [{"full_name": "o/r"}], NOW)
    assert out[0].easy is False
    assert "needs a maintainer decision" in out[0].blockers
    assert "needs external access or credentials" in out[0].blockers


@pytest.mark.asyncio
async def test_triage_prefilter_avoids_spending_on_obvious_non_candidates():
    from agents.triage.__main__ import triage_candidates

    router = FakeRouter({})
    issues = [
        _issue(1, assignees=[{"login": "claimed"}]),
        _issue(2, labels=[{"name": "needs-design"}]),
        _issue(3, body="too short"),
        _issue(4, locked=True),
        _issue(5, updated_at="2024-01-01T00:00:00Z"),
    ]
    out = await triage_candidates(FakeAPI(issues), router, [{"full_name": "o/r"}], NOW)
    assert out == []
    assert router.calls == 0
