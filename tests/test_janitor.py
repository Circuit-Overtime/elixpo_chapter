"""Janitor destructive-boundary and idempotency tests."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from agents.janitor import core
from agents.janitor.core import JanitorRejected, audit_partial_cleanup, clean_and_record
from lib.state.store import StateStore

NOW = datetime(2026, 8, 9, 12, 0, tzinfo=timezone.utc)
FINGERPRINT = "abc123"


def _seed(store: StateStore, resources: list[dict], *, action: str = "terminate") -> None:
    authorized = action in {"retry", "terminate"}
    store.write_state(
        "doctor.json",
        {
            "schema_version": 1,
            "status": "decided",
            "current": {
                "schema_version": 1,
                "run_id": "run-1",
                "key": "owner/repo#7",
                "failure_fingerprint": FINGERPRINT,
                "category": "timeout",
                "stage": "harness",
                "action": action,
                "reason": "bounded test decision",
                "retry_count": 1 if action == "retry" else 0,
                "retry_after_seconds": 0,
                "retry_stage": "harness" if action == "retry" else "",
                "cleanup_authorized": authorized,
                "model_route": "qwen-coder",
                "token_spent": 10,
                "token_limit": 100,
                "token_overage": 0,
                "elapsed_seconds": 1.0,
                "decided_at": NOW.isoformat(),
            },
            "history": [],
        },
        producer="doctor",
        run_id="run-1",
        key="owner/repo#7",
        now=NOW,
    )
    store.write_state(
        "solve.json",
        {
            "run_id": "run-1",
            "key": "owner/repo#7",
            "status": "terminated" if action == "terminate" else "inspection_required",
            "doctor": {"status": "decided", "decision": action, "fingerprint": FINGERPRINT},
            "cleanup": {
                "schema_version": 1,
                "run_id": "run-1",
                "owner": "janitor",
                "status": "authorized" if authorized else "preserved_for_inspection",
                "doctor_fingerprint": FINGERPRINT,
                "resources": resources,
            },
        },
        producer="doctor",
        run_id="run-1",
        key="owner/repo#7",
        now=NOW,
    )


def _workspace(path, root) -> dict:
    return {
        "kind": "workspace",
        "locator": str(path),
        "safe_root": str(root),
        "disposition": "remove_after_terminal_decision",
    }


def _seed_submitted(store: StateStore, resources: list[dict]) -> None:
    head_sha = "a" * 40
    store.write_state(
        "solve.json",
        {
            "run_id": "run-submitted",
            "key": "owner/repo#8",
            "status": "submitted",
            "head_sha": head_sha,
            "cleanup": {
                "schema_version": 1,
                "run_id": "run-submitted",
                "owner": "janitor",
                "status": "authorized_after_submit",
                "authorized_by": "submit",
                "submission_head_sha": head_sha,
                "resources": resources,
            },
        },
        producer="submit",
        run_id="run-submitted",
        key="owner/repo#8",
        now=NOW,
    )
    store.write_state(
        "submit.json",
        {
            "run_id": "run-submitted",
            "status": "submitted",
            "key": "owner/repo#8",
            "head_sha": head_sha,
            "pr_url": "https://github.com/owner/repo/pull/9",
        },
        producer="submit",
        run_id="run-submitted",
        key="owner/repo#8",
        now=NOW,
    )


def test_janitor_removes_exact_workspace_and_preserves_fork(tmp_path):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    workspace = root / "run-1"
    workspace.mkdir(parents=True)
    (workspace / "change.txt").write_text("temporary", encoding="utf-8")
    _seed(
        state,
        [
            _workspace(workspace, root),
            {"kind": "fork", "locator": "elixpoo/repo", "disposition": "preserve_shared_resource"},
        ],
    )

    receipt = clean_and_record(state, workspace_root=root, now=NOW)

    assert receipt.status == "complete"
    assert not workspace.exists()
    assert [result.outcome for result in receipt.results] == ["removed", "preserved"]
    assert state.read_json("solve.json")["cleanup"]["status"] == "complete"


def test_janitor_missing_workspace_is_idempotent(tmp_path):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    root.mkdir()
    _seed(state, [_workspace(root / "missing", root)])

    first = clean_and_record(state, workspace_root=root, now=NOW)
    second = clean_and_record(state, workspace_root=root, now=NOW)

    assert first == second
    assert first.results[0].outcome == "missing"


def test_janitor_cleans_workspace_after_matching_successful_submit(tmp_path):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    workspace = root / "run-submitted"
    workspace.mkdir(parents=True)
    _seed_submitted(state, [_workspace(workspace, root)])

    receipt = clean_and_record(state, workspace_root=root, now=NOW)

    assert receipt.status == "complete"
    assert receipt.authorization_source == "submit"
    assert receipt.authorization_id == f"submit:{'a' * 20}"
    assert receipt.doctor_fingerprint == ""
    assert not workspace.exists()


def test_janitor_rejects_mismatched_successful_submit(tmp_path):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    workspace = root / "run-submitted"
    workspace.mkdir(parents=True)
    _seed_submitted(state, [_workspace(workspace, root)])
    submit = state.read_json("submit.json")
    submit["head_sha"] = "b" * 40
    state.write_state(
        "submit.json",
        submit,
        producer="submit",
        run_id="run-submitted",
        key="owner/repo#8",
        now=NOW,
    )

    with pytest.raises(JanitorRejected, match="Submit authorization"):
        clean_and_record(state, workspace_root=root, now=NOW)
    assert workspace.exists()


def test_janitor_removes_only_prefixed_recorded_ccr_directory(tmp_path):
    state = StateStore(tmp_path / "state")
    workspace_root = tmp_path / "workspaces"
    temporary_root = tmp_path / "tmp"
    workspace_root.mkdir()
    router_home = temporary_root / "elixpoo-ccr-run-1"
    router_home.mkdir(parents=True)
    _seed(
        state,
        [
            {
                "kind": "temporary_directory",
                "locator": str(router_home),
                "safe_root": str(temporary_root),
                "disposition": "remove_after_terminal_decision",
            }
        ],
    )

    receipt = clean_and_record(
        state,
        workspace_root=workspace_root,
        temporary_root=temporary_root,
        now=NOW,
    )

    assert receipt.results[0].outcome == "removed"
    assert not router_home.exists()


@pytest.mark.parametrize("locator", ["ROOT", "SIBLING", "TRAVERSAL"])
def test_janitor_rejects_unsafe_workspace_without_touching_valid_one(tmp_path, locator):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    valid = root / "valid"
    valid.mkdir(parents=True)
    if locator == "ROOT":
        unsafe = root
    elif locator == "SIBLING":
        unsafe = tmp_path / "sibling"
    else:
        unsafe = root / "child" / ".." / "escape"
    _seed(state, [_workspace(valid, root), _workspace(unsafe, root)])

    with pytest.raises(JanitorRejected):
        clean_and_record(state, workspace_root=root, now=NOW)
    assert valid.exists()


def test_janitor_preserves_unknown_failure_evidence(tmp_path):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    root.mkdir()
    _seed(state, [], action="preserve")

    receipt = clean_and_record(state, workspace_root=root, now=NOW)

    assert receipt.status == "preserved"
    assert state.read_json("solve.json")["cleanup"]["status"] == "preserved_for_inspection"


def test_janitor_records_partial_execution_failure(tmp_path):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    workspace = root / "run-1"
    workspace.mkdir(parents=True)
    _seed(state, [_workspace(workspace, root)])

    def fail_remove(path):
        raise OSError("busy")

    receipt = clean_and_record(state, workspace_root=root, now=NOW, remove_tree=fail_remove)
    assert receipt.status == "partial"
    assert receipt.results[0].outcome == "failed"
    assert workspace.exists()

    before_ttl = audit_partial_cleanup(
        state,
        workspace_root=root,
        ttl_hours=24,
        now=NOW,
    )
    assert before_ttl is None

    recovered = audit_partial_cleanup(
        state,
        workspace_root=root,
        ttl_hours=24,
        now=NOW.replace(day=10, hour=13),
    )
    assert recovered is not None and recovered.status == "complete"
    assert not workspace.exists()


def test_janitor_terminates_only_a_prevalidated_process_group(tmp_path, monkeypatch):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    root.mkdir()
    resource = {
        "kind": "process_group",
        "locator": "4321",
        "disposition": "terminate_after_terminal_decision",
    }
    _seed(state, [resource])
    terminated = []
    monkeypatch.setattr(core, "_group_is_isolated_ccr", lambda process_group: process_group == 4321)

    receipt = clean_and_record(
        state,
        workspace_root=root,
        now=NOW,
        terminate_group=terminated.append,
    )

    assert terminated == [4321]
    assert receipt.results[0].outcome == "terminated"


def test_janitor_rejects_mismatched_doctor_receipt(tmp_path):
    state = StateStore(tmp_path / "state")
    root = tmp_path / "workspaces"
    root.mkdir()
    _seed(state, [])
    solve = state.read_json("solve.json")
    solve["doctor"]["fingerprint"] = "different"
    state.write_state(
        "solve.json", solve, producer="doctor", run_id="run-1", key="owner/repo#7", now=NOW
    )

    with pytest.raises(JanitorRejected, match="same failure"):
        clean_and_record(state, workspace_root=root, now=NOW)
