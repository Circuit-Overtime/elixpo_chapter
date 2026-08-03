"""lib tests — scorer (pure) and state store/ledger (tmp dir, no GitHub)."""

from __future__ import annotations

from lib.scorer import THRESHOLD, IssueSignals, assess_solvability, qualifies, score
from lib.state.ledger import DAILY_PR_CAP, Ledger, PRRecord
from lib.state.store import StateStore

# --- scorer ---


def test_github_settings_accepts_agentic_token_alias(monkeypatch):
    from lib.config import GitHubSettings

    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.setenv("ELIXPOO_GITHUB_AGENTIC_TOKEN", "test-token")
    assert GitHubSettings().token == "test-token"

def test_scorer_good_first_issue_qualifies():
    s = IssueSignals(
        labels=["good first issue"],
        no_assignee=True,
        no_maintainer_claim=True,
        has_acceptance_criterion=True,
    )
    total, breakdown = score(s)
    assert total == 5 + 2 + 2 + 2  # 11
    assert qualifies(s) is True
    assert breakdown["good_first/help_wanted"] == 5


def test_scorer_claimed_issue_disqualified():
    s = IssueSignals(labels=["good first issue"], someone_claimed_recently=True)
    total, _ = score(s)
    assert total < THRESHOLD
    assert qualifies(s) is False


def test_scorer_internal_paths_and_discussion_label():
    s = IssueSignals(labels=["question"], touches_internal_paths=True)
    total, b = score(s)
    assert b["discussion_label"] == -5
    assert b["internal_paths"] == -10
    assert qualifies(s) is False


def test_maintainer_good_first_issue_is_an_invitation_not_a_self_note():
    invited = IssueSignals(labels=["good first issue"], op_is_core_maintainer=True)
    self_note = IssueSignals(labels=[], op_is_core_maintainer=True)
    invited_score, invited_breakdown = score(invited)
    _, self_note_breakdown = score(self_note)
    assert invited_score >= THRESHOLD
    assert "op_is_maintainer" not in invited_breakdown
    assert self_note_breakdown["op_is_maintainer"] == -5


def test_scorer_reproducible_bug_does_not_need_bug_label():
    with_label = IssueSignals(labels=["bug"], has_repro_steps=True)
    assert "reproducible_bug" in score(with_label)[1]
    decorated_label = IssueSignals(labels=["❌ Bug"], has_repro_steps=True)
    assert "reproducible_bug" in score(decorated_label)[1]
    no_label = IssueSignals(labels=[], has_repro_steps=True)
    assert "reproducible_bug" in score(no_label)[1]


def test_easy_issue_requires_bounded_clear_scope():
    signals = IssueSignals(
        labels=["good first issue"],
        has_acceptance_criterion=True,
    )
    verdict = assess_solvability(
        signals,
        {
            "tractable": True,
            "complexity": "small",
            "estimated_files": 4,
            "confidence": 0.85,
            "needs_maintainer_decision": False,
            "needs_external_access": False,
            "needs_specialized_hardware": False,
        },
    )
    assert verdict.easy is True
    assert verdict.blockers == []


def test_easy_issue_fails_closed_on_unknown_scope_and_access():
    verdict = assess_solvability(
        IssueSignals(labels=["good first issue"]),
        {
            "tractable": True,
            "complexity": "unknown",
            "estimated_files": "many",
            "confidence": "unclear",
            "needs_external_access": True,
        },
    )
    assert verdict.easy is False
    assert "needs external access or credentials" in verdict.blockers
    assert "no acceptance criterion or reproducible bug" in verdict.blockers


# --- state store ---

def test_state_store_json_roundtrip(tmp_path):
    store = StateStore(tmp_path)
    assert store.read_json("x.json", default={}) == {}
    store.write_json("x.json", {"a": 1})
    assert store.read_json("x.json") == {"a": 1}


def test_state_store_jsonl(tmp_path):
    store = StateStore(tmp_path)
    store.append_jsonl("log.jsonl", {"n": 1})
    store.append_jsonl("log.jsonl", {"n": 2})
    rows = store.read_jsonl("log.jsonl")
    assert [r["n"] for r in rows] == [1, 2]


# --- ledger ---

def test_ledger_blocklist_and_daily_cap(tmp_path):
    store = StateStore(tmp_path)
    led = Ledger.load(store)

    led.block("evil/repo")
    led.block("evil/repo")  # idempotent
    assert led.blocklist == ["evil/repo"]
    assert led.is_blocked("evil/repo")

    day = "2026-06-20"
    for i in range(DAILY_PR_CAP):
        assert led.can_open_today(day)
        led.record_pr(f"o/r#{i}", PRRecord(pr_url=f"u{i}"), day)
    assert led.can_open_today(day) is False

    led.save(store)
    reloaded = Ledger.load(store)
    assert reloaded.count_today(day) == DAILY_PR_CAP
    assert reloaded.is_blocked("evil/repo")


def test_ledger_one_open_pr_per_repo(tmp_path):
    led = Ledger()
    led.record_pr("o/r#1", PRRecord(status="awaiting_review"), "2026-06-20")
    assert led.open_pr_for_repo("o/r") == "o/r#1"
    led.set_status("o/r#1", "merged")
    assert led.open_pr_for_repo("o/r") is None
