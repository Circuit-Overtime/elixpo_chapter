"""lib tests — scorer (pure) and state store/ledger (tmp dir, no GitHub)."""

from __future__ import annotations

from lib.scorer import THRESHOLD, IssueSignals, qualifies, score
from lib.state.ledger import DAILY_PR_CAP, Ledger, PRRecord
from lib.state.store import StateStore


# --- scorer ---

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


def test_scorer_reproducible_bug_needs_bug_label():
    with_label = IssueSignals(labels=["bug"], has_repro_steps=True)
    assert "reproducible_bug" in score(with_label)[1]
    no_label = IssueSignals(labels=[], has_repro_steps=True)
    assert "reproducible_bug" not in score(no_label)[1]


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
