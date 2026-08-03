"""Scout's pure filter + health-scoring logic (docs/refactor_plan.md section 3).

No I/O — operates on plain repo dicts (GitHub search API shape), so it's fully
unit-testable. The fetching lives in agents.scout.discover.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field

MIN_STARS = 100
MAX_STARS = 15_000
ACTIVE_DAYS = 21

# A repo carrying any of these topics has opted out — permanently skip it.
OPT_OUT_TOPICS = {"elixpoo-opt-out", "no-ai-contributions", "no-ai", "no-ai-prs"}


class RepoCandidate(BaseModel):
    full_name: str
    stars: int = 0
    language: str | None = None
    pushed_at: str = ""
    topics: list[str] = Field(default_factory=list)
    has_contributing: bool = False
    archived: bool = False
    open_issues: int = 0
    band: str = ""              # small | mid | large — for size-diverse selection
    url: str = ""
    score: int = 0
    reasons: list[str] = Field(default_factory=list)


def _parse_ts(ts: str) -> datetime | None:
    if not ts:
        return None
    try:
        parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def is_active(pushed_at: str, now: datetime, days: int = ACTIVE_DAYS) -> bool:
    ts = _parse_ts(pushed_at)
    return ts is not None and ts >= now - timedelta(days=days)


def opted_out(topics: list[str]) -> bool:
    return bool(OPT_OUT_TOPICS & {t.lower() for t in topics})


def passes_filters(
    repo: dict,
    languages: set[str],
    blocklist: set[str],
    now: datetime | None = None,
) -> tuple[bool, list[str]]:
    """Return (eligible, reasons). reasons explains a rejection or the green-lights."""
    now = now or datetime.now(timezone.utc)
    name = repo.get("full_name", "")
    reasons: list[str] = []

    if name in blocklist:
        return False, ["blocklisted"]
    if repo.get("archived") or repo.get("disabled"):
        return False, ["archived/disabled"]
    if repo.get("fork"):
        return False, ["fork repository"]
    if repo.get("has_issues") is False:
        return False, ["issues disabled"]
    if int(repo.get("open_issues_count", 0) or 0) <= 0:
        return False, ["no open issue surface"]
    if not repo.get("license"):
        return False, ["no declared license"]
    if opted_out(repo.get("topics", [])):
        return False, ["opted_out"]

    stars = repo.get("stargazers_count", 0)
    if not (MIN_STARS <= stars <= MAX_STARS):
        return False, [f"stars {stars} out of [{MIN_STARS},{MAX_STARS}]"]

    lang = (repo.get("language") or "").lower()
    if languages and lang not in languages:
        return False, [f"language {lang or '?'} not whitelisted"]

    if not is_active(repo.get("pushed_at", ""), now):
        return False, [f"inactive >{ACTIVE_DAYS}d"]

    reasons.append(f"{stars}★ {lang} active")
    return True, reasons


def health_score(repo: dict, has_contributing: bool, now: datetime | None = None) -> int:
    """Cheap health signal for ranking WITHIN a band.

    Star weight is deliberately small — size diversity comes from band selection,
    not from popularity. Here we rank by contribution readiness, recent
    activity, and a manageable issue surface; Triage decides whether any
    individual issue is approachable.
    """
    now = now or datetime.now(timezone.utc)
    score = 0
    stars = repo.get("stargazers_count", 0)
    score += min(10, stars // 1_500)  # popularity is weak evidence, not the objective

    open_issues = int(repo.get("open_issues_count", 0) or 0)
    if 3 <= open_issues <= 60:
        score += 18
    elif 1 <= open_issues <= 150:
        score += 10
    elif open_issues > 150:
        score += 3  # a very large backlog can mean slow triage rather than opportunity

    pushed = _parse_ts(repo.get("pushed_at", ""))
    if pushed:
        age = now - pushed
        if age <= timedelta(days=3):
            score += 10
        elif age <= timedelta(days=14):
            score += 6
        elif age <= timedelta(days=ACTIVE_DAYS):
            score += 2
    if has_contributing:
        score += 20  # documents how to contribute
    if repo.get("license"):
        score += 8
    return score
