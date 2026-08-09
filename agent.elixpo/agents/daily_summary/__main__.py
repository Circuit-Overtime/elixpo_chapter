"""Write the daily contracted OreoFlow operational summary."""

from __future__ import annotations

import json
from datetime import timedelta

from agents.daily_summary.core import build_summary


def main() -> None:
    from lib.config import settings
    from lib.state.store import StateStore

    store = StateStore(settings.state_dir)
    summary = build_summary(store)
    store.write_state(
        "daily_summary.json",
        summary,
        producer="daily-summary",
        status=summary["status"],
        ttl=timedelta(days=8),
    )
    print(json.dumps(summary, indent=2, sort_keys=True))
    raise SystemExit(0 if summary["status"] == "complete" else 2)


if __name__ == "__main__":
    main()
