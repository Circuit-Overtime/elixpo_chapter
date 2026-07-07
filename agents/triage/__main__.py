"""Triage — turns candidate repos into scored candidate ISSUES. Run: python -m agents.triage

Reads state/candidates.json, pulls each repo's good-first issues, scores them
with the §4 scorer (cheap deterministic pre-rank → LLM deep pass on the
shortlist only, to save tokens), and writes a ranked queue to state/triaged.json.
"""

from __future__ import annotations

import asyncio

import structlog
from lib.aio import gather_safe
from lib.scorer import score
from pydantic import BaseModel, Field

from agents.triage.extract import extract_issue_signals
from agents.triage.fetch import fetch_comments, fetch_good_first_issues
from agents.triage.signals import deterministic_signals, merge_signals

log = structlog.get_logger()

MAX_REPOS = 8       # candidate repos to pull issues from
PER_REPO = 8        # issues per repo
SHORTLIST = 12      # issues that get the (paid) LLM deep pass


class TriagedIssue(BaseModel):
    repo: str
    number: int
    title: str
    url: str
    score: int
    breakdown: dict[str, int] = Field(default_factory=dict)
    tractable: bool = False
    rationale: str = ""


async def triage_candidates(
    api,
    router,
    candidates: list[dict],
    now=None,
    *,
    max_repos: int = MAX_REPOS,
    per_repo: int = PER_REPO,
    shortlist: int = SHORTLIST,
) -> list[TriagedIssue]:
    """Score candidate issues. Injectable api + router → testable in isolation."""
    repos = candidates[:max_repos]

    # 1. fetch each repo's good-first issues concurrently (a flaky repo → skipped)
    issue_lists = await gather_safe(
        [fetch_good_first_issues(api, r["full_name"], per_repo) for r in repos], default=[]
    )

    # 2. deterministic pre-score (no model, no comments) → cheap ranking
    prelim: list[dict] = []
    for repo, issues in zip(repos, issue_lists, strict=True):
        for iss in issues:
            det = deterministic_signals(iss, now)
            pre, _ = score(merge_signals(det))
            prelim.append({"repo": repo["full_name"], "issue": iss, "det": det, "pre": pre})

    prelim.sort(key=lambda x: x["pre"], reverse=True)
    short = prelim[:shortlist]

    # 3. deep pass on the shortlist only: fetch comments + LLM signal extraction.
    #    gather_safe → a single 504 or LLM hiccup skips that item, never fails the run.
    comment_lists = await gather_safe(
        [fetch_comments(api, x["repo"], x["issue"]["number"]) for x in short], default=[]
    )
    llm_results = await gather_safe(
        [extract_issue_signals(router, x["issue"], comments)
         for x, comments in zip(short, comment_lists, strict=True)],
        default={},
    )

    # 4. full §4 score + build ranked records
    out: list[TriagedIssue] = []
    for x, llm in zip(short, llm_results, strict=True):
        total, breakdown = score(merge_signals(x["det"], llm))
        iss = x["issue"]
        out.append(
            TriagedIssue(
                repo=x["repo"],
                number=iss["number"],
                title=iss.get("title", ""),
                url=iss.get("html_url", ""),
                score=total,
                breakdown=breakdown,
                tractable=bool(llm.get("tractable", False)),
                rationale=str(llm.get("rationale", "")),
            )
        )

    out.sort(key=lambda t: t.score, reverse=True)
    return out


async def _run() -> int:
    from datetime import datetime, timezone

    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.token:
        log.error("triage.no_token", hint="set GITHUB_TOKEN in .env.local")
        return 1
    if not settings.pollinations.api_key:
        log.error("triage.no_pollinations_key")
        return 1

    store = StateStore(settings.state_dir)
    candidates = store.read_json("candidates.json", [])
    if not candidates:
        log.warning("triage.no_candidates", hint="run agents.scout first")
        return 1

    api = GitHubAPI.from_token(settings.github.token)
    router = Router.from_settings("triage", budget=Budget("triage", limit=80_000))
    try:
        triaged = await triage_candidates(api, router, candidates, datetime.now(timezone.utc))
    finally:
        await api.close()
        await router.aclose()

    store.write_json("triaged.json", [t.model_dump() for t in triaged])
    log.info("triage.done", scored=len(triaged), spent=router.budget.spent)
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    main()
