"""Fail-closed Doctor decisions with one fingerprint-scoped retry maximum."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from agents.doctor.models import DoctorDecision, DoctorState, FailureEvidence

_RETRYABLE = {
    "context_mismatch",
    "insufficient_context",
    "model_output",
    "provider_transient",
    "timeout",
    "turn_limit",
    "workspace",
}
_TERMINAL = {
    "credentials",
    "policy",
    "provider_budget",
    "provider_request",
    "review_rejected",
    "stale_issue",
    "token_budget",
    "verification",
}
_RETRY_DELAY = {"provider_transient": 30}


class DoctorRejected(RuntimeError):
    pass


def _stamp(now: datetime | None = None) -> str:
    return (now or datetime.now(timezone.utc)).isoformat()


def failure_fingerprint(failure: FailureEvidence) -> str:
    """Hash stable evidence while removing run-specific paths and identifiers."""
    message = failure.message.casefold()
    message = re.sub(r"/tmp/elixpoo-[^\s'\"]+", "<temp>", message)
    message = re.sub(r"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b", "<uuid>", message)
    message = re.sub(r"\b[0-9a-f]{12,40}\b", "<hex>", message)
    message = re.sub(r"\s+", " ", message).strip()
    material = "|".join((failure.category, failure.stage, failure.exception_type, message))
    return hashlib.sha256(material.encode()).hexdigest()[:20]


def _existing_state(raw: dict[str, Any] | None) -> DoctorState | None:
    if not raw:
        return None
    try:
        return DoctorState.model_validate(raw)
    except ValidationError as exc:
        raise DoctorRejected(f"state/doctor.json violates schema: {exc}") from exc


def decide(
    solve_state: dict[str, Any],
    previous_state: dict[str, Any] | None = None,
    *,
    now: datetime | None = None,
) -> tuple[DoctorDecision, DoctorState]:
    """Return one deterministic decision from a versioned Solve failure receipt."""
    if solve_state.get("status") != "doctor_pending":
        raise DoctorRejected("state/solve.json is not doctor_pending")
    try:
        failure = FailureEvidence.model_validate(solve_state.get("failure"))
    except ValidationError as exc:
        raise DoctorRejected(f"Solve failure evidence violates schema: {exc}") from exc
    cleanup = solve_state.get("cleanup") or {}
    if cleanup.get("owner") != "janitor" or cleanup.get("status") != "blocked_on_doctor":
        raise DoctorRejected("Solve cleanup manifest is not blocked_on_doctor")

    fingerprint = failure_fingerprint(failure)
    previous = _existing_state(previous_state)
    history = list(previous.history if previous else [])
    fingerprint_retries = sum(
        1
        for item in history
        if item.failure_fingerprint == fingerprint and item.action == "retry"
    )
    chain_retries = sum(
        1
        for item in history
        if item.key == str(solve_state.get("key") or "") and item.action == "retry"
    )

    if fingerprint_retries:
        action = "terminate"
        reason = "The same failure fingerprint already consumed its single retry; stopping the loop."
    elif chain_retries:
        action = "terminate"
        reason = "This issue already consumed its single Doctor-authorized retry; stopping the recovery chain."
    elif failure.category in _RETRYABLE and failure.retryable:
        action = "retry"
        reason = "Recorded evidence permits one fresh-run retry after current-run cleanup."
    elif failure.category in _TERMINAL:
        action = "terminate"
        reason = "This failure needs configuration, issue, or implementation changes rather than an automatic retry."
    else:
        action = "preserve"
        reason = "The failure category is not safely actionable; preserve evidence for operator inspection."

    decision = DoctorDecision(
        run_id=str(solve_state.get("run_id") or ""),
        key=str(solve_state.get("key") or ""),
        failure_fingerprint=fingerprint,
        category=failure.category,
        stage=failure.stage,
        action=action,
        reason=reason,
        retry_count=1 if action == "retry" else min(chain_retries, 1),
        retry_after_seconds=_RETRY_DELAY.get(failure.category, 0) if action == "retry" else 0,
        cleanup_authorized=action in {"retry", "terminate"},
        token_spent=max(0, int(solve_state.get("token_spent") or 0)),
        token_limit=max(0, int(solve_state.get("token_limit") or 0)),
        elapsed_seconds=max(0.0, float(solve_state.get("elapsed_seconds") or 0)),
        decided_at=_stamp(now),
    )
    history.append(decision)
    state = DoctorState(current=decision, history=history[-50:])
    return decision, state


def decide_and_record(store, *, now: datetime | None = None) -> DoctorDecision:
    solve_state = store.read_json("solve.json", {}) or {}
    previous = store.read_json("doctor.json", {}) or {}
    if solve_state.get("status") in {"retry_authorized", "terminated", "inspection_required"}:
        parsed = _existing_state(previous)
        mirror = solve_state.get("doctor") or {}
        if parsed and mirror.get("fingerprint") == parsed.current.failure_fingerprint:
            return parsed.current
        raise DoctorRejected("decided Solve state has no matching Doctor receipt")
    decision, doctor_state = decide(solve_state, previous, now=now)
    cleanup = dict(solve_state.get("cleanup") or {})
    cleanup["status"] = "authorized" if decision.cleanup_authorized else "preserved_for_inspection"
    cleanup["doctor_fingerprint"] = decision.failure_fingerprint
    solve_state["doctor"] = {
        "status": "decided",
        "decision": decision.action,
        "fingerprint": decision.failure_fingerprint,
        "decided_at": decision.decided_at,
    }
    solve_state["cleanup"] = cleanup
    solve_state["status"] = {
        "retry": "retry_authorized",
        "terminate": "terminated",
        "preserve": "inspection_required",
    }[decision.action]
    store.write_json("doctor.json", doctor_state.model_dump(mode="json"))
    store.write_json("solve.json", solve_state)
    return decision
