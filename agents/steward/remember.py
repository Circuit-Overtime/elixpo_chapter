"""Register a successful Submit receipt in shared follow-up memory."""

from __future__ import annotations

import asyncio
import json
from datetime import timedelta

import structlog
from lib.state.followups import FollowupRecord

log = structlog.get_logger()


async def register_submission(gist, submit_state: dict, solve_state: dict, *, ttl_days: int) -> FollowupRecord:
    if submit_state.get("status") != "submitted" or not submit_state.get("pr_url"):
        raise RuntimeError("state/submit.json has no successful PR receipt")
    repository = str(solve_state.get("upstream_repo") or "")
    if not repository or "/" not in repository:
        raise RuntimeError("state/solve.json has no upstream repository")
    record = FollowupRecord.create(
        repository=repository,
        subject_number=int(submit_state["pr_number"]),
        subject_url=str(submit_state["pr_url"]),
        issue_url=str(submit_state.get("issue_url") or solve_state.get("issue_url") or ""),
        title=str(solve_state.get("title") or solve_state.get("summary") or ""),
        branch=str(submit_state.get("branch") or solve_state.get("branch") or ""),
        fork_repository=str(solve_state.get("fork_repo") or ""),
        ttl_days=ttl_days,
    )
    memory = await gist.load()
    memory.upsert(record)
    await gist.save(memory)
    return record


async def _run() -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.github.gists import FollowupGist
    from lib.state.store import StateStore

    if not settings.followups.gist_token or not settings.followups.gist_id:
        log.error(
            "steward.memory_missing",
            hint="set ELIXPOO_GIST_AGENTIC_TOKEN and ELIXPOO_FOLLOWUP_GIST_ID",
        )
        return 1
    store = StateStore(settings.state_dir)
    api = GitHubAPI.from_token(settings.followups.gist_token)
    try:
        submit_state = store.read_state(
            "submit.json",
            {},
            expected_producer="submit",
            max_age=timedelta(days=7),
        ) or {}
        solve_state = store.read_state(
            "solve.json",
            {},
            expected_producer="submit",
            expected_run_id=str(submit_state.get("run_id") or ""),
            expected_key=str(submit_state.get("key") or ""),
            max_age=timedelta(days=7),
        ) or {}
        record = await register_submission(
            FollowupGist(api, settings.followups.gist_id),
            submit_state,
            solve_state,
            ttl_days=settings.followups.ttl_days,
        )
    except Exception as exc:
        log.error("steward.memory_registration_failed", error=str(exc))
        return 1
    finally:
        await api.close()
    log.info("steward.memory_registered", key=record.key, expires_at=record.expires_at)
    print(json.dumps(record.model_dump(mode="json"), indent=2, sort_keys=True))
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    main()
