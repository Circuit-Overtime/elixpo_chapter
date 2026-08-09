"""Triage — turns candidate repos into scored candidate ISSUES. Run: python -m agents.triage

Reads state/candidates.json, pulls each repo's recently active open issues, scores them
with the §4 scorer (cheap deterministic pre-rank → LLM deep pass on the
shortlist only, to save tokens), and writes a ranked queue to state/triaged.json.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import structlog
from lib.aio import gather_safe
from lib.scorer import (
    MAX_ACTIVITY_AGE_DAYS,
    MAX_ISSUE_AGE_DAYS,
    MIN_ISSUE_AGE_DAYS,
    assess_solvability,
    score,
)
from pydantic import BaseModel, Field

from agents.triage.extract import extract_issue_signals
from agents.triage.fetch import (
    fetch_candidate_issues,
    fetch_comments,
    fetch_issue_timeline,
    search_pull_requests_referencing_issues,
)
from agents.triage.signals import (
    deterministic_comment_signals,
    deterministic_signals,
    linked_pull_requests,
    merge_signals,
    pull_request_issue_references,
)

log = structlog.get_logger()

MAX_REPOS = 16      # cover most of Scout's size-diverse list before giving up
PER_REPO = 30       # free fetch depth; the narrow age gate may reject most results
SHORTLIST = 12      # issues that get the (paid) LLM deep pass
AVAILABILITY_POOL_FACTOR = 3  # free GitHub checks absorb occupied issues before model calls


class TriagedIssue(BaseModel):
    repo: str
    number: int
    title: str
    url: str
    issue_age_days: int
    activity_age_days: int
    issue_updated_at: str
    score: int
    breakdown: dict[str, int] = Field(default_factory=dict)
    tractable: bool = False
    easy: bool = False
    complexity: str = "unknown"
    estimated_files: int = 0
    confidence: float = 0.0
    blockers: list[str] = Field(default_factory=list)
    rationale: str = ""


def remember_triage_verdicts(triaged, rejections, now: datetime) -> None:
    """Cache rejected model verdicts by issue revision; clear newly viable ones."""
    for item in triaged:
        key = f"{item.repo}#{item.number}"
        if item.easy:
            rejections.clear(key)
            continue
        reasons = item.blockers or ([item.rationale] if item.rationale else ["triage did not approve issue"])
        rejections.reject(
            key,
            url=item.url,
            title=item.title,
            issue_updated_at=item.issue_updated_at,
            reasons=reasons,
            issue_kind="unknown",
            confidence=item.confidence,
            now=now,
        )


async def triage_candidates(
    api,
    router,
    candidates: list[dict],
    now=None,
    *,
    max_repos: int = MAX_REPOS,
    per_repo: int = PER_REPO,
    shortlist: int = SHORTLIST,
    rejections=None,
) -> list[TriagedIssue]:
    """Score candidate issues. Injectable api + router → testable in isolation."""
    now = now or datetime.now(timezone.utc)
    repos = candidates[:max_repos]

    # 1. fetch each repo's open issues concurrently (a flaky repo → skipped)
    issue_lists = await gather_safe(
        [fetch_candidate_issues(api, r["full_name"], per_repo) for r in repos], default=[]
    )

    # 2. deterministic pre-score (no model, no comments) → cheap ranking
    prelim: list[dict] = []
    age_window_rejected = 0
    inactive_rejected = 0
    prior_rejections = 0
    for repo, issues in zip(repos, issue_lists, strict=True):
        for iss in issues:
            det = deterministic_signals(iss, now)
            key = f"{repo['full_name']}#{iss['number']}"
            if rejections and rejections.rejects_unchanged(key, str(iss.get("updated_at") or "")):
                prior_rejections += 1
                continue
            if not det["within_target_age_window"]:
                age_window_rejected += 1
                continue
            if not det["recently_active"]:
                inactive_rejected += 1
                continue
            if (
                not det["no_assignee"]
                or det["stale_over_365_days"]
                or iss.get("locked", False)
            ):
                continue
            pre, _ = score(merge_signals(det))
            prelim.append({"repo": repo["full_name"], "issue": iss, "det": det, "pre": pre})

    if age_window_rejected:
        log.info(
            "triage.age_window_rejected",
            count=age_window_rejected,
            min_days=MIN_ISSUE_AGE_DAYS,
            max_days=MAX_ISSUE_AGE_DAYS,
        )
    if inactive_rejected:
        log.info(
            "triage.inactive_rejected",
            count=inactive_rejected,
            max_activity_age_days=MAX_ACTIVITY_AGE_DAYS,
        )
    if prior_rejections:
        log.info("triage.prior_rejections_skipped", count=prior_rejections)

    prelim.sort(key=lambda x: x["pre"], reverse=True)

    # 3. Reject issues that already have a cross-referenced PR before spending
    #    model tokens. Inspect extra candidates so PR conflicts do not starve the
    #    paid shortlist.
    timeline_pool = prelim[: shortlist * AVAILABILITY_POOL_FACTOR]
    timelines = await gather_safe(
        [fetch_issue_timeline(api, x["repo"], x["issue"]["number"]) for x in timeline_pool],
        default=None,
    )

    # Fine-grained tokens can redact timeline cross-reference sources for public
    # repositories. Search PRs once per repository and match exact #N references
    # locally; this is the authoritative availability check.
    by_repo: dict[str, list[int]] = {}
    for candidate in timeline_pool:
        by_repo.setdefault(candidate["repo"], []).append(candidate["issue"]["number"])
    repo_names = list(by_repo)
    repo_pull_results = await gather_safe(
        [search_pull_requests_referencing_issues(api, repo, by_repo[repo]) for repo in repo_names],
        default=None,
    )
    searched_refs: dict[str, dict[int, list[dict]] | None] = {}
    for repo, pulls in zip(repo_names, repo_pull_results, strict=True):
        searched_refs[repo] = (
            None if pulls is None else pull_request_issue_references(pulls, set(by_repo[repo]))
        )

    short: list[dict] = []
    pr_conflicts = 0
    for candidate, timeline in zip(timeline_pool, timelines, strict=True):
        issue_number = candidate["issue"]["number"]
        search_refs = searched_refs[candidate["repo"]]
        if search_refs is None:
            continue
        if search_refs[issue_number] or linked_pull_requests(timeline):
            pr_conflicts += 1
            continue
        short.append(candidate)
        if len(short) >= shortlist:
            break
    if pr_conflicts:
        log.info("triage.linked_prs_rejected", count=pr_conflicts)

    # 4. deep pass on the shortlist only: fetch comments + LLM signal extraction.
    #    gather_safe → a single 504 or LLM hiccup skips that item, never fails the run.
    comment_lists = await gather_safe(
        [fetch_comments(api, x["repo"], x["issue"]["number"]) for x in short], default=None
    )
    verified: list[tuple[dict, list[dict], dict]] = []
    for candidate, comments in zip(short, comment_lists, strict=True):
        if comments is None:
            continue
        comment_det = deterministic_comment_signals(candidate["issue"], comments, now)
        if comment_det["touches_internal_paths"]:
            continue
        verified.append((candidate, comments, comment_det))

    sem = asyncio.Semaphore(4)  # cap concurrent LLM calls → fewer rate limits

    async def _extract(x, comments, comment_det):
        async with sem:
            extracted = await extract_issue_signals(router, x["issue"], comments, now)
            extracted.update(comment_det)
            return extracted

    llm_results = await gather_safe(
        [_extract(x, comments, comment_det) for x, comments, comment_det in verified],
        default={},
    )

    # 5. full §4 score + build ranked records
    out: list[TriagedIssue] = []
    for (x, _comments, _comment_det), llm in zip(verified, llm_results, strict=True):
        signals = merge_signals(x["det"], llm)
        total, breakdown = score(signals)
        solvability = assess_solvability(signals, llm)
        iss = x["issue"]
        out.append(
            TriagedIssue(
                repo=x["repo"],
                number=iss["number"],
                title=iss.get("title", ""),
                url=iss.get("html_url", ""),
                issue_age_days=x["det"]["issue_age_days"],
                activity_age_days=x["det"]["activity_age_days"],
                issue_updated_at=str(iss.get("updated_at") or ""),
                score=total,
                breakdown=breakdown,
                tractable=llm.get("tractable") is True,
                easy=solvability.easy,
                complexity=solvability.complexity,
                estimated_files=solvability.estimated_files,
                confidence=solvability.confidence,
                blockers=solvability.blockers,
                rationale=str(llm.get("rationale", "")),
            )
        )

    out.sort(key=lambda t: (t.easy, t.score, t.confidence, -t.estimated_files), reverse=True)
    return out


async def _run() -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.state.rejections import RejectionLedger
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.token:
        log.error("triage.no_token", hint="set GITHUB_TOKEN in .env.local")
        return 1
    if not settings.pollinations.api_key:
        log.error("triage.no_pollinations_key")
        return 1

    store = StateStore(settings.state_dir)
    candidates = store.read_state(
        "candidates.json",
        [],
        expected_producer="scout",
        max_age=timedelta(hours=24),
    )
    if not candidates:
        log.warning("triage.no_candidates", hint="run agents.scout first")
        return 1

    now = datetime.now(timezone.utc)
    rejections = RejectionLedger.load(store)
    api = GitHubAPI.from_token(settings.github.token)
    router = Router.from_settings("triage", budget=Budget("triage", limit=80_000))
    try:
        triaged = await triage_candidates(
            api,
            router,
            candidates,
            now,
            rejections=rejections,
        )
    finally:
        await api.close()
        await router.aclose()

    remember_triage_verdicts(triaged, rejections, now)
    rejections.save(store)
    store.write_state(
        "triaged.json",
        [t.model_dump() for t in triaged],
        producer="triage",
        ttl=timedelta(hours=24),
        now=now,
    )
    log.info("triage.done", scored=len(triaged), spent=router.budget.spent)
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    main()
