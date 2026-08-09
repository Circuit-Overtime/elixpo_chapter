"""Vet one issue before implementation. Run: python -m agents.vet [ISSUE_URL]."""

from __future__ import annotations

import argparse
import asyncio
import json
import secrets
from datetime import datetime, timedelta, timezone

import structlog
from lib.github.issues import fetch_issue_evidence, parse_issue_url

from agents.vet.core import vet_issue

log = structlog.get_logger()


def _resolve_target(store, explicit_url: str | None) -> tuple[str, bool]:
    if explicit_url:
        return explicit_url, False
    pick = store.read_json("pick.json", {}) or {}
    if pick.get("status") != "pending_vet" or not pick.get("url"):
        raise ValueError("state/pick.json has no pending_vet target; run agents.pick first")
    pick = store.read_state(
        "pick.json",
        {},
        expected_producer={"pick", "steward-intake"},
        max_age=timedelta(hours=24),
    ) or {}
    return str(pick["url"]), True


def _finalize_pick(store, result: dict, now: datetime) -> None:
    from lib.state.ledger import Ledger, PRRecord

    pick = store.read_state(
        "pick.json",
        {},
        expected_producer={"pick", "steward-intake"},
        max_age=timedelta(hours=24),
        now=now,
    ) or {}
    if pick.get("status") != "pending_vet" or pick.get("url") != result.get("url"):
        raise RuntimeError("Vet result does not match the pending Pick target")
    if result["suitable"]:
        ledger = Ledger.load(store)
        day = now.date().isoformat()
        if result["key"] not in ledger.prs:
            if not ledger.can_open_today(day):
                raise RuntimeError("daily contribution cap reached before Vet approval")
            ledger.record_pr(
                result["key"],
                PRRecord(issue_url=result["url"], status="claimed", opened_at=now.isoformat()),
                day,
            )
            ledger.save(store)
        pick.update({"status": "picked", "picked": True, "vetted_at": now.isoformat()})
    else:
        pick.update(
            {
                "status": "rejected",
                "picked": False,
                "vet_reasons": result["reasons"],
                "vetted_at": now.isoformat(),
            }
        )
    store.write_state(
        "pick.json",
        pick,
        producer="vet",
        run_id=str(pick.get("run_id") or result.get("run_id") or ""),
        key=str(result.get("key") or ""),
        ttl=timedelta(hours=24),
        now=now,
    )


def _result_exit_code(result: dict, *, require_suitable: bool) -> int:
    if require_suitable and result.get("suitable") is not True:
        return 3
    return 0


async def _run(
    issue_url: str | None,
    force: bool = False,
    owned_test: bool = False,
    require_suitable: bool = False,
) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.token:
        log.error("vet.no_token", hint="set GITHUB_TOKEN in .env.local")
        return 1
    if not settings.pollinations.api_key:
        log.error("vet.no_pollinations_key")
        return 1

    store = StateStore(settings.state_dir)
    try:
        issue_url, from_pick = _resolve_target(store, issue_url)
    except ValueError as exc:
        log.error("vet.no_target", error=str(exc))
        return 2
    try:
        owner, repo, number = parse_issue_url(issue_url)
    except ValueError as exc:
        log.error("vet.invalid_url", error=str(exc))
        return 2
    if owned_test:
        from lib.solve_policy import is_test_repository

        if from_pick or not is_test_repository(f"{owner}/{repo}"):
            log.error("vet.invalid_test_target", repo=f"{owner}/{repo}")
            return 2
    api = GitHubAPI.from_token(settings.github.token)
    router = Router.from_settings("vet", budget=Budget("vet", limit=12_000))
    try:
        if owned_test:
            repository = await api.get_repo(owner, repo)
            permissions = repository.get("permissions") or {}
            if not (permissions.get("push") or permissions.get("admin")):
                log.error("vet.test_target_not_writable", repo=f"{owner}/{repo}")
                return 2
        evidence = await fetch_issue_evidence(api, owner, repo, number)
        now = datetime.now(timezone.utc)
        result = await vet_issue(
            router,
            store,
            owner,
            repo,
            number,
            evidence,
            now=now,
            force=force,
            owned_test=owned_test,
            run_id=(
                str((store.read_json("pick.json", {}) or {}).get("run_id") or "")
                if from_pick
                else secrets.token_hex(8)
            ),
        )
        if from_pick:
            _finalize_pick(store, result, now)
    finally:
        await api.close()
        await router.aclose()

    log.info(
        "vet.done",
        key=result["key"],
        status=result["status"],
        model_called=result["model_called"],
        spent=router.budget.spent,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return _result_exit_code(result, require_suitable=require_suitable)


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify one GitHub issue before implementation")
    parser.add_argument("issue_url", nargs="?", help="manual override; defaults to state/pick.json")
    parser.add_argument("--force", action="store_true", help="recheck an unchanged rejected revision")
    parser.add_argument(
        "--owned-test",
        action="store_true",
        help="allow assignment only for a configured writable test repository",
    )
    parser.add_argument(
        "--require-suitable",
        action="store_true",
        help="exit 3 when Vet records a rejection; useful for terminal pipeline chaining",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run(args.issue_url, args.force, args.owned_test, args.require_suitable)))


if __name__ == "__main__":
    main()
