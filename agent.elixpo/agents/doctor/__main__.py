"""Doctor CLI: decide one recorded Solve failure without public side effects."""

from __future__ import annotations

import json
import os

import structlog

from agents.doctor.core import DoctorRejected, decide_and_record

log = structlog.get_logger()


def main() -> None:
    from lib.config import settings
    from lib.state.store import StateStore

    try:
        decision = decide_and_record(StateStore(settings.state_dir))
    except (DoctorRejected, ValueError) as exc:
        log.error("doctor.rejected", error=str(exc))
        raise SystemExit(2) from exc
    output = os.getenv("GITHUB_OUTPUT", "")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"action={decision.action}\n")
            handle.write(f"fingerprint={decision.failure_fingerprint}\n")
            handle.write(f"retry_after_seconds={decision.retry_after_seconds}\n")
    log.info(
        "doctor.decided",
        action=decision.action,
        category=decision.category,
        fingerprint=decision.failure_fingerprint,
    )
    print(json.dumps(decision.model_dump(mode="json"), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
