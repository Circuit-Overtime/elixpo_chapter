"""Build sanitized Project snapshots from committed squad receipts."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from lib.github.issues import parse_issue_url
from lib.state.board import ProjectSnapshot
from lib.state.ledger import Ledger, PRRecord

_LEDGER_STATUS = {
    "claimed": ("claimed", "pick"),
    "solving": ("solving", "solve"),
    "awaiting_review": ("open", "steward"),
    "changes_requested": ("changes requested", "steward_fix"),
    "ci_failed": ("CI failed", "steward_fix"),
    "merged": ("merged", "steward_celebrate"),
    "closed": ("closed", "steward_celebrate"),
    "rejected": ("rejected", "vet"),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _key_from_url(issue_url: str) -> str:
    owner, repo, number = parse_issue_url(issue_url)
    return f"{owner}/{repo}#{number}"


def _same_key(state: dict, key: str) -> bool:
    state_key = str(state.get("key") or "")
    if state_key:
        return state_key == key
    url = str(state.get("issue_url") or state.get("url") or "")
    if not url:
        return False
    try:
        return _key_from_url(url) == key
    except ValueError:
        return False


def _latest(*values: str) -> str:
    present = [str(value) for value in values if str(value or "").strip()]
    return max(present) if present else utc_now()


def snapshot_for_record(
    key: str,
    record: PRRecord,
    issue: dict[str, Any],
    *,
    solve: dict,
    submit: dict,
    doctor: dict,
    janitor: dict,
    steward_fix: dict,
) -> ProjectSnapshot:
    status, squad = _LEDGER_STATUS.get(record.status, ("rejected", "operator"))
    matching_solve = solve if _same_key(solve, key) else {}
    matching_submit = submit if _same_key(submit, key) else {}
    matching_fix = steward_fix if _same_key(steward_fix, key) else {}
    matching_doctor = doctor if _same_key(doctor, key) else {}
    matching_janitor = janitor if _same_key(janitor, key) else {}

    solve_status = str(matching_solve.get("status") or "")
    if record.status not in {"merged", "closed"}:
        if solve_status in {"running", "doctor_pending"}:
            status, squad = ("cleanup pending", "doctor") if solve_status == "doctor_pending" else ("solving", "solve")
        elif solve_status in {"solved", "ready"}:
            status, squad = "ready", "submit"
        elif matching_submit.get("status") == "submitted":
            status, squad = "submitted", "steward"
        if matching_fix.get("status") == "running":
            status, squad = "changes requested", "steward_fix"
        elif matching_fix.get("status") == "failed":
            status, squad = "changes requested", "operator"

    warning = ""
    if matching_doctor:
        current = matching_doctor.get("current") or matching_doctor
        warning = str(current.get("reason") or current.get("action") or "")
    cleanup = matching_solve.get("cleanup") or {}
    cleanup_status = str(cleanup.get("status") or matching_janitor.get("status") or "")
    updated_at = _latest(
        record.last_event,
        matching_solve.get("failed_at", ""),
        matching_solve.get("completed_at", ""),
        matching_submit.get("submitted_at", ""),
        matching_fix.get("completed_at", ""),
        matching_janitor.get("cleaned_at", ""),
    )
    return ProjectSnapshot(
        issue_key=key,
        issue_node_id=str(issue.get("node_id") or ""),
        issue_url=str(issue.get("html_url") or record.issue_url),
        status=status,
        current_squad=squad,
        run_id=str(matching_solve.get("run_id") or ""),
        branch=str(matching_submit.get("branch") or matching_solve.get("branch") or ""),
        pr_url=str(record.pr_url or matching_submit.get("pr_url") or ""),
        started_at=str(matching_solve.get("started_at") or record.opened_at or ""),
        updated_at=updated_at,
        token_target=int(matching_solve.get("token_target") or matching_solve.get("token_limit") or 0),
        token_spend=int(matching_solve.get("token_spent") or record.token_spend or 0),
        doctor_warning=warning,
        cleanup_status=cleanup_status,
    )


async def build_snapshots(api, ledger: Ledger, states: dict[str, dict]) -> tuple[list[ProjectSnapshot], list[dict]]:
    snapshots: list[ProjectSnapshot] = []
    failures: list[dict] = []
    for key, record in sorted(ledger.prs.items()):
        if not record.issue_url:
            failures.append({"key": key, "error": "ledger record has no issue URL"})
            continue
        try:
            owner, repo, number = parse_issue_url(record.issue_url)
            issue = await api.get_issue(owner, repo, number)
            if not issue.get("node_id"):
                raise RuntimeError("GitHub issue has no node ID")
            snapshots.append(
                snapshot_for_record(
                    key,
                    record,
                    issue,
                    solve=states.get("solve", {}),
                    submit=states.get("submit", {}),
                    doctor=states.get("doctor", {}),
                    janitor=states.get("janitor", {}),
                    steward_fix=states.get("steward_fix", {}),
                )
            )
        except Exception as exc:
            failures.append({"key": key, "error": str(exc)[:500]})
    pick = states.get("pick", {})
    pick_url = str(pick.get("url") or "")
    if pick_url:
        try:
            key = _key_from_url(pick_url)
            if key not in ledger.prs and pick.get("status") in {"pending_vet", "rejected"}:
                owner, repo, number = parse_issue_url(pick_url)
                issue = await api.get_issue(owner, repo, number)
                if not issue.get("node_id"):
                    raise RuntimeError("GitHub issue has no node ID")
                status = "rejected" if pick.get("status") == "rejected" else "discovered"
                snapshots.append(
                    ProjectSnapshot(
                        issue_key=key,
                        issue_node_id=str(issue.get("node_id") or ""),
                        issue_url=str(issue.get("html_url") or pick_url),
                        status=status,
                        current_squad="vet" if status == "discovered" else "pick",
                        updated_at=str(pick.get("vetted_at") or pick.get("picked_at") or utc_now()),
                    )
                )
        except Exception as exc:
            failures.append({"key": str(pick.get("repo") or "pending-pick"), "error": str(exc)[:500]})
    return snapshots, failures


def current_states(store) -> dict[str, dict]:
    return {
        name: store.read_json(f"{name}.json", {}) or {}
        for name in ("pick", "vet", "solve", "submit", "doctor", "janitor", "steward_fix")
    }
