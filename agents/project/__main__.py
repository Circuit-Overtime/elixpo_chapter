"""Reconcile the control ledger into the GitHub Project operations view."""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime, timezone

import structlog
from lib.state.board import Board
from lib.state.ledger import Ledger

from agents.project.core import build_snapshots, current_states

log = structlog.get_logger()


async def reconcile(api, board, store, *, dry_run: bool = False) -> dict:
    snapshots, failures = await build_snapshots(api, Ledger.load(store), current_states(store))
    results: list[dict] = []
    for snapshot in snapshots:
        if dry_run:
            results.append({"key": snapshot.issue_key, "status": snapshot.status, "dry_run": True})
            continue
        try:
            result = await board.upsert(snapshot)
            results.append({"key": snapshot.issue_key, "status": snapshot.status, **result})
        except Exception as exc:
            failures.append({"key": snapshot.issue_key, "error": str(exc)[:500]})
    receipt = {
        "schema_version": 1,
        "status": "complete" if not failures else "partial",
        "dry_run": dry_run,
        "items": results,
        "failures": failures,
        "reconciled_at": datetime.now(timezone.utc).isoformat(),
    }
    store.write_json("project.json", receipt)
    return receipt


async def _run(dry_run: bool, setup: bool) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.state.store import StateStore

    token = settings.project.token
    if not token:
        log.error("project.missing_token", hint="set ELIXPOO_GITHUB_PROJECT_TOKEN")
        return 1
    if setup and not settings.project.owner:
        log.error("project.missing_owner", hint="set ELIXPO_GITHUB_PROJECT_OWNER")
        return 1
    if not dry_run and not setup and (not settings.project.owner or settings.project.number <= 0):
        log.error("project.missing_identity", hint="set ELIXPO_GITHUB_PROJECT_OWNER and ELIXPO_GITHUB_PROJECT_NUMBER")
        return 1
    api = GitHubAPI.from_token(token)
    store = StateStore(settings.state_dir)
    board = Board(api, settings.project.owner, settings.project.number) if not dry_run and not setup else None
    try:
        if setup:
            if settings.project.number > 0:
                board = Board(api, settings.project.owner, settings.project.number)
                project = await board.project()
            else:
                board, project = await Board.create(api, settings.project.owner)
            fields = await board.ensure_fields(project)
            views = await board.ensure_views(project, fields)
            result = {
                "schema_version": 1,
                "status": "configured",
                "owner": settings.project.owner,
                "project_number": int(project["number"]),
                "project_id": project["id"],
                "fields": sorted(fields),
                "views": views,
                "configured_at": datetime.now(timezone.utc).isoformat(),
            }
            store.write_json("project_setup.json", result)
        else:
            result = await reconcile(api, board, store, dry_run=dry_run)
    except Exception as exc:
        log.error("project.reconcile_failed", error=str(exc))
        return 1
    finally:
        await api.close()
    if setup:
        log.info("project.configured", owner=result["owner"], number=result["project_number"])
    else:
        log.info(
            "project.reconciled",
            status=result["status"],
            items=len(result["items"]),
            failures=len(result["failures"]),
        )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] in {"complete", "configured"} else 2


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconcile agent work into GitHub Project V2")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--setup", action="store_true", help="explicitly create/provision the operations Project")
    args = parser.parse_args()
    if args.dry_run and args.setup:
        parser.error("--dry-run and --setup are mutually exclusive")
    raise SystemExit(asyncio.run(_run(args.dry_run, args.setup)))


if __name__ == "__main__":
    main()
