"""Vet one issue before implementation. Run: python -m agents.vet [ISSUE_URL]."""

from __future__ import annotations

import argparse
import asyncio
import json

import structlog

from agents.vet.core import vet_issue
from agents.vet.github import fetch_issue_evidence, parse_issue_url

log = structlog.get_logger()

DEFAULT_ISSUE_URL = "https://github.com/horsicq/Detect-It-Easy/issues/365"


async def _run(issue_url: str, force: bool = False) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.token:
        log.error("vet.no_token", hint="set GITHUB_TOKEN in .env.local")
        return 1
    if not settings.pollinations.api_key:
        log.error("vet.no_pollinations_key")
        return 1

    try:
        owner, repo, number = parse_issue_url(issue_url)
    except ValueError as exc:
        log.error("vet.invalid_url", error=str(exc))
        return 2

    store = StateStore(settings.state_dir)
    api = GitHubAPI.from_token(settings.github.token)
    router = Router.from_settings("vet", budget=Budget("vet", limit=12_000))
    try:
        evidence = await fetch_issue_evidence(api, owner, repo, number)
        result = await vet_issue(router, store, owner, repo, number, evidence, force=force)
    finally:
        await api.close()
        await router.aclose()

    log.info(
        "vet.done",
        key=result["key"],
        status=result["status"],
        model_called=result["model_called"],
        spent=router.budget.spent,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify one GitHub issue before implementation")
    parser.add_argument("issue_url", nargs="?", default=DEFAULT_ISSUE_URL)
    parser.add_argument("--force", action="store_true", help="recheck an unchanged rejected revision")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args.issue_url, args.force)))


if __name__ == "__main__":
    main()
