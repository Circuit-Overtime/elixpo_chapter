"""Doctor failure-decision tests."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from agents.doctor.core import DoctorRejected, decide, decide_and_record
from lib.state.store import StateStore

NOW = datetime(2026, 8, 9, 12, 0, tzinfo=timezone.utc)


def _solve_failure(category: str, *, retryable: bool = True, message: str = "recorded failure") -> dict:
    return {
        "run_id": "run-1",
        "key": "owner/repo#7",
        "status": "doctor_pending",
        "stage": "harness",
        "token_spent": 1200,
        "token_limit": 240000,
        "elapsed_seconds": 42.5,
        "failure": {
            "schema_version": 1,
            "category": category,
            "stage": "harness",
            "exception_type": "HarnessError",
            "message": message,
            "retryable": retryable,
            "candidate_action": "inspect",
            "occurred_at": NOW.isoformat(),
        },
        "doctor": {"status": "pending", "decision": None},
        "cleanup": {
            "schema_version": 1,
            "run_id": "run-1",
            "owner": "janitor",
            "status": "blocked_on_doctor",
            "resources": [],
        },
    }


@pytest.mark.parametrize(
    "category",
    ["provider_transient", "timeout", "workspace", "model_output", "insufficient_context", "turn_limit"],
)
def test_doctor_allows_one_retry_for_bounded_transient_failures(category):
    decision, state = decide(_solve_failure(category), now=NOW)

    assert decision.action == "retry"
    assert decision.retry_count == 1
    assert decision.cleanup_authorized is True
    assert state.current == decision


def test_doctor_stops_a_repeated_failure_fingerprint():
    first, state = decide(_solve_failure("model_output", message="bad output at /tmp/elixpoo-workspaces/a"), now=NOW)
    repeated = _solve_failure("model_output", message="bad output at /tmp/elixpoo-workspaces/b")
    second, updated = decide(repeated, state.model_dump(mode="json"), now=NOW)

    assert first.failure_fingerprint == second.failure_fingerprint
    assert second.action == "terminate"
    assert second.cleanup_authorized is True
    assert len(updated.history) == 2


def test_doctor_stops_retry_chain_when_the_second_failure_changes():
    _, state = decide(_solve_failure("timeout", message="first failure"), now=NOW)
    second, _ = decide(
        _solve_failure("provider_transient", message="different second failure"),
        state.model_dump(mode="json"),
        now=NOW,
    )

    assert second.action == "terminate"
    assert "recovery chain" in second.reason


@pytest.mark.parametrize(
    "category",
    ["credentials", "provider_budget", "policy", "token_budget", "verification", "stale_issue"],
)
def test_doctor_terminates_non_retryable_categories(category):
    decision, _ = decide(_solve_failure(category, retryable=False), now=NOW)
    assert decision.action == "terminate"
    assert decision.retry_count == 0


def test_doctor_preserves_unknown_failure_without_cleanup():
    decision, _ = decide(_solve_failure("internal", retryable=False), now=NOW)
    assert decision.action == "preserve"
    assert decision.cleanup_authorized is False


def test_doctor_carries_model_and_token_anomaly_evidence():
    failure = _solve_failure("token_budget", retryable=False)
    failure["failure"].update({"model_route": "qwen-coder", "token_overage": 73981})
    decision, _ = decide(failure, now=NOW)

    assert decision.model_route == "qwen-coder"
    assert decision.token_overage == 73981
    assert decision.action == "terminate"


def test_doctor_rejects_unversioned_or_unready_state():
    failure = _solve_failure("timeout")
    failure["failure"].pop("schema_version")
    with pytest.raises(DoctorRejected, match="schema"):
        decide(failure, now=NOW)

    failure = _solve_failure("timeout")
    failure["status"] = "running"
    with pytest.raises(DoctorRejected, match="doctor_pending"):
        decide(failure, now=NOW)


def test_doctor_records_idempotent_state_and_authorizes_janitor(tmp_path):
    store = StateStore(tmp_path)
    store.write_state("solve.json", _solve_failure("timeout"), producer="solve", now=NOW)

    first = decide_and_record(store, now=NOW)
    second = decide_and_record(store, now=NOW)
    solve = store.read_json("solve.json")
    doctor = store.read_json("doctor.json")

    assert first == second
    assert solve["status"] == "retry_authorized"
    assert solve["cleanup"]["status"] == "authorized"
    assert solve["cleanup"]["doctor_fingerprint"] == first.failure_fingerprint
    assert len(doctor["history"]) == 1


def test_solve_workflow_runs_recovery_on_the_same_runner_and_bounds_retry():
    workflow = Path(".github/workflows/solve.yml").read_text(encoding="utf-8")

    assert "types: [doctor_retry]" in workflow
    assert "python -m agents.doctor" in workflow
    assert "python -m agents.janitor" in workflow
    assert "steps.solve.outcome == 'failure'" in workflow
    assert "steps.submit.outcome == 'success'" in workflow
    assert "steps.doctor.outputs.action == 'retry'" in workflow
    assert "state/doctor.json" in workflow
    assert "state/janitor.json" in workflow
