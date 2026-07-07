"""Pick — choose ONE justified target and record it so it never repeats.

Run: python -m agents.pick

Reads state/triaged.json, selects the single best eligible issue (dedup against
the ledger, daily cap, one-open-PR-per-repo, blocklist, tractable, above §4
threshold), records the claim in state/ledger.json, and writes the justified
choice to state/pick.json. Recording the pick is what stops us re-spending
compute on the same issue.
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from lib.state.ledger import Ledger, PRRecord
from lib.state.store import StateStore

from agents.pick.select import issue_key, justify, select_top

log = structlog.get_logger()


def run(store: StateStore, now: datetime | None = None) -> dict | None:
    """Select + record. Injectable store → testable without network. Returns the pick."""
    now = now or datetime.now(timezone.utc)
    day = now.date().isoformat()

    triaged = store.read_json("triaged.json", [])
    if not triaged:
        log.warning("pick.no_triaged", hint="run agents.triage first")
        return None

    ledger = Ledger.load(store)
    pick = select_top(triaged, ledger, day)
    if pick is None:
        log.info("pick.nothing_eligible")
        return None

    key = issue_key(pick["repo"], pick["number"])
    reason = justify(pick)
    ledger.record_pr(
        key,
        PRRecord(
            issue_url=pick.get("url", ""),
            status="claimed",
            opened_at=now.isoformat(),
        ),
        day,
    )
    ledger.save(store)

    choice = {
        "repo": pick["repo"],
        "number": pick["number"],
        "title": pick.get("title", ""),
        "url": pick.get("url", ""),
        "score": pick.get("score", 0),
        "tractable": pick.get("tractable", False),
        "justification": reason,
        "picked_at": now.isoformat(),
    }
    store.write_json("pick.json", choice)
    log.info("pick.chosen", key=key, score=pick.get("score", 0), reason=reason)
    return choice


def main() -> None:
    from lib.config import settings

    choice = run(StateStore(settings.state_dir))
    if choice is None:
        raise SystemExit(0)
    print(f"PICKED {choice['repo']}#{choice['number']}\n{choice['justification']}")


if __name__ == "__main__":
    main()
