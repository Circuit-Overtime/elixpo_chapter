"""Vet squad tests: hard gates, compact RTK call, and revision-aware memory."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from agents.vet.__main__ import _finalize_pick, _resolve_target, _result_exit_code
from agents.vet.core import vet_issue
from lib.github.issues import parse_issue_url, referenced_pull_requests
from lib.state.ledger import Ledger
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
        "estimated_minutes": 10,
        "estimated_solve_tokens": 200_000,
        "confidence": 0.9,
        "requirements_clear": True,
        "verification_clear": True,
        "conversation_resolved": True,
        "needs_maintainer_decision": False,
        "already_resolved": False,
        "already_claimed": False,
        "reasons": [],
        "summary": "localized parser correction with a direct regression test",
    }
    verdict.update(changes)
    return verdict


def test_parse_issue_url_is_strict():
    assert parse_issue_url("https://github.com/o/r/issues/12") == ("o", "r", 12)
    with pytest.raises(ValueError):
        parse_issue_url("https://example.com/o/r/issues/12")


def test_automatic_target_requires_pending_pick(tmp_path):
    store = StateStore(tmp_path)
    with pytest.raises(ValueError):
        _resolve_target(store, None)

    url = "https://github.com/o/r/issues/12"
    store.write_json("pick.json", {"status": "pending_vet", "url": url})
    assert _resolve_target(store, None) == (url, True)
    assert _resolve_target(store, "https://github.com/x/y/issues/9") == (
        "https://github.com/x/y/issues/9",
        False,
    )


def test_terminal_pipeline_can_require_an_approved_vet_result():
    assert _result_exit_code({"suitable": True}, require_suitable=True) == 0
    assert _result_exit_code({"suitable": False}, require_suitable=True) == 3
    assert _result_exit_code({"suitable": False}, require_suitable=False) == 0


def test_vet_approval_is_the_only_point_that_claims_pick(tmp_path):
    store = StateStore(tmp_path)
    url = "https://github.com/o/r/issues/12"
    store.write_json(
        "pick.json",
        {"status": "pending_vet", "picked": True, "url": url, "repo": "o/r", "number": 12},
    )
    _finalize_pick(
        store,
        {"suitable": True, "key": "o/r#12", "url": url, "reasons": []},
        NOW,
    )
    assert store.read_json("pick.json")["status"] == "picked"
    ledger = Ledger.load(store)
    assert ledger.prs["o/r#12"].status == "claimed"
    assert ledger.count_today(NOW.date().isoformat()) == 1


def test_vet_rejection_does_not_consume_ledger_and_mismatch_fails(tmp_path):
    store = StateStore(tmp_path)
    url = "https://github.com/o/r/issues/12"
    store.write_json("pick.json", {"status": "pending_vet", "url": url})
    with pytest.raises(RuntimeError):
        _finalize_pick(
            store,
            {"suitable": True, "key": "x/y#9", "url": "https://github.com/x/y/issues/9"},
            NOW,
        )

    _finalize_pick(
        store,
        {"suitable": False, "key": "o/r#12", "url": url, "reasons": ["scope unclear"]},
        NOW,
    )
    assert store.read_json("pick.json")["status"] == "rejected"
    assert not Ledger.load(store).prs


def test_pr_references_are_exact_and_deduplicated():
    evidence = _evidence(
        pull_requests=[
            {"number": 8, "title": "Fix #365", "body": "", "html_url": "https://github.com/o/r/pull/8"},
            {"number": 9, "title": "365 bytes", "body": "", "html_url": "https://github.com/o/r/pull/9"},
        ]
    )
    assert [pull["number"] for pull in referenced_pull_requests(evidence, 365)] == [8]


def test_closed_unmerged_pr_does_not_block_a_fresh_attempt():
    evidence = _evidence(
        pull_requests=[
            {
                "number": 19,
                "state": "closed",
                "title": "Fixes #18",
                "body": "Fixes #18",
                "html_url": "https://github.com/o/r/pull/19",
                "pull_request": {"merged_at": None},
            },
            {
                "number": 20,
                "state": "closed",
                "title": "Fixes #18",
                "body": "Fixes #18",
                "html_url": "https://github.com/o/r/pull/20",
                "pull_request": {"merged_at": "2026-08-09T00:00:00Z"},
            },
        ]
    )

    assert [pull["number"] for pull in referenced_pull_requests(evidence, 18)] == [20]


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
async def test_issue_365_resolution_is_a_model_judgment(tmp_path):
    store = StateStore(tmp_path)
    router = FakeRouter(
        _approved(
            suitable=False,
            already_resolved=True,
            reasons=["repository-side fix already exists; only packaging remains"],
        )
    )
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
    assert result["model_called"] is True
    assert "already resolved" in " ".join(result["reasons"])
    assert router.calls == 1
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
    assert router.kwargs["max_tokens"] == 500
    assert result["solve_token_budget"] == 250_000
    assert not RejectionLedger.load(store).issues


@pytest.mark.asyncio
async def test_vet_rejects_work_over_fifteen_minutes(tmp_path):
    store = StateStore(tmp_path)
    router = FakeRouter(_approved(estimated_minutes=16))
    result = await vet_issue(router, store, "o", "r", 365, _evidence(), now=NOW)
    assert result["suitable"] is False
    assert "16 minutes" in " ".join(result["reasons"])


@pytest.mark.asyncio
async def test_vet_rejects_multi_million_token_work(tmp_path):
    store = StateStore(tmp_path)
    router = FakeRouter(_approved(estimated_solve_tokens=2_000_000))
    result = await vet_issue(router, store, "o", "r", 365, _evidence(), now=NOW)
    assert result["suitable"] is False
    assert "2000000 tokens" in " ".join(result["reasons"])
    assert result["solve_token_budget"] == 0


@pytest.mark.asyncio
async def test_owned_test_mode_only_relaxes_assignment(tmp_path):
    store = StateStore(tmp_path)
    evidence = _evidence()
    evidence["issue"]["assignees"] = [{"login": "owner"}]

    blocked_router = FakeRouter(_approved())
    blocked = await vet_issue(blocked_router, store, "o", "r", 365, evidence, now=NOW, force=True)
    assert blocked["suitable"] is False
    assert blocked_router.calls == 0

    test_router = FakeRouter(_approved())
    allowed = await vet_issue(
        test_router,
        store,
        "o",
        "r",
        365,
        evidence,
        now=NOW,
        force=True,
        owned_test=True,
    )
    assert allowed["suitable"] is True
    assert allowed["test_mode"] is True
    assert test_router.calls == 1


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
