"""Janitor CLI: clean only resources authorized by the current Doctor receipt."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import structlog

from agents.janitor.core import JanitorRejected, audit_partial_cleanup, clean_and_record

log = structlog.get_logger()


def main() -> None:
    from lib.config import settings
    from lib.state.store import StateStore

    parser = argparse.ArgumentParser(description="Clean Doctor-authorized agent resources")
    parser.add_argument("--audit", action="store_true", help="retry an expired partial cleanup receipt")
    args = parser.parse_args()
    workspace_root = Path(os.getenv("ELIXPO_WORKSPACE_DIR", "/tmp/elixpoo-workspaces"))
    try:
        store = StateStore(settings.state_dir)
        receipt = (
            audit_partial_cleanup(
                store,
                workspace_root=workspace_root,
                ttl_hours=int(os.getenv("ELIXPO_JANITOR_ORPHAN_TTL_HOURS", "24")),
            )
            if args.audit
            else clean_and_record(store, workspace_root=workspace_root)
        )
    except (JanitorRejected, ValueError) as exc:
        log.error("janitor.rejected", error=str(exc))
        raise SystemExit(2) from exc
    if receipt is None:
        log.info("janitor.audit_skipped", reason="no expired partial receipt")
        return
    log.info("janitor.done", status=receipt.status, resources=len(receipt.results))
    print(json.dumps(receipt.model_dump(mode="json"), indent=2, sort_keys=True))
    if receipt.status == "partial":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
