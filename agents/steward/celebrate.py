"""Finalize merged or closed follow-up work and bound durable completion memory."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
from datetime import datetime, timedelta, timezone

import structlog
from lib.github.issues import parse_issue_url
from lib.state.ledger import Ledger

from agents.steward.respond import safety_check

log = structlog.get_logger()


class CelebrationRejected(RuntimeError):
    pass


def build_terminal_action(pull: dict) -> dict | None:
    if pull.get("merged_at"):
        outcome = "merged"
    elif str(pull.get("state") or "").casefold() == "closed":
        outcome = "closed"
    else:
        outcome = ""
    if not outcome:
        return None
    head_sha = str((pull.get("head") or {}).get("sha") or "")
    terminal_at = str(pull.get("merged_at") or pull.get("closed_at") or pull.get("updated_at") or "")
    fingerprint = hashlib.sha256(f"{outcome}:{head_sha}:{terminal_at}".encode()).hexdigest()[:20]
    return {
        "kind": "terminal",
        "outcome": outcome,
        "head_sha": head_sha,
        "terminal_at": terminal_at,
        "fingerprint": fingerprint,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def finalize_one(api, gist, router, store, *, key: str, fingerprint: str, post_message: bool = False) -> dict:
    memory = await gist.load()
    record = memory.active.get(key)
    if record is None or record.subject_kind != "pull_request":
        raise CelebrationRejected("follow-up record is missing or is not a pull request")
    action = dict(record.pending_action)
    if action.get("kind") != "terminal" or action.get("fingerprint") != fingerprint:
        raise CelebrationRejected("stale or mismatched terminal action")
    owner, repo = record.repository.split("/", 1)
    pull = await api.get_pull(owner, repo, record.subject_number)
    current = build_terminal_action(pull)
    if current is None or current["fingerprint"] != fingerprint:
        raise CelebrationRejected("pull request terminal state changed before reconciliation")
    outcome = str(current["outcome"])

    if record.issue_url:
        issue_owner, issue_repo, issue_number = parse_issue_url(record.issue_url)
        ledger_key = f"{issue_owner}/{issue_repo}#{issue_number}"
        ledger = Ledger.load(store)
        ledger.set_status(ledger_key, outcome, current["terminal_at"])
        ledger.save(store)

    completion = memory.complete(key, outcome)
    if completion is None:
        raise CelebrationRejected("follow-up record was already finalized")
    await gist.save(memory)

    public_message = ""
    if post_message:
        public_message = (
            "Merged—thanks for the review." if outcome == "merged" else "This pull request is now closed."
        )
        await safety_check(router, public_message)
        await api.create_issue_comment(owner, repo, record.subject_number, public_message)

    receipt = {
        "schema_version": 1,
        "status": "complete",
        "key": key,
        "outcome": outcome,
        "fingerprint": fingerprint,
        "head_sha": current["head_sha"],
        "public_message": bool(public_message),
        "completed_at": completion.completed_at,
    }
    store.write_state(
        "steward_celebrate.json",
        receipt,
        producer="steward-celebrate",
        run_id=fingerprint,
        key=key,
        ttl=timedelta(days=30),
    )
    return receipt


async def _run(key: str, fingerprint: str) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.github.gists import FollowupGist
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.token or not settings.followups.gist_token or not settings.followups.gist_id:
        log.error("steward.celebrate_missing_credentials")
        return 1
    github = GitHubAPI.from_token(settings.github.token)
    gist_api = GitHubAPI.from_token(settings.followups.gist_token)
    router = Router.from_settings("steward_celebrate", budget=Budget("steward_celebrate", limit=2000))
    try:
        result = await finalize_one(
            github,
            FollowupGist(gist_api, settings.followups.gist_id),
            router,
            StateStore(settings.state_dir),
            key=key,
            fingerprint=fingerprint,
            post_message=os.getenv("ELIXPO_STEWARD_CELEBRATE", "false").casefold() == "true",
        )
    except Exception as exc:
        log.error("steward.celebrate_failed", error=str(exc))
        return 1
    finally:
        await github.close()
        await gist_api.close()
        await router.aclose()
    log.info("steward.celebrate_done", key=key, outcome=result["outcome"])
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Finalize one merged or closed tracked pull request")
    parser.add_argument("--key", required=True)
    parser.add_argument("--fingerprint", required=True)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args.key, args.fingerprint)))


if __name__ == "__main__":
    main()
