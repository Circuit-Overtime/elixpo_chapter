"""Run one authorized, non-coding issue or pull-request response."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from datetime import timedelta
from pathlib import Path

import structlog
from lib.github.dispatch import repository_dispatch

from agents.repository_agent.core import (
    PUBLIC_MARKER,
    bounded_context,
    enforce_subject_rate_limit,
    plan_action,
    safety_check,
)

log = structlog.get_logger()


async def run_one(
    api, router, store, *, repository: str, scope: str, number: int, request: str, control_repo: str
):
    owner, repo = repository.split("/", 1)
    subject_call = (
        api.get_pull(owner, repo, number)
        if scope == "pull_request"
        else api.get_issue(owner, repo, number)
    )
    subject = await subject_call
    comments = list(await api.get_issue_comments(owner, repo, number) or [])
    diff = await api.get_pull_diff(owner, repo, number) if scope == "pull_request" else ""
    enforce_subject_rate_limit(comments, "elixpoo")
    action = await plan_action(
        router,
        scope=scope,
        request=request,
        context=bounded_context(subject, comments, diff),
    )
    dispatched = False
    if action.action == "oreoflow":
        control_owner, control_name = control_repo.split("/", 1)
        await repository_dispatch(
            api,
            control_owner,
            control_name,
            "steward_issue_intake",
            {"issue_url": str(subject.get("html_url") or ""), "source_comment_id": 0},
        )
        dispatched = True
    body = f"{action.body}\n\n{PUBLIC_MARKER}"
    await safety_check(router, body)
    if action.action == "review":
        posted = await api.create_pull_review(owner, repo, number, body, "COMMENT")
    else:
        posted = await api.create_issue_comment(owner, repo, number, body)
    receipt = {
        "schema_version": 1,
        "status": "complete",
        "key": f"{repository}#{number}",
        "repository": repository,
        "scope": scope,
        "number": number,
        "action": action.action,
        "oreoflow_dispatched": dispatched,
        "public_url": str(posted.get("html_url") or ""),
        "token_spent": router.budget.spent,
        "cleanup": {"status": "complete", "resources": []},
    }
    store.write_state(
        "repository_agent.json",
        receipt,
        producer="repository-agent",
        key=receipt["key"],
        ttl=timedelta(days=7),
    )
    return receipt


async def _run(args) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.token or not settings.pollinations.api_key:
        log.error("repository_agent.missing_credentials")
        return 1
    control_repo = settings.github.control_repo or os.getenv("ELIXPO_GITHUB_CONTROL_REPO", "")
    if "/" not in control_repo:
        log.error("repository_agent.missing_control_repo")
        return 1
    receipt_dir = Path(os.getenv("ELIXPO_AGENT_RECEIPT_DIR", "/tmp/oreoflow-receipt"))
    api = GitHubAPI.from_token(settings.github.token)
    router = Router.from_settings(
        "repository-agent", budget=Budget("repository-agent", limit=16_000, kill_multiple=1.25)
    )
    try:
        result = await run_one(
            api,
            router,
            StateStore(receipt_dir),
            repository=args.repository,
            scope=args.scope,
            number=args.number,
            request=args.request,
            control_repo=control_repo,
        )
    except Exception as exc:
        log.error("repository_agent.failed", error=str(exc), spent=router.budget.spent)
        return 1
    finally:
        await api.close()
        await router.aclose()
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the bounded Elixpo repository responder")
    parser.add_argument("--repository", required=True)
    parser.add_argument("--scope", choices=("issue", "pull_request"), required=True)
    parser.add_argument("--number", type=int, required=True)
    parser.add_argument("--request", required=True)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args)))


if __name__ == "__main__":
    main()
