"""Pick — choose ONE justified target and record it so it never repeats.

Run: python -m agents.pick

Reads state/triaged.json, selects the single best eligible issue (dedup against
the ledger, daily cap, one-open-PR-per-repo, blocklist, tractable, above §4
threshold), records the claim in state/ledger.json, and writes the justified
choice to state/pick.json. Recording the pick is what stops us re-spending
compute on the same issue.
Operating contract: skills/pick-safe-issue/SKILL.md.
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
        store.write_json(
            "pick.json",
            {
                "status": "no_pick",
                "picked": False,
                "reason": "triaged queue is empty",
                "evaluated_at": now.isoformat(),
            },
        )
        return None

    ledger = Ledger.load(store)
    pick = select_top(triaged, ledger, day)
    if pick is None:
        reason = (
            "daily contribution cap reached"
            if not ledger.can_open_today(day)
            else "no candidate passed score, easy-work, and ledger policy"
        )
        store.write_json(
            "pick.json",
            {
                "status": "no_pick",
                "picked": False,
                "reason": reason,
                "evaluated_at": now.isoformat(),
            },
        )
        log.info("pick.nothing_eligible", reason=reason)
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
        "status": "picked",
        "picked": True,
        "repo": pick["repo"],
        "number": pick["number"],
        "title": pick.get("title", ""),
        "url": pick.get("url", ""),
        "issue_age_days": pick.get("issue_age_days"),
        "activity_age_days": pick.get("activity_age_days"),
        "score": pick.get("score", 0),
        "tractable": pick.get("tractable", False),
        "easy": pick.get("easy", False),
        "complexity": pick.get("complexity", "unknown"),
        "estimated_files": pick.get("estimated_files", 0),
        "confidence": pick.get("confidence", 0.0),
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
