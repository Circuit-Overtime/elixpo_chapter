"""Janitor CLI: clean only resources authorized by the current Doctor receipt."""

from __future__ import annotations

import json
import os
from pathlib import Path

import structlog

from agents.janitor.core import JanitorRejected, clean_and_record

log = structlog.get_logger()


def main() -> None:
    from lib.config import settings
    from lib.state.store import StateStore

    workspace_root = Path(os.getenv("ELIXPO_WORKSPACE_DIR", "/tmp/elixpoo-workspaces"))
    try:
        receipt = clean_and_record(StateStore(settings.state_dir), workspace_root=workspace_root)
    except (JanitorRejected, ValueError) as exc:
        log.error("janitor.rejected", error=str(exc))
        raise SystemExit(2) from exc
    log.info("janitor.done", status=receipt.status, resources=len(receipt.results))
    print(json.dumps(receipt.model_dump(mode="json"), indent=2, sort_keys=True))
    if receipt.status == "partial":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
