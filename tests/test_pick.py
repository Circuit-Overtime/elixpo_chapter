"""Pick tests — selection rules (pure) + record-so-we-never-repeat (tmp store)."""

from __future__ import annotations

from datetime import datetime, timezone

from agents.pick.select import is_eligible, justify, select_top
from lib.state.ledger import DAILY_PR_CAP, Ledger, PRRecord
from lib.state.store import StateStore

DAY = "2026-06-20"
NOW = datetime(2026, 6, 20, tzinfo=timezone.utc)


def _t(repo, number, score, tractable=True, easy=True):
    return {
        "repo": repo,
        "number": number,
        "title": f"{repo}#{number}",
        "url": f"https://github.com/{repo}/issues/{number}",
        "score": score,
        "breakdown": {"good_first/help_wanted": 5, "no_assignee": 2},
        "tractable": tractable,
        "easy": easy,
        "complexity": "small",
        "estimated_files": 3,
        "confidence": 0.9,
        "rationale": "clear scope",
    }


# --- selection rules ---

def test_selects_highest_eligible_tractable():
    triaged = [_t("o/a", 1, 9), _t("o/b", 2, 15), _t("o/c", 3, 12, tractable=False)]
    pick = select_top(triaged, Ledger(), DAY)
    assert pick["repo"] == "o/b"  # top score, tractable, above threshold


def test_below_threshold_and_untractable_skipped():
    assert select_top([_t("o/a", 1, 5)], Ledger(), DAY) is None            # below §4 threshold
    assert select_top([_t("o/a", 1, 20, tractable=False)], Ledger(), DAY) is None
    assert select_top([_t("o/a", 1, 20, easy=False)], Ledger(), DAY) is None


def test_dedup_already_picked():
    led = Ledger()
    led.record_pr("o/b#2", PRRecord(status="claimed"), DAY)
    # o/b#2 already picked → falls through to the next eligible
    pick = select_top([_t("o/b", 2, 15), _t("o/a", 1, 12)], led, DAY)
    assert pick["repo"] == "o/a"


def test_one_open_pr_per_repo_and_blocklist():
    led = Ledger()
    led.record_pr("o/b#2", PRRecord(status="awaiting_review"), DAY)
    ok, why = is_eligible("o/b", 99, led)  # different issue, same repo with open PR
    assert ok is False and "open PR" in why

    led.block("evil/repo")
    ok, why = is_eligible("evil/repo", 1, led)
    assert ok is False and "blocklist" in why


def test_daily_cap_blocks_selection():
    led = Ledger()
    for i in range(DAILY_PR_CAP):
        led.record_pr(f"o/x#{i}", PRRecord(status="merged"), DAY)
    # cap spent → no pick even with a great candidate
    assert select_top([_t("o/new", 1, 20)], led, DAY) is None


def test_justify_mentions_score_and_rationale():
    reason = justify(_t("o/a", 7, 13))
    assert "o/a#7" in reason and "13" in reason and "clear scope" in reason
    assert "small scope" in reason and "3 files" in reason and "90% confidence" in reason


# --- run(): record so we never repeat ---

def test_run_records_and_dedups(tmp_path):
    from agents.pick.__main__ import run

    store = StateStore(tmp_path)
    store.write_json("triaged.json", [_t("o/b", 2, 15), _t("o/a", 1, 12)])

    first = run(store, NOW)
    assert first["repo"] == "o/b" and first["number"] == 2
    assert "justification" in first
    # pick.json + ledger.json written
    assert store.read_json("pick.json")["repo"] == "o/b"
    assert "o/b#2" in Ledger.load(store).prs

    # second run must NOT re-pick o/b#2 — it moves to the next eligible
    second = run(store, NOW)
    assert second["repo"] == "o/a" and second["number"] == 1
