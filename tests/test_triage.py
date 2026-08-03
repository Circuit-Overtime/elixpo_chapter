"""Triage tests — deterministic signals + orchestration with fake API/router."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from agents.triage.signals import (
    deterministic_comment_signals,
    deterministic_signals,
    linked_pull_requests,
    merge_signals,
    pull_request_issue_references,
)
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
        "created_at": "2026-06-03T00:00:00Z",
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
    assert d["issue_age_days"] == 17
    assert d["within_target_age_window"] is True
    assert d["activity_age_days"] == 19
    assert d["recently_active"] is True
    assert d["op_is_core_maintainer"] is False
    assert d["stale_over_365_days"] is False


@pytest.mark.parametrize(
    ("created_at", "age_days", "eligible"),
    [
        ("2026-06-13T23:59:59Z", 7, True),
        ("2026-04-21T00:00:00Z", 60, True),
        ("2026-06-14T00:00:00Z", 6, False),
        ("2026-04-20T00:00:00Z", 61, False),
        (None, None, False),
    ],
)
def test_issue_age_window_is_inclusive_and_fails_closed(created_at, age_days, eligible):
    d = deterministic_signals(_issue(created_at=created_at), NOW)
    assert d["issue_age_days"] == age_days
    assert d["within_target_age_window"] is eligible


@pytest.mark.parametrize(
    ("updated_at", "activity_age_days", "eligible"),
    [
        ("2026-06-20T00:00:00Z", 0, True),
        ("2026-05-21T00:00:00Z", 30, True),
        ("2026-05-20T00:00:00Z", 31, False),
        (None, None, False),
    ],
)
def test_recent_activity_window_is_inclusive_and_fails_closed(
    updated_at, activity_age_days, eligible
):
    d = deterministic_signals(
        _issue(created_at="2026-05-06T00:00:00Z", updated_at=updated_at), NOW
    )
    assert d["activity_age_days"] == activity_age_days
    assert d["recently_active"] is eligible


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


def test_investigation_intent_counts_as_a_recent_claim():
    comments = [
        {
            "body": "I'd like to investigate this issue and work on a fix.",
            "created_at": "2026-06-18T00:00:00Z",
            "author_association": "NONE",
            "user": {"login": "contributor"},
        }
    ]
    assert deterministic_comment_signals(_issue(), comments, NOW)["someone_claimed_recently"] is True


def test_linked_pull_requests_detects_and_deduplicates_pr_cross_references():
    pr = {
        "event": "cross-referenced",
        "source": {
            "issue": {
                "id": 99,
                "number": 12,
                "state": "closed",
                "html_url": "https://github.com/o/r/pull/12",
                "pull_request": {"merged_at": None},
            }
        },
    }
    regular_issue = {
        "event": "cross-referenced",
        "source": {"issue": {"number": 13, "html_url": "https://github.com/o/r/issues/13"}},
    }
    assert linked_pull_requests([pr, pr, regular_issue]) == [
        {"number": 12, "state": "closed", "url": "https://github.com/o/r/pull/12"}
    ]


def test_pr_search_results_match_exact_issue_references_without_number_noise():
    pulls = [
        {
            "number": 1271,
            "state": "closed",
            "html_url": "https://github.com/o/r/pull/1271",
            "title": "fix auth",
            "body": "Partial fix for #337.",
        },
        {
            "number": 207,
            "state": "closed",
            "html_url": "https://github.com/o/r/pull/207",
            "title": "Reduce install size by 337 MB",
            "body": "No linked issue.",
        },
    ]
    assert pull_request_issue_references(pulls, {337}) == {
        337: [{"number": 1271, "state": "closed", "url": "https://github.com/o/r/pull/1271"}]
    }


# --- orchestration ---

class FakeAPI:
    def __init__(
        self,
        issues,
        comments=None,
        timelines=None,
        timeline_error=False,
        pull_search=None,
        pull_search_error=False,
    ):
        self.issues = issues
        self.comments = comments or []
        self.timelines = timelines or {}
        self.timeline_error = timeline_error
        self.pull_search = pull_search or []
        self.pull_search_error = pull_search_error
        self.issue_params = None

    async def _request(self, method, path, **kwargs):
        if path == "/search/issues":
            if self.pull_search_error:
                raise RuntimeError("pull search unavailable")
            return {"items": self.pull_search}
        if path.endswith("/timeline"):
            if self.timeline_error:
                raise RuntimeError("timeline unavailable")
            number = int(path.split("/")[-2])
            return self.timelines.get(number, [])
        if path.endswith("/comments"):
            return self.comments
        if path.endswith("/issues"):
            self.issue_params = kwargs.get("params", {})
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
    assert "# Triage Solvable Issues" in system
    assert "Classify scope conservatively" in system
    assert "Do not classify work as medium merely because the repository is unfamiliar" in system
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
    assert all(t.issue_age_days == 17 for t in out)
    assert all(t.activity_age_days == 19 for t in out)
    assert all(t.issue_updated_at == "2026-06-01T00:00:00Z" for t in out)
    assert out[0].rationale == "clear scope"
    assert "labels" not in api.issue_params


@pytest.mark.asyncio
async def test_triage_considers_unlabelled_reproducible_bug():
    from agents.triage.__main__ import triage_candidates

    issue = _issue(9, labels=[])
    router = FakeRouter(
        {
            "has_repro_steps": True,
            "has_acceptance_criterion": True,
            "tractable": True,
            "complexity": "small",
            "estimated_files": 2,
            "confidence": 0.9,
            "needs_maintainer_decision": False,
            "needs_external_access": False,
            "needs_specialized_hardware": False,
            "rationale": "localized reproducible bug",
        }
    )
    out = await triage_candidates(FakeAPI([issue]), router, [{"full_name": "o/r"}], NOW)
    assert len(out) == 1
    assert out[0].easy is True
    assert out[0].score >= 8
    assert "good_first/help_wanted" not in out[0].breakdown
    assert out[0].breakdown["reproducible_bug"] == 3


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


@pytest.mark.asyncio
async def test_triage_rejects_issues_outside_age_window_before_model_call():
    from agents.triage.__main__ import triage_candidates

    router = FakeRouter({})
    issues = [
        _issue(1, created_at="2026-06-14T00:00:00Z"),
        _issue(2, created_at="2026-04-20T00:00:00Z"),
        _issue(3, created_at=None),
    ]
    out = await triage_candidates(FakeAPI(issues), router, [{"full_name": "o/r"}], NOW)
    assert out == []
    assert router.calls == 0


@pytest.mark.asyncio
async def test_triage_rejects_inactive_issues_before_model_call():
    from agents.triage.__main__ import triage_candidates

    router = FakeRouter({})
    issues = [
        _issue(1, updated_at="2026-05-20T00:00:00Z"),
        _issue(2, updated_at=None),
    ]
    out = await triage_candidates(FakeAPI(issues), router, [{"full_name": "o/r"}], NOW)
    assert out == []
    assert router.calls == 0


@pytest.mark.asyncio
async def test_triage_skips_unchanged_issue_in_rejection_ledger(tmp_path):
    from agents.triage.__main__ import triage_candidates
    from lib.state.rejections import RejectionLedger

    rejections = RejectionLedger()
    rejections.reject(
        "o/r#1",
        url="https://github.com/o/r/issues/1",
        title="issue 1",
        issue_updated_at="2026-06-01T00:00:00Z",
        reasons=["unresolved tracking work"],
        issue_kind="tracking_issue",
        confidence=0.9,
        now=NOW,
    )
    router = FakeRouter({})
    out = await triage_candidates(
        FakeAPI([_issue(1)]),
        router,
        [{"full_name": "o/r"}],
        NOW,
        rejections=rejections,
    )
    assert out == []
    assert router.calls == 0


def test_triage_remembers_failed_revision_and_clears_approved_one():
    from agents.triage.__main__ import TriagedIssue, remember_triage_verdicts
    from lib.state.rejections import RejectionLedger

    def item(number, easy, blockers):
        return TriagedIssue(
            repo="o/r",
            number=number,
            title=f"issue {number}",
            url=f"https://github.com/o/r/issues/{number}",
            issue_age_days=17,
            activity_age_days=2,
            issue_updated_at="2026-06-18T00:00:00Z",
            score=10,
            easy=easy,
            blockers=blockers,
            confidence=0.8,
        )

    rejections = RejectionLedger()
    rejections.reject(
        "o/r#2",
        url="https://github.com/o/r/issues/2",
        title="old",
        issue_updated_at="2026-06-17T00:00:00Z",
        reasons=["old blocker"],
        issue_kind="unknown",
        confidence=0.5,
        now=NOW,
    )
    remember_triage_verdicts(
        [item(1, False, ["scope is medium"]), item(2, True, [])],
        rejections,
        NOW,
    )
    assert rejections.issues["o/r#1"].reasons == ["scope is medium"]
    assert "o/r#2" not in rejections.issues


@pytest.mark.asyncio
async def test_default_triage_supply_reaches_beyond_first_eight_repositories():
    from agents.triage.__main__ import triage_candidates

    class RepoAwareAPI(FakeAPI):
        async def _request(self, method, path, **kwargs):
            if path.startswith("/repos/") and path.endswith("/issues"):
                repo = path.split("/")[3]
                return [_issue(90)] if repo == "repo-9" else []
            return await super()._request(method, path, **kwargs)

    router = FakeRouter(
        {
            "has_acceptance_criterion": True,
            "has_repro_steps": False,
            "tractable": True,
            "complexity": "small",
            "estimated_files": 2,
            "confidence": 0.9,
            "needs_maintainer_decision": False,
            "needs_external_access": False,
            "needs_specialized_hardware": False,
            "rationale": "bounded change",
        }
    )
    candidates = [{"full_name": f"o/repo-{index}"} for index in range(1, 10)]
    out = await triage_candidates(RepoAwareAPI([]), router, candidates, NOW)
    assert len(out) == 1
    assert out[0].repo == "o/repo-9"
    assert router.calls == 1


@pytest.mark.asyncio
async def test_triage_rejects_linked_pr_before_model_call():
    from agents.triage.__main__ import triage_candidates

    timeline = [
        {
            "event": "cross-referenced",
            "source": {
                "issue": {
                    "number": 42,
                    "state": "open",
                    "html_url": "https://github.com/o/r/pull/42",
                    "pull_request": {"merged_at": None},
                }
            },
        }
    ]
    router = FakeRouter({"tractable": True})
    out = await triage_candidates(
        FakeAPI([_issue(1)], timelines={1: timeline}),
        router,
        [{"full_name": "o/r"}],
        NOW,
    )
    assert out == []
    assert router.calls == 0


@pytest.mark.asyncio
async def test_triage_skips_issue_when_timeline_cannot_be_verified():
    from agents.triage.__main__ import triage_candidates

    router = FakeRouter({"tractable": True})
    out = await triage_candidates(
        FakeAPI([_issue(1)], timeline_error=True),
        router,
        [{"full_name": "o/r"}],
        NOW,
    )
    assert len(out) == 1
    assert router.calls == 1


@pytest.mark.asyncio
async def test_triage_rejects_recent_claim_before_model_call():
    from agents.triage.__main__ import triage_candidates

    comments = [
        {
            "body": "I'd like to investigate this issue and work on a fix.",
            "created_at": "2026-06-18T00:00:00Z",
            "author_association": "NONE",
            "user": {"login": "contributor"},
        }
    ]
    router = FakeRouter({"tractable": True})
    out = await triage_candidates(
        FakeAPI([_issue(1)], comments=comments),
        router,
        [{"full_name": "o/r"}],
        NOW,
    )
    assert out == []
    assert router.calls == 0


@pytest.mark.asyncio
async def test_triage_rejects_pr_found_by_search_when_timeline_is_redacted():
    from agents.triage.__main__ import triage_candidates

    pull = {
        "number": 1291,
        "state": "closed",
        "html_url": "https://github.com/o/r/pull/1291",
        "title": "fix auth",
        "body": "Closes the whitespace task from #337.",
    }
    router = FakeRouter({"tractable": True})
    out = await triage_candidates(
        FakeAPI([_issue(337)], timelines={337: []}, pull_search=[pull]),
        router,
        [{"full_name": "o/r"}],
        NOW,
    )
    assert out == []
    assert router.calls == 0


@pytest.mark.asyncio
async def test_triage_fails_closed_when_pr_search_is_unavailable():
    from agents.triage.__main__ import triage_candidates

    router = FakeRouter({"tractable": True})
    out = await triage_candidates(
        FakeAPI([_issue(1)], pull_search_error=True),
        router,
        [{"full_name": "o/r"}],
        NOW,
    )
    assert out == []
    assert router.calls == 0
