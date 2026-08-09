"""Seed one mention-requested public issue for the normal Vet pipeline."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone

import structlog
from lib.github.issues import parse_issue_url
from lib.state.ledger import Ledger
from lib.state.store import StateStore

log = structlog.get_logger()


class IntakeRejected(RuntimeError):
    pass


def seed_issue(store: StateStore, issue_url: str, source_comment_id: int | str) -> dict:
    owner, repo, number = parse_issue_url(issue_url)
    repository = f"{owner}/{repo}"
    key = f"{repository}#{number}"
    now = datetime.now(timezone.utc)
    ledger = Ledger.load(store)
    current = store.read_json("pick.json", {}) or {}

    if repository in ledger.blocklist:
        raise IntakeRejected(f"{repository} is blocklisted")
    existing = ledger.prs.get(key)
    if existing and existing.status not in {"closed", "merged"}:
        raise IntakeRejected(f"{key} is already tracked as {existing.status}")
    open_key = ledger.open_pr_for_repo(repository)
    if open_key and open_key != key:
        raise IntakeRejected(f"{repository} already has active work: {open_key}")
    if not ledger.can_open_today(now.date().isoformat()):
        raise IntakeRejected("daily contribution cap reached")
    if current.get("status") in {"pending_vet", "picked"} and current.get("url") != issue_url:
        raise IntakeRejected("another issue already owns the Pick/Vet slot")

    receipt = {
        "status": "pending_vet",
        "picked": True,
        "repo": repository,
        "number": number,
        "url": issue_url,
        "source": "steward_mention",
        "source_comment_id": int(source_comment_id),
        "justification": "Explicit public @elixpoo implementation request; pending independent Vet approval.",
        "picked_at": now.isoformat(),
    }
    store.write_json("pick.json", receipt)
    return receipt


def main() -> None:
    from lib.config import settings

    parser = argparse.ArgumentParser(description="Queue one mention-requested issue for Vet")
    parser.add_argument("--issue-url", required=True)
    parser.add_argument("--source-comment-id", required=True)
    args = parser.parse_args()
    try:
        receipt = seed_issue(StateStore(settings.state_dir), args.issue_url, args.source_comment_id)
    except (IntakeRejected, ValueError) as exc:
        log.error("steward.intake_rejected", error=str(exc))
        raise SystemExit(2) from exc
    log.info("steward.intake_ready", key=f"{receipt['repo']}#{receipt['number']}")


if __name__ == "__main__":
    main()
