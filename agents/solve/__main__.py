"""Solve one Vet-approved issue. Run: python -m agents.solve"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import structlog

from agents.solve.core import SolveRejected, resolve_target, solve

log = structlog.get_logger()


async def _run(issue_url: str | None, owned_test: bool) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.solve_policy import load_solve_policy
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.token or not settings.pollinations.api_key:
        log.error("solve.missing_credentials")
        return 1
    store = StateStore(settings.state_dir)
    policy = load_solve_policy()
    try:
        target = resolve_target(store, issue_url, owned_test)
    except (SolveRejected, ValueError) as exc:
        log.error("solve.invalid_target", error=str(exc))
        return 2

    store.write_json(
        "solve.json",
        {
            "status": "starting",
            "issue_url": target,
            "test_mode": owned_test,
            "started_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    api = GitHubAPI.from_token(settings.github.token)
    router = Router.from_settings(
        "solve",
        budget=Budget("solve", limit=int(policy["token_budget"]), kill_multiple=1.0),
    )
    workspace_base = Path(os.getenv("ELIXPO_WORKSPACE_DIR", "/tmp/elixpoo-workspaces"))
    try:
        result = await asyncio.wait_for(
            solve(
                api=api,
                router=router,
                store=store,
                policy=policy,
                issue_url=target,
                owned_test=owned_test,
                workspace_base=workspace_base,
                fork_owner=settings.github.fork_owner or None,
            ),
            timeout=int(policy["max_minutes"]) * 60,
        )
    except Exception as exc:
        # The broad boundary converts provider/git/tool errors into state; it does
        # not retry the whole pipeline or push a partial branch.
        failed = store.read_json("solve.json", {}) or {"issue_url": target}
        failed.update(
            {
                "status": "failed",
                "error": str(exc)[:1000],
                "token_spent": router.budget.spent,
                "failed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        store.write_json("solve.json", failed)
        log.error("solve.failed", error=str(exc), spent=router.budget.spent)
        return 1
    finally:
        await api.close()
        await router.aclose()

    log.info("solve.ready", key=result["key"], branch=result["branch"], spent=result["token_spent"])
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Implement one Vet-approved issue in an isolated fork")
    parser.add_argument("--issue-url", help="manual target; requires --owned-test")
    parser.add_argument("--owned-test", action="store_true", help="use configured writable test repository")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args.issue_url, args.owned_test)))


if __name__ == "__main__":
    main()
