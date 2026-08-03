"""Triage tests — deterministic signals + orchestration with fake API/router."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from agents.triage.signals import deterministic_signals, merge_signals
from rtk.models import ChatCompletionResponse, Choice, Message, Usage

NOW = datetime(2026, 6, 20, tzinfo=timezone.utc)


def _issue(number=1, **kw):
    base = {
        "number": number,
        "title": f"issue {number}",
        "html_url": f"https://github.com/o/r/issues/{number}",
        "body": "Steps to reproduce: ...",
        "labels": [{"name": "good first issue"}],
        "assignees": [],
        "author_association": "NONE",
        "created_at": "2026-01-01T00:00:00Z",
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


def test_deterministic_maintainer_and_assignee():
    d = deterministic_signals(_issue(author_association="MEMBER", assignees=[{"login": "x"}]), NOW)
    assert d["op_is_core_maintainer"] is True
    assert d["no_assignee"] is False


def test_merge_signals_maps_llm_fuzzy():
    det = deterministic_signals(_issue(), NOW)
    sig = merge_signals(det, {"has_acceptance_criterion": True, "maintainer_claimed": True})
    assert sig.has_acceptance_criterion is True
    assert sig.no_maintainer_claim is False


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

    async def call(self, role, messages, **kw):
        self.calls += 1
        content = json.dumps(self._payload)
        return ChatCompletionResponse(
            id="x",
            choices=[Choice(index=0, message=Message(role="assistant", content=content))],
            usage=Usage(total_tokens=50),
        )


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
