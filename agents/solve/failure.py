"""Deterministic Solve failure classification for Doctor and Janitor."""

from __future__ import annotations

import asyncio
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from lib.workspace import WorkspaceError
from rtk.budget import BudgetExceeded

from agents.solve.edit import EditRejected
from agents.solve.harness import HarnessError
from agents.solve.verification_plan import VerificationPlanError


def classify_failure(exc: Exception, stage: str) -> dict[str, Any]:
    """Return evidence and a candidate action; Doctor owns the final decision."""
    message = str(exc)[:1000]
    lowered = message.casefold()
    category = "internal"
    retryable = False
    candidate_action = "inspect"

    if "turn limit before self-review" in lowered:
        category, retryable, candidate_action = "turn_limit", True, "reduce_discovery_then_retry_once"
    elif (
        isinstance(exc, (asyncio.TimeoutError, subprocess.TimeoutExpired, TimeoutError))
        or "wall-time limit" in lowered
        or "harness exceeded" in lowered
    ):
        category, retryable, candidate_action = "timeout", True, "retry_once"
    elif isinstance(exc, BudgetExceeded) or "token budget" in lowered or "breach ceiling" in lowered:
        category, candidate_action = "token_budget", "reduce_context_or_terminate"
    elif isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        if status in {401, 403}:
            category, candidate_action = "credentials", "repair_credentials"
        elif status == 402:
            category, candidate_action = "provider_budget", "fund_or_terminate"
        elif status == 429 or status >= 500:
            category, retryable, candidate_action = "provider_transient", True, "retry_later"
        else:
            category, candidate_action = "provider_request", "inspect_request"
    elif isinstance(exc, EditRejected):
        category, retryable, candidate_action = "context_mismatch", True, "refresh_context_once"
    elif isinstance(exc, WorkspaceError) or isinstance(exc, FileNotFoundError):
        category, retryable, candidate_action = "workspace", True, "repair_environment_then_retry"
    elif isinstance(exc, HarnessError) and (
        "connectionrefused" in lowered
        or "unable to connect to api" in lowered
        or "became unavailable" in lowered
        or "upstream model route refused" in lowered
    ):
        category, retryable, candidate_action = "provider_transient", True, "retry_later"
    elif isinstance(exc, HarnessError) and (
        "unavailable" in lowered
        or "ccr did not become ready" in lowered
        or "ccr exited" in lowered
        or "could not reach ccr" in lowered
    ):
        category, retryable, candidate_action = "workspace", True, "repair_environment_then_retry"
    elif isinstance(exc, HarnessError) and (
        "api error 401" in lowered or "api error 403" in lowered or "failed to authenticate" in lowered
    ):
        category, candidate_action = "credentials", "repair_credentials"
    elif "missing credential" in lowered:
        category, candidate_action = "credentials", "repair_credentials"
    elif (
        "invalid structured model output" in lowered
        or "model did not return" in lowered
        or "harness output failed validation" in lowered
        or "harness result was not structured" in lowered
    ):
        category, retryable, candidate_action = "model_output", True, "retry_once_with_stricter_output"
    elif "verification failed" in lowered or "dependency setup failed" in lowered:
        category, candidate_action = "verification", "inspect_checks_or_terminate"
    elif isinstance(exc, VerificationPlanError):
        category, candidate_action = "verification", "inspect_checks_or_terminate"
    elif "self-review rejected" in lowered:
        category, candidate_action = "review_rejected", "terminate_or_replan"
    elif "issue changed after vet" in lowered:
        category, retryable, candidate_action = "stale_issue", True, "re_vet"
    elif (
        "unretrieved existing file" in lowered
        or "coding model declined" in lowered
        or "source-read budget" in lowered
        or "insufficient evidence" in lowered
        or ("bounded evidence" in lowered and "ungrounded" in lowered)
        or ("permission restrictions" in lowered and "implementation files" in lowered)
        or ("cannot identify" in lowered and "files" in lowered)
    ):
        category, retryable, candidate_action = "insufficient_context", True, "refresh_context_once"
    elif exc.__class__.__name__ in {"SolveRejected", "CommandRejected"}:
        category, candidate_action = "policy", "terminate"

    return {
        "schema_version": 1,
        "category": category,
        "stage": stage,
        "exception_type": exc.__class__.__name__,
        "message": message,
        "retryable": retryable,
        "candidate_action": candidate_action,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }


def cleanup_manifest(state: dict[str, Any], workspace_base: Path) -> dict[str, Any]:
    """Describe resources only; Janitor performs validated cleanup later."""
    resources: list[dict[str, Any]] = []
    workspace = str(state.get("workspace") or "")
    if workspace:
        resources.append(
            {
                "kind": "workspace",
                "locator": workspace,
                "safe_root": str(workspace_base.resolve()),
                "disposition": "remove_after_terminal_decision",
            }
        )
    if state.get("fork_repo"):
        resources.append(
            {
                "kind": "fork",
                "locator": str(state["fork_repo"]),
                "disposition": "preserve_shared_resource",
            }
        )
    return {
        "schema_version": 1,
        "run_id": str(state.get("run_id") or ""),
        "owner": "janitor",
        "status": "blocked_on_doctor",
        "resources": resources,
    }


def failure_handoff(
    state: dict[str, Any],
    exc: Exception,
    *,
    workspace_base: Path,
    token_spent: int,
    token_limit: int,
    elapsed_seconds: float,
) -> dict[str, Any]:
    """Build the complete state contract consumed by future Doctor/Janitor squads."""
    failed = dict(state)
    failure = classify_failure(exc, str(failed.get("stage") or "starting"))
    failure["model_route"] = str(failed.get("model_route") or "")
    failure["token_overage"] = max(0, int(token_spent) - int(token_limit))
    failed.update(
        {
            "status": "doctor_pending",
            "error": str(exc)[:1000],
            "token_spent": token_spent,
            "token_limit": token_limit,
            "elapsed_seconds": round(elapsed_seconds, 3),
            "failure": failure,
            "doctor": {"status": "pending", "decision": None},
            "cleanup": cleanup_manifest(failed, workspace_base),
            "failed_at": failure["occurred_at"],
        }
    )
    return failed
