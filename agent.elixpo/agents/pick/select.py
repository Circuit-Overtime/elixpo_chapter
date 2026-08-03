"""Pick's selection logic — pure, so the choice rules are unit-testable.

Enforces the operating principles before we spend compute on a repo:
  - never a blocklisted repo,
  - never an issue we've already picked (recorded in the ledger → no repeats),
  - at most one open PR per repo,
  - respect the daily cap,
  - only explicitly easy, tractable issues above the §4 threshold.
The justification is built from the score breakdown + the model's rationale.
"""

from __future__ import annotations

from lib.scorer import THRESHOLD
from lib.state.ledger import Ledger


def issue_key(repo: str, number: int) -> str:
    return f"{repo}#{number}"


def is_eligible(repo: str, number: int, ledger: Ledger) -> tuple[bool, str]:
    if ledger.is_blocked(repo):
        return False, "repo blocklisted"
    if issue_key(repo, number) in ledger.prs:
        return False, "already picked"
    open_key = ledger.open_pr_for_repo(repo)
    if open_key:
        return False, f"repo has an open PR ({open_key})"
    return True, "eligible"


def select_top(
    triaged: list[dict],
    ledger: Ledger,
    day: str,
    *,
    min_score: int = THRESHOLD,
    require_tractable: bool = True,
    require_easy: bool = True,
) -> dict | None:
    """Highest-scoring eligible easy issue, or None when nothing is safe to pick."""
    if not ledger.can_open_today(day):
        return None
    for t in sorted(triaged, key=lambda x: x.get("score", 0), reverse=True):
        if t.get("score", 0) < min_score:
            break  # sorted — nothing below will qualify either
        if require_tractable and not t.get("tractable", False):
            continue
        if require_easy and not t.get("easy", False):
            continue
        ok, _ = is_eligible(t["repo"], t["number"], ledger)
        if ok:
            return t
    return None


def justify(pick: dict) -> str:
    """Human-readable 'why this one' — score, model rationale, and firing signals."""
    signals = ", ".join(f"{k} {v:+d}" for k, v in pick.get("breakdown", {}).items())
    rationale = pick.get("rationale", "").strip()
    scope = (
        f"{pick.get('complexity', 'unknown')} scope, "
        f"~{pick.get('estimated_files', 0)} files, "
        f"{float(pick.get('confidence', 0.0)):.0%} confidence"
    )
    return (
        f"{pick['repo']}#{pick['number']} — score {pick.get('score', 0)} "
        f"(threshold {THRESHOLD}); {scope}. {rationale} Signals: {signals}."
    )
