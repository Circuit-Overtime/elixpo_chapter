from __future__ import annotations

from datetime import datetime, timezone

from agents.daily_summary.core import build_summary
from lib.state.store import StateStore


def test_daily_summary_uses_contracted_state_and_current_token_rows(tmp_path):
    store = StateStore(tmp_path)
    store.write_state("candidates.json", [{"url": "x"}], producer="scout")
    store.write_state("triaged.json", [{"url": "x"}], producer="triage")
    store.write_state("pick.json", {"status": "pending_vet"}, producer="pick")
    store.write_state("vet.json", {"status": "approved"}, producer="vet")
    store.write_state("solve.json", {"status": "ready"}, producer="solve")
    store.write_state("submit.json", {"status": "submitted"}, producer="submit")
    store.write_state("doctor.json", {"status": "healthy"}, producer="doctor")
    store.write_state("janitor.json", {"status": "complete"}, producer="janitor")
    store.write_state(
        "ledger.json",
        {"prs": {"o/r#1": {"status": "awaiting_review"}}},
        producer="ledger",
    )
    store.append_jsonl(
        "token_log.jsonl",
        {"timestamp": "2026-08-10T01:00:00+00:00", "role": "vet", "total_tokens": 120},
    )

    result = build_summary(store, now=datetime(2026, 8, 10, tzinfo=timezone.utc))

    assert result["status"] == "complete"
    assert result["queue"]["candidates"] == 1
    assert result["pull_requests"] == {"awaiting_review": 1}
    assert result["tokens"] == {"total": 120, "by_role": {"vet": 120}}


def test_daily_summary_reports_tampered_boundary(tmp_path):
    store = StateStore(tmp_path)
    store.write_state("pick.json", {"status": "picked"}, producer="pick")
    store.write_json("pick.json", {"status": "tampered"})

    result = build_summary(store, now=datetime(2026, 8, 10, tzinfo=timezone.utc))

    assert result["status"] == "degraded"
    assert "pick" in result["boundary_errors"]
