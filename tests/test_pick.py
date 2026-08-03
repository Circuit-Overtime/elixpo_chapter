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
        "issue_age_days": 17,
        "activity_age_days": 5,
        "issue_updated_at": "2026-06-15T00:00:00Z",
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


def test_out_of_window_or_missing_age_is_skipped():
    too_new = {**_t("o/new", 1, 20), "issue_age_days": 6}
    too_old = {**_t("o/old", 2, 20), "issue_age_days": 61}
    missing = _t("o/missing", 3, 20)
    missing.pop("issue_age_days")
    assert select_top([too_new, too_old, missing], Ledger(), DAY) is None


def test_inactive_or_missing_activity_age_is_skipped():
    inactive = {**_t("o/inactive", 1, 20), "activity_age_days": 31}
    missing = _t("o/missing", 2, 20)
    missing.pop("activity_age_days")
    assert select_top([inactive, missing], Ledger(), DAY) is None


def test_unchanged_rejected_issue_is_skipped(tmp_path):
    from lib.state.rejections import RejectionLedger

    rejected = RejectionLedger()
    rejected.reject(
        "o/rejected#1",
        url="https://github.com/o/rejected/issues/1",
        title="rejected",
        issue_updated_at="2026-06-15T00:00:00Z",
        reasons=["tracking issue"],
        issue_kind="tracking_issue",
        confidence=1.0,
        now=NOW,
    )
    changed = {**_t("o/changed", 2, 19), "issue_updated_at": "2026-06-16T00:00:00Z"}
    rejected.reject(
        "o/changed#2",
        url=changed["url"],
        title=changed["title"],
        issue_updated_at="2026-06-15T00:00:00Z",
        reasons=["old revision"],
        issue_kind="standalone",
        confidence=0.6,
        now=NOW,
    )
    pick = select_top([_t("o/rejected", 1, 20), changed], Ledger(), DAY, rejections=rejected)
    assert pick["repo"] == "o/changed"


def test_lower_scoring_easy_issue_beats_high_scoring_blocked_issue():
    pick = select_top(
        [_t("o/risky", 1, 20, easy=False), _t("o/bounded", 2, 11)],
        Ledger(),
        DAY,
    )
    assert pick["repo"] == "o/bounded"


def test_equal_scores_prefer_confidence_then_smaller_scope():
    low_confidence = {**_t("o/low", 1, 12), "confidence": 0.75, "estimated_files": 1}
    larger = {**_t("o/large", 2, 12), "confidence": 0.9, "estimated_files": 5}
    smaller = {**_t("o/small", 3, 12), "confidence": 0.9, "estimated_files": 2}
    pick = select_top([low_confidence, larger, smaller], Ledger(), DAY)
    assert pick["repo"] == "o/small"


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
    assert store.read_json("pick.json")["status"] == "picked"
    assert store.read_json("pick.json")["picked"] is True
    assert "o/b#2" in Ledger.load(store).prs

    # second run must NOT re-pick o/b#2 — it moves to the next eligible
    second = run(store, NOW)
    assert second["repo"] == "o/a" and second["number"] == 1


def test_no_pick_overwrites_stale_pick_output(tmp_path):
    from agents.pick.__main__ import run

    store = StateStore(tmp_path)
    store.write_json("triaged.json", [_t("o/blocked", 1, 20, easy=False)])
    store.write_json("pick.json", {"status": "picked", "repo": "old/repo", "number": 99})

    assert run(store, NOW) is None
    result = store.read_json("pick.json")
    assert result["status"] == "no_pick"
    assert result["picked"] is False
    assert result["reason"] == "no candidate passed score, easy-work, and ledger policy"
    assert "repo" not in result
