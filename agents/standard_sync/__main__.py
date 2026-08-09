"""Synchronize the canonical repository standard through reviewable pull requests."""

from __future__ import annotations

import argparse
import asyncio
import json

import structlog

from agents.standard_sync.core import (
    load_standard,
    plan_repository,
    publish_repository_update,
    standard_digest,
)

log = structlog.get_logger()


async def _run(*, dry_run: bool, repositories: list[str]) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI

    if not settings.github.token:
        log.error("standard_sync.missing_token")
        return 1
    config = load_standard(settings.root, settings.config_dir / "org_standard.yaml")
    api = GitHubAPI.from_token(settings.github.token)
    try:
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
        digest = standard_digest(settings.root, config)
        results = []
        for repository in targets:
            name = str(repository["name"])
            changes = await plan_repository(api, settings.root, config, name)
            if dry_run:
                results.append(
                    {
                        "repository": f"{config.target_owner}/{name}",
                        "status": "drifted" if changes else "current",
                        "files": [{"path": item.path, "status": item.status} for item in changes],
                    }
                )
            else:
                results.append(
                    await publish_repository_update(
                        api, settings.root, config, name, changes, digest=digest
                    )
                )
    finally:
        await api.close()
    receipt = {"standard": config.name, "digest": digest, "dry_run": dry_run, "results": results}
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Open OreoFlow standard update PRs")
    parser.add_argument("--apply", action="store_true", help="open PRs; default is read-only")
    parser.add_argument("--repo", action="append", default=[], help="limit to one repository name")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(dry_run=not args.apply, repositories=args.repo)))


if __name__ == "__main__":
    main()
