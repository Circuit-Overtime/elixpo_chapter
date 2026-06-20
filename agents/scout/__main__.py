"""Scout — discovery squad. Run: python -m agents.scout

Sweeps GitHub for candidate repos (filters per refactor_plan section 3), scores
their health, and writes the top ~20 to state/candidates.json for Triage. No
LLM calls — GitHub search does the heavy lifting, so Scout is cheap and fast.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import structlog

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
PER_LANGUAGE = 30


async def discover_candidates(
    api,
    languages: list[str],
    blocklist: set[str],
    now: datetime | None = None,
    *,
    max_candidates: int = MAX_CANDIDATES,
    check_contributing: bool = True,
) -> list[RepoCandidate]:
    """Pure-ish core: search → filter → score. Injectable api for tests."""
    now = now or datetime.now(timezone.utc)
    pushed_after = (now - timedelta(days=ACTIVE_DAYS)).date().isoformat()
    lang_set = {lang.lower() for lang in languages}

    candidates: list[RepoCandidate] = []
    seen: set[str] = set()
    for language in languages:
        repos = await search_repos(api, language, MIN_STARS, MAX_STARS, pushed_after, PER_LANGUAGE)
        for repo in repos:
            name = repo.get("full_name", "")
            if name in seen:
                continue
            ok, reasons = passes_filters(repo, lang_set, blocklist, now)
            if not ok:
                continue
            seen.add(name)
            contributing = await has_contributing(api, name) if check_contributing else False
            candidates.append(
                RepoCandidate(
                    full_name=name,
                    stars=repo.get("stargazers_count", 0),
                    language=repo.get("language"),
                    pushed_at=repo.get("pushed_at", ""),
                    topics=repo.get("topics", []),
                    has_contributing=contributing,
                    archived=bool(repo.get("archived")),
                    open_issues=repo.get("open_issues_count", 0),
                    url=repo.get("html_url", ""),
                    score=health_score(repo, contributing),
                    reasons=reasons,
                )
            )

    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates[:max_candidates]


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

    store.write_json("candidates.json", [c.model_dump() for c in cands])
    log.info("scout.done", count=len(cands), languages=languages)
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    main()
