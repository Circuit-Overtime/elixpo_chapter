"""Community-issue scorer — docs/refactor_plan.md section 4.

Pure and deterministic: it scores a struct of pre-extracted signals, so it's
trivially unit-testable. The fuzzy extraction (does the body have repro steps? a
clear acceptance criterion? did someone say "I'll take this"?) is the triage
squad's job — it fills IssueSignals, then calls score(). Threshold ≥ 8 to queue.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

THRESHOLD = 8

POSITIVE_LABELS = {"good first issue", "help wanted", "up-for-grabs", "hacktoberfest"}
NEGATIVE_LABELS = {"triage", "needs-design", "discussion", "question"}


class IssueSignals(BaseModel):
    labels: list[str] = Field(default_factory=list)  # lowercased
    has_repro_steps: bool = False          # paired with a "bug" label
    no_assignee: bool = True
    no_maintainer_claim: bool = True
    has_acceptance_criterion: bool = False
    older_than_7_days: bool = False
    op_is_core_maintainer: bool = False
    someone_claimed_recently: bool = False  # "I'll take this" within 14 days
    touches_internal_paths: bool = False
    contributing_discuss_first: bool = False  # CONTRIBUTING says discuss-first AND no discussion exists


def _labels(s: IssueSignals) -> set[str]:
    return {label.lower() for label in s.labels}


def score(s: IssueSignals) -> tuple[int, dict[str, int]]:
    """Return (total, breakdown). Breakdown maps each fired signal → its points."""
    labels = _labels(s)
    b: dict[str, int] = {}

    if labels & POSITIVE_LABELS:
        b["good_first/help_wanted"] = 5
    if "bug" in labels and s.has_repro_steps:
        b["reproducible_bug"] = 3
    if s.no_assignee:
        b["no_assignee"] = 2
    if s.no_maintainer_claim:
        b["no_maintainer_claim"] = 2
    if s.has_acceptance_criterion:
        b["acceptance_criterion"] = 2
    if s.older_than_7_days:
        b["aged"] = 1
    if labels & NEGATIVE_LABELS:
        b["discussion_label"] = -5
    if s.op_is_core_maintainer:
        b["op_is_maintainer"] = -5
    if s.someone_claimed_recently:
        b["already_claimed"] = -10
    if s.touches_internal_paths:
        b["internal_paths"] = -10
    if s.contributing_discuss_first:
        b["discuss_first"] = -5

    return sum(b.values()), b


def qualifies(s: IssueSignals, threshold: int = THRESHOLD) -> bool:
    total, _ = score(s)
    return total >= threshold
