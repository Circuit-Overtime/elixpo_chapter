"""Vet squad tests: hard gates, compact RTK call, and revision-aware memory."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from agents.vet.core import vet_issue
from agents.vet.github import parse_issue_url, referenced_pull_requests
from lib.github.issue_signals import maintainer_says_resolved
from lib.state.rejections import RejectionLedger
from lib.state.store import StateStore
from rtk.models import ChatCompletionResponse, Choice, FunctionCall, Message, ToolCall, Usage

NOW = datetime(2026, 8, 3, tzinfo=timezone.utc)


def _evidence(**changes):
    evidence = {
        "issue": {
            "number": 365,
            "title": "Bounded parser fix",
            "body": "Reproduce with the supplied sample. Expected: parse one field without truncation.",
            "html_url": "https://github.com/horsicq/Detect-It-Easy/issues/365",
            "state": "open",
            "locked": False,
            "assignees": [],
            "labels": [{"name": "bug"}],
            "updated_at": "2026-08-01T00:00:00Z",
        },
        "comments": [],
        "timeline": [],
        "sub_issues": [],
        "parent": None,
        "pull_requests": [],
    }
    evidence.update(changes)
    return evidence


class FakeRouter:
    def __init__(self, verdict):
        self.verdict = verdict
        self.calls = 0
        self.kwargs = {}

    async def call(self, role, messages, **kwargs):
        self.calls += 1
        self.kwargs = kwargs
        return ChatCompletionResponse(
            id="vet",
            choices=[
                Choice(
                    index=0,
                    message=Message(
                        role="assistant",
                        tool_calls=[
                            ToolCall(
                                id="call",
                                function=FunctionCall(
                                    name="record_vet_verdict",
                                    arguments=json.dumps(self.verdict),
                                ),
                            )
                        ],
                    ),
                )
            ],
            usage=Usage(total_tokens=100),
        )


def _approved(**changes):
    verdict = {
        "suitable": True,
        "issue_kind": "standalone",
        "scope": "small",
        "estimated_files": 2,
        "confidence": 0.9,
        "requirements_clear": True,
        "verification_clear": True,
        "conversation_resolved": True,
        "needs_maintainer_decision": False,
        "already_resolved": False,
        "reasons": [],
        "summary": "localized parser correction with a direct regression test",
    }
    verdict.update(changes)
    return verdict


def test_parse_issue_url_is_strict():
    assert parse_issue_url("https://github.com/o/r/issues/12") == ("o", "r", 12)
    with pytest.raises(ValueError):
        parse_issue_url("https://example.com/o/r/issues/12")


def test_pr_references_are_exact_and_deduplicated():
    evidence = _evidence(
        pull_requests=[
            {"number": 8, "title": "Fix #365", "body": "", "html_url": "https://github.com/o/r/pull/8"},
            {"number": 9, "title": "365 bytes", "body": "", "html_url": "https://github.com/o/r/pull/9"},
        ]
    )
    assert [pull["number"] for pull in referenced_pull_requests(evidence, 365)] == [8]


def test_later_maintainer_reopen_cancels_resolution_signal():
    comments = [
        {
            "created_at": "2026-07-08T00:00:00Z",
            "author_association": "COLLABORATOR",
            "body": "This was fixed from our side.",
        },
        {
            "created_at": "2026-07-09T00:00:00Z",
            "author_association": "MEMBER",
            "body": "Reopened: it is still broken on the main branch.",
        },
    ]
    assert maintainer_says_resolved(comments) is False


@pytest.mark.asyncio
async def test_tracking_issue_rejected_without_model_and_cached(tmp_path):
    store = StateStore(tmp_path)
    router = FakeRouter(_approved())
    evidence = _evidence(sub_issues=[{"number": 366, "title": "child", "state": "open"}])

    first = await vet_issue(router, store, "horsicq", "Detect-It-Easy", 365, evidence, now=NOW)
    assert first["suitable"] is False
    assert first["model_called"] is False
    assert "tracking parent" in " ".join(first["reasons"])
    assert router.calls == 0
    assert "horsicq/Detect-It-Easy#365" in RejectionLedger.load(store).issues

    second = await vet_issue(router, store, "horsicq", "Detect-It-Easy", 365, evidence, now=NOW)
    assert second["status"] == "cached_rejection"
    assert router.calls == 0


@pytest.mark.asyncio
async def test_issue_365_maintainer_resolution_is_zero_token_rejection(tmp_path):
    store = StateStore(tmp_path)
    router = FakeRouter(_approved())
    comments = [
        {
            "created_at": "2026-07-08T16:31:02Z",
            "author_association": "COLLABORATOR",
            "user": {"login": "BJNFNE"},
            "body": "If i remember correctly this was fixed from our side, the chocolatey package has to be updated",
        }
    ]
    result = await vet_issue(
        router,
        store,
        "horsicq",
        "Detect-It-Easy",
        365,
        _evidence(comments=comments),
        now=NOW,
        force=True,
    )
    assert result["status"] == "rejected"
    assert result["model_called"] is False
    assert "already resolved upstream" in " ".join(result["reasons"])
    assert router.calls == 0
    assert "horsicq/Detect-It-Easy#365" in RejectionLedger.load(store).issues


@pytest.mark.asyncio
async def test_sub_issue_can_pass_one_low_cost_structured_call(tmp_path):
    store = StateStore(tmp_path)
    router = FakeRouter(_approved(issue_kind="sub_issue"))
    evidence = _evidence(parent={"number": 300, "title": "tracking parent"})

    result = await vet_issue(router, store, "horsicq", "Detect-It-Easy", 365, evidence, now=NOW)
    assert result["status"] == "approved"
    assert result["issue_kind"] == "sub_issue"
    assert result["model_called"] is True
    assert router.calls == 1
    assert router.kwargs["effort"] == "low"
    assert router.kwargs["max_tokens"] == 450
    assert not RejectionLedger.load(store).issues


@pytest.mark.asyncio
async def test_new_issue_revision_is_reconsidered(tmp_path):
    store = StateStore(tmp_path)
    ledger = RejectionLedger()
    ledger.reject(
        "horsicq/Detect-It-Easy#365",
        url="https://github.com/horsicq/Detect-It-Easy/issues/365",
        title="old",
        issue_updated_at="2026-07-01T00:00:00Z",
        reasons=["unclear"],
        issue_kind="standalone",
        confidence=0.5,
        now=NOW,
    )
    ledger.save(store)
    router = FakeRouter(_approved())
    result = await vet_issue(router, store, "horsicq", "Detect-It-Easy", 365, _evidence(), now=NOW)
    assert result["status"] == "approved"
    assert router.calls == 1
