"""Build IssueSignals from a GitHub issue — the deterministic half.

Splits §4 scoring into what we can read straight off the GitHub payload (labels,
assignee, age, author association) and the fuzzy half that needs a model
(agents.triage.extract). Pure functions → unit-testable without network.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from lib.scorer import IssueSignals

MAINTAINER_ASSOCIATIONS = {"OWNER", "MEMBER", "COLLABORATOR"}
CLAIM_WINDOW_DAYS = 14
STALE_DAYS = 365
_CLAIM_RE = re.compile(
    r"\b(?:i(?:'m| am) working on|i(?:'ll| will| can| would like to) (?:take|try|work)|"
    r"let me (?:take|work)|take a stab|pick(?:ing)? this up|working on this)\b",
    re.IGNORECASE,
)
_INTERNAL_PATH_RE = re.compile(
    r"(?<![\w.-])(?:[\w.-]+/)*(?:internal|private)/[\w./-]+",
    re.IGNORECASE,
)


def _is_true(value: object) -> bool:
    """Accept only a real JSON boolean; ambiguous strings fail closed."""
    return value is True


def _timestamp(value: object) -> datetime | None:
    ts = str(value or "")
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")) if ts else None
    except ValueError:
        return None


def deterministic_signals(issue: dict, now: datetime | None = None) -> dict:
    """Signals readable directly from the issue payload (no model, no comments)."""
    now = now or datetime.now(timezone.utc)
    created = _timestamp(issue.get("created_at"))
    updated = _timestamp(issue.get("updated_at"))
    labels = [lb.get("name", "").lower() for lb in issue.get("labels", [])]
    return {
        "labels": labels,
        "no_assignee": not issue.get("assignees") and not issue.get("assignee"),
        "older_than_7_days": bool(created and created <= now - timedelta(days=7)),
        "stale_over_365_days": not updated or updated < now - timedelta(days=STALE_DAYS),
        "op_is_core_maintainer": issue.get("author_association", "") in MAINTAINER_ASSOCIATIONS,
    }


def deterministic_comment_signals(
    issue: dict,
    comments: list[dict] | None,
    now: datetime | None = None,
) -> dict:
    """Extract claim and literal path signals without fuzzy date/path inference."""
    now = now or datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=CLAIM_WINDOW_DAYS)
    comments = comments or []
    recent_claim = False
    maintainer_claim = False
    for comment in comments:
        body = str(comment.get("body") or "")
        if not _CLAIM_RE.search(body):
            continue
        created = _timestamp(comment.get("created_at"))
        if created and created >= recent_cutoff:
            recent_claim = True
        if comment.get("author_association", "") in MAINTAINER_ASSOCIATIONS:
            maintainer_claim = True

    path_text = "\n".join(
        [str(issue.get("title") or ""), str(issue.get("body") or "")]
        + [str(comment.get("body") or "") for comment in comments]
    )
    return {
        "someone_claimed_recently": recent_claim,
        "maintainer_claimed": maintainer_claim,
        "touches_internal_paths": bool(_INTERNAL_PATH_RE.search(path_text)),
    }


def merge_signals(deterministic: dict, llm: dict | None = None) -> IssueSignals:
    """Combine deterministic signals with the model-extracted fuzzy ones."""
    llm = llm or {}
    return IssueSignals(
        labels=deterministic.get("labels", []),
        no_assignee=deterministic.get("no_assignee", True),
        older_than_7_days=deterministic.get("older_than_7_days", False),
        stale_over_365_days=deterministic.get("stale_over_365_days", True),
        op_is_core_maintainer=deterministic.get("op_is_core_maintainer", False),
        # fuzzy — from the model (default to the safe/neutral value if absent)
        has_repro_steps=_is_true(llm.get("has_repro_steps")),
        has_acceptance_criterion=_is_true(llm.get("has_acceptance_criterion")),
        someone_claimed_recently=_is_true(llm.get("someone_claimed_recently")),
        touches_internal_paths=_is_true(llm.get("touches_internal_paths")),
        no_maintainer_claim=not _is_true(llm.get("maintainer_claimed")),
    )
