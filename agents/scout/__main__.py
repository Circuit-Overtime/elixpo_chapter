"""Scout — discovery squad. Run: python -m agents.scout

Sweeps GitHub for candidate repos (filters per refactor_plan section 3), scores
their health, and writes the top ~20 to state/candidates.json for Triage. No
LLM calls — GitHub search does the heavy lifting, so Scout is cheap and fast.
Operating contract: skills/discover-contributor-repositories/SKILL.md.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import structlog
from lib.aio import gather_safe

from agents.scout.discover import has_contributing, search_repos
from agents.scout.filters import (
    ACTIVE_DAYS,
    MAX_STARS,
    MIN_STARS,
    RepoCandidate,
    health_score,
    passes_filters,
)

log = structlog.get_logger()

MAX_CANDIDATES = 20
PER_BAND_PAGE = 15

# Star bands for size diversity — selection round-robins across these so small
# and mid repos aren't drowned out by giants. (lo, hi) inclusive-ish ranges.
BANDS: list[tuple[str, int, int]] = [
    ("small", MIN_STARS, 2_000),
    ("mid", 2_001, 8_000),
    ("large", 8_001, MAX_STARS),
]


async def discover_candidates(
    api,
    languages: list[str],
    blocklist: set[str],
    now: datetime | None = None,
    *,
    max_candidates: int = MAX_CANDIDATES,
    check_contributing: bool = True,
) -> list[RepoCandidate]:
    """search → filter → rank. Injectable api for tests.

    Scout is a CHEAP broad sweep: GitHub search + filter + score only, no
    per-repo HTTP until a bounded shortlist exists. Issue-level analysis remains
    Triage's job. By default, Scout checks CONTRIBUTING only for likely finalists.
    """
    now = now or datetime.now(timezone.utc)
    pushed_after = (now - timedelta(days=ACTIVE_DAYS)).date().isoformat()
    lang_set = {lang.lower() for lang in languages}
    if not languages:
        return []

    # 1. search every (language × star band) concurrently. Issue-level evidence
    #    belongs to Triage; Scout only requires a non-empty open issue surface.
    tasks, task_lanes = [], []
    for band, lo, hi in BANDS:
        for lang in languages:
            tasks.append(search_repos(api, lang, lo, hi, pushed_after, PER_BAND_PAGE))
            task_lanes.append((band, lang.casefold()))
    results = await gather_safe(tasks, default=[])

    # 2. Filter + dedupe into (star band, language) lanes. Keeping lanes
    #    separate prevents Python's larger search surface from crowding out
    #    TypeScript, JavaScript, and Shell repositories.
    by_lane: dict[tuple[str, str], list[RepoCandidate]] = {
        (band, lang.casefold()): [] for band, _, _ in BANDS for lang in languages
    }
    seen: set[str] = set()
    for lane, repos in zip(task_lanes, results, strict=True):
        band, _searched_language = lane
        for repo in repos:
            name = repo.get("full_name", "")
            if name in seen:
                continue
            ok, reasons = passes_filters(repo, lang_set, blocklist, now)
            if not ok:
                continue
            seen.add(name)
            by_lane[lane].append(
                RepoCandidate(
                    full_name=name,
                    stars=repo.get("stargazers_count", 0),
                    language=repo.get("language"),
                    pushed_at=repo.get("pushed_at", ""),
                    topics=repo.get("topics", []),
                    archived=bool(repo.get("archived")),
                    open_issues=repo.get("open_issues_count", 0),
                    band=band,
                    url=repo.get("html_url", ""),
                    score=health_score(repo, has_contributing=False, now=now),
                    reasons=[*reasons, "has open issues"],
                )
            )

    for cands in by_lane.values():
        cands.sort(key=lambda c: c.score, reverse=True)

    # 3. Enrich only enough leaders to fill a size-diverse final list. This keeps
    #    the default path bounded to roughly max_candidates CONTRIBUTING checks.
    if check_contributing:
        per_lane = max(1, (max_candidates + len(by_lane) - 1) // len(by_lane))
        head = [c for cands in by_lane.values() for c in cands[:per_lane]]
        flags = await gather_safe([has_contributing(api, c.full_name) for c in head], default=False)
        for cand, has_c in zip(head, flags, strict=True):
            cand.has_contributing = has_c
            if has_c:
                cand.score += 15
        for cands in by_lane.values():
            cands.sort(key=lambda c: c.score, reverse=True)

    # 4. Round-robin across band/language lanes for both size and language
    #    diversity. Empty lanes do not consume output slots.
    mixed: list[RepoCandidate] = []
    queues = {lane: list(cands) for lane, cands in by_lane.items()}
    while len(mixed) < max_candidates and any(queues.values()):
        for lane in by_lane:
            if queues[lane]:
                mixed.append(queues[lane].pop(0))
                if len(mixed) >= max_candidates:
                    break
    return mixed


async def _run() -> int:
    import yaml
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.state.ledger import Ledger
    from lib.state.store import StateStore

    if not settings.github.token:
        log.error("scout.no_token", hint="set GITHUB_TOKEN in .env.local")
        return 1

    langs_cfg = yaml.safe_load((settings.config_dir / "languages.yaml").read_text())
    languages = langs_cfg.get("whitelist", [])
    store = StateStore(settings.state_dir)
    blocklist = set(Ledger.load(store).blocklist)

    api = GitHubAPI.from_token(settings.github.token)
    try:
        cands = await discover_candidates(api, languages, blocklist)
    finally:
        await api.close()

    store.write_state(
        "candidates.json",
        [c.model_dump() for c in cands],
        producer="scout",
        ttl=timedelta(hours=24),
    )
    log.info("scout.done", count=len(cands), languages=languages)
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    main()
