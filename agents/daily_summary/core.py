"""Build a sanitized daily operational summary from contracted control state."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone

from lib.state.contracts import StateBoundaryError

PRODUCERS = {
    "candidates.json": {"scout", "migration"},
    "triaged.json": {"triage", "migration"},
    "pick.json": {"pick", "vet", "steward-intake", "migration"},
    "vet.json": {"vet", "migration"},
    "solve.json": {"solve", "doctor", "submit", "janitor", "migration"},
    "submit.json": {"submit", "migration"},
    "doctor.json": {"doctor", "migration"},
    "janitor.json": {"janitor", "migration"},
    "ledger.json": {"ledger", "migration"},
}


def _read(store, name: str):
    if store.read_json(name, None) is None:
        return None
    try:
        return store.read_state(name, expected_producer=PRODUCERS[name])
    except StateBoundaryError as exc:
        return {"boundary_error": str(exc)}


def build_summary(store, *, now: datetime | None = None) -> dict:
    current = now or datetime.now(timezone.utc)
    states = {name.removesuffix(".json"): _read(store, name) for name in PRODUCERS}
    ledger = states.get("ledger") or {}
    prs = (ledger.get("prs") or {}) if isinstance(ledger, dict) else {}
    statuses = Counter(str(record.get("status") or "unknown") for record in prs.values())
    token_rows = store.read_jsonl("token_log.jsonl")
    day = current.date().isoformat()
    today_rows = [row for row in token_rows if str(row.get("timestamp") or "").startswith(day)]
    by_role = Counter()
    for row in today_rows:
        by_role[str(row.get("role") or "unknown")] += int(
            row.get("total_tokens") or row.get("tokens") or 0
        )
    boundary_errors = {
        name: value["boundary_error"]
        for name, value in states.items()
        if isinstance(value, dict) and "boundary_error" in value
    }
    return {
        "schema_version": 1,
        "status": "degraded" if boundary_errors else "complete",
        "date": day,
        "generated_at": current.isoformat(),
        "queue": {
            "candidates": len(states.get("candidates") or []),
            "triaged": len(states.get("triaged") or []),
            "pick_status": str((states.get("pick") or {}).get("status") or "missing"),
            "vet_status": str((states.get("vet") or {}).get("status") or "missing"),
        },
        "execution": {
            "solve_status": str((states.get("solve") or {}).get("status") or "missing"),
            "submit_status": str((states.get("submit") or {}).get("status") or "missing"),
            "doctor_status": str((states.get("doctor") or {}).get("status") or "missing"),
            "janitor_status": str((states.get("janitor") or {}).get("status") or "missing"),
        },
        "pull_requests": dict(sorted(statuses.items())),
        "tokens": {"total": sum(by_role.values()), "by_role": dict(sorted(by_role.items()))},
        "boundary_errors": boundary_errors,
    }
