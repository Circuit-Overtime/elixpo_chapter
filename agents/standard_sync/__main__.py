"""Synchronize the canonical repository standard through reviewable pull requests."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

import structlog

from agents.standard_sync.core import (
    load_standard,
    publish_repository_update,
    scan_repositories,
    standard_digest,
)

log = structlog.get_logger()


DEFAULT_CONCURRENCY = 4
MAX_CONCURRENCY = 16


def _progress(completed: int, total: int, plan) -> None:
    details = f"files={len(plan.changes)}" if not plan.error else plan.error
    print(
        f"[standard-sync] scan {completed}/{total} {plan.repository}: "
        f"{plan.status} ({details}, {plan.elapsed_seconds:.2f}s)",
        file=sys.stderr,
        flush=True,
    )


def _concurrency(value: str) -> int:
    parsed = int(value)
    if not 1 <= parsed <= MAX_CONCURRENCY:
        raise argparse.ArgumentTypeError(f"concurrency must be between 1 and {MAX_CONCURRENCY}")
    return parsed


async def _run(*, dry_run: bool, repositories: list[str], concurrency: int) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.publication import safety_check
    from rtk import Budget, Router

    if not settings.github.token:
        log.error("standard_sync.missing_token")
        return 1
    config = load_standard(settings.root, settings.config_dir / "org_standard.yaml")
    api = GitHubAPI.from_token(settings.github.token)
    router = (
        Router.from_settings("standard-sync", budget=Budget("standard-sync", limit=4000))
        if not dry_run
        else None
    )
    try:
        print(
            f"[standard-sync] loading repositories for {config.target_owner}",
            file=sys.stderr,
            flush=True,
        )
        available = await api.list_org_repositories(config.target_owner)
        requested = set(repositories)
        targets = [
            repo
            for repo in available
            if not repo.get("archived")
            and not repo.get("fork")
            and str(repo.get("name") or "") not in config.exclude_repositories
            and (not requested or str(repo.get("name") or "") in requested)
        ]
        target_names = [str(repository["name"]) for repository in targets]
        print(
            f"[standard-sync] scanning {len(target_names)} repositories with concurrency={concurrency}",
            file=sys.stderr,
            flush=True,
        )
        digest = standard_digest(settings.root, config)
        plans = await scan_repositories(
            api,
            settings.root,
            config,
            target_names,
            concurrency=concurrency,
            on_progress=_progress,
        )
        results: list[dict] = []
        for plan in plans:
            full_name = f"{config.target_owner}/{plan.repository}"
            if plan.error:
                results.append({"repository": full_name, "status": "failed", "error": plan.error})
                continue
            if dry_run:
                results.append(
                    {
                        "repository": full_name,
                        "status": plan.status,
                        "files": [{"path": item.path, "status": item.status} for item in plan.changes],
                    }
                )
            else:
                print(f"[standard-sync] publishing {full_name}", file=sys.stderr, flush=True)
                results.append(
                    await publish_repository_update(
                        api,
                        settings.root,
                        config,
                        plan.repository,
                        list(plan.changes),
                        digest=digest,
                        safety_gate=lambda body: safety_check(router, body),
                    )
                )
    finally:
        await api.close()
        if router is not None:
            await router.aclose()
    receipt = {"standard": config.name, "digest": digest, "dry_run": dry_run, "results": results}
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 1 if any(result["status"] == "failed" for result in results) else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Open OreoFlow standard update PRs")
    parser.add_argument("--apply", action="store_true", help="open PRs; default is read-only")
    parser.add_argument("--repo", action="append", default=[], help="limit to one repository name")
    parser.add_argument(
        "--concurrency",
        type=_concurrency,
        default=DEFAULT_CONCURRENCY,
        help=f"parallel repository scans (default: {DEFAULT_CONCURRENCY}, max: {MAX_CONCURRENCY})",
    )
    args = parser.parse_args()
    raise SystemExit(
        asyncio.run(
            _run(
                dry_run=not args.apply,
                repositories=args.repo,
                concurrency=args.concurrency,
            )
        )
    )


if __name__ == "__main__":
    main()
