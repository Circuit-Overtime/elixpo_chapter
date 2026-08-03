"""Build IssueSignals from a GitHub issue — the deterministic half.

Splits §4 scoring into what we can read straight off the GitHub payload (labels,
assignee, age, author association) and the fuzzy half that needs a model
(agents.triage.extract). Pure functions → unit-testable without network.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from lib.scorer import IssueSignals

MAINTAINER_ASSOCIATIONS = {"OWNER", "MEMBER", "COLLABORATOR"}


def _is_true(value: object) -> bool:
    """Accept only a real JSON boolean; ambiguous strings fail closed."""
    return value is True


def _created(issue: dict) -> datetime | None:
    ts = issue.get("created_at", "")
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")) if ts else None
    except ValueError:
        return None


def deterministic_signals(issue: dict, now: datetime | None = None) -> dict:
    """Signals readable directly from the issue payload (no model, no comments)."""
    now = now or datetime.now(timezone.utc)
    created = _created(issue)
    labels = [lb.get("name", "").lower() for lb in issue.get("labels", [])]
    return {
        "labels": labels,
        "no_assignee": not issue.get("assignees") and not issue.get("assignee"),
        "older_than_7_days": bool(created and created <= now - timedelta(days=7)),
        "op_is_core_maintainer": issue.get("author_association", "") in MAINTAINER_ASSOCIATIONS,
    }


def merge_signals(deterministic: dict, llm: dict | None = None) -> IssueSignals:
    """Combine deterministic signals with the model-extracted fuzzy ones."""
    llm = llm or {}
    return IssueSignals(
        labels=deterministic.get("labels", []),
        no_assignee=deterministic.get("no_assignee", True),
        older_than_7_days=deterministic.get("older_than_7_days", False),
        op_is_core_maintainer=deterministic.get("op_is_core_maintainer", False),
        # fuzzy — from the model (default to the safe/neutral value if absent)
        has_repro_steps=_is_true(llm.get("has_repro_steps")),
        has_acceptance_criterion=_is_true(llm.get("has_acceptance_criterion")),
        someone_claimed_recently=_is_true(llm.get("someone_claimed_recently")),
        touches_internal_paths=_is_true(llm.get("touches_internal_paths")),
        no_maintainer_claim=not _is_true(llm.get("maintainer_claimed")),
    )
