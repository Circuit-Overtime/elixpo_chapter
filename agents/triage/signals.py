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
    r"\b(?:i(?:'m| am) working on|i(?:'ll| will| can| would like to) "
    r"(?:take|try|work|handle|implement|fix)|let me (?:take|work|handle)|take a stab|"
    r"pick(?:ing)? this up|started working|working on this|i(?:'m| am) on it)\b",
    re.IGNORECASE,
)
_UNCLAIM_RE = re.compile(
    r"\b(?:no longer working|not working on this|won't work on|cannot work on|"
    r"can no longer|giving this up|unassign me)\b",
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
    recent_claimants: set[str] = set()
    maintainer_claimants: set[str] = set()
    ordered_comments = sorted(
        comments,
        key=lambda comment: _timestamp(comment.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
    )
    for comment in ordered_comments:
        body = str(comment.get("body") or "")
        created = _timestamp(comment.get("created_at"))
        login = str((comment.get("user") or {}).get("login") or comment.get("id") or "unknown")
        if _UNCLAIM_RE.search(body):
            recent_claimants.discard(login)
            maintainer_claimants.discard(login)
            continue
        if not _CLAIM_RE.search(body):
            continue
        if created and created >= recent_cutoff:
            recent_claimants.add(login)
        if comment.get("author_association", "") in MAINTAINER_ASSOCIATIONS:
            maintainer_claimants.add(login)

    path_text = "\n".join(
        [str(issue.get("title") or ""), str(issue.get("body") or "")]
        + [str(comment.get("body") or "") for comment in comments]
    )
    return {
        "someone_claimed_recently": bool(recent_claimants),
        "maintainer_claimed": bool(maintainer_claimants),
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
