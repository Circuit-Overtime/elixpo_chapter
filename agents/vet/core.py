"""Fail-closed suitability gates and persistent verdict handling."""

from __future__ import annotations

from datetime import datetime, timezone

from lib.github.issues import referenced_pull_requests
from lib.state.rejections import RejectionLedger
from lib.state.store import StateStore

from agents.vet.evaluate import evaluate_with_rtk

MIN_CONFIDENCE = 0.75
MAX_FILES = 5
MAX_MINUTES = 15


def issue_key(owner: str, repo: str, number: int) -> str:
    return f"{owner}/{repo}#{number}"


def _as_int(value: object, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def deterministic_blockers(
    evidence: dict,
    number: int,
    _now: datetime,
    *,
    allow_assigned: bool = False,
) -> list[str]:
    issue = evidence["issue"]
    blockers: list[str] = []
    if issue.get("pull_request"):
        blockers.append("target is a pull request, not an issue")
    if issue.get("state") != "open":
        blockers.append("issue is not open")
    if issue.get("locked"):
        blockers.append("issue conversation is locked")
    if not allow_assigned and (issue.get("assignee") or issue.get("assignees")):
        blockers.append("issue is already assigned")
    if evidence.get("sub_issues"):
        blockers.append("issue is a tracking parent with sub-issues")
    if referenced_pull_requests(evidence, number):
        blockers.append("an implementation pull request already references the issue")
    return blockers


def _model_blockers(verdict: dict) -> list[str]:
    blockers = [str(reason) for reason in verdict.get("reasons", []) if str(reason).strip()]
    scope = str(verdict.get("scope", "unknown")).casefold()
    if scope not in {"trivial", "small"}:
        blockers.append(f"scope is {scope}")
    files = _as_int(verdict.get("estimated_files", 0))
    if not 1 <= files <= MAX_FILES:
        blockers.append(f"estimated file count {files} is outside 1-{MAX_FILES}")
    minutes = _as_int(verdict.get("estimated_minutes", 0))
    if not 1 <= minutes <= MAX_MINUTES:
        blockers.append(f"estimated work time {minutes} minutes is outside 1-{MAX_MINUTES}")
    confidence = _as_float(verdict.get("confidence", 0.0))
    if confidence < MIN_CONFIDENCE:
        blockers.append(f"confidence {confidence:.2f} is below {MIN_CONFIDENCE:.2f}")
    boolean_requirements = {
        "requirements_clear": "requirements are unclear",
        "verification_clear": "verification path is unclear",
        "conversation_resolved": "conversation leaves unresolved scope or ownership",
    }
    blockers.extend(reason for field, reason in boolean_requirements.items() if verdict.get(field) is not True)
    if verdict.get("needs_maintainer_decision") is not False:
        blockers.append("a maintainer decision is still required")
    if verdict.get("already_resolved") is not False:
        blockers.append("conversation indicates the repository change is already resolved")
    if verdict.get("already_claimed") is not False:
        blockers.append("conversation indicates another contributor currently owns the work")
    if verdict.get("issue_kind") == "tracking_issue":
        blockers.append("issue is a tracking parent rather than one implementation unit")
    if verdict.get("suitable") is not True:
        blockers.append("verifier did not approve the issue")
    return list(dict.fromkeys(blockers))


async def vet_issue(
    router,
    store: StateStore,
    owner: str,
    repo: str,
    number: int,
    evidence: dict,
    *,
    now: datetime | None = None,
    force: bool = False,
    owned_test: bool = False,
) -> dict:
    now = now or datetime.now(timezone.utc)
    issue = evidence["issue"]
    key = issue_key(owner, repo, number)
    updated_at = str(issue.get("updated_at") or "")
    rejections = RejectionLedger.load(store)

    if not force and rejections.rejects_unchanged(key, updated_at):
        record = rejections.issues[key]
        result = {
            "status": "cached_rejection",
            "suitable": False,
            "key": key,
            "url": record.url,
            "title": record.title,
            "issue_kind": record.issue_kind,
            "confidence": record.confidence,
            "reasons": record.reasons,
            "issue_updated_at": updated_at,
            "checked_at": now.isoformat(),
            "model_called": False,
        }
        store.write_json("vet.json", result)
        return result

    hard_blockers = deterministic_blockers(evidence, number, now, allow_assigned=owned_test)
    model_verdict = {} if hard_blockers else await evaluate_with_rtk(router, evidence)
    model_blockers = [] if hard_blockers else _model_blockers(model_verdict)
    blockers = [*hard_blockers, *model_blockers]
    suitable = not blockers
    issue_kind = (
        "tracking_issue"
        if evidence.get("sub_issues")
        else "sub_issue"
        if evidence.get("parent")
        else str(model_verdict.get("issue_kind", "unknown"))
    )
    confidence = _as_float(model_verdict.get("confidence", 1.0 if hard_blockers else 0.0))
    result = {
        "status": "approved" if suitable else "rejected",
        "suitable": suitable,
        "key": key,
        "url": str(issue.get("html_url") or ""),
        "title": str(issue.get("title") or ""),
        "issue_kind": issue_kind,
        "scope": str(model_verdict.get("scope", "unknown")),
        "estimated_files": _as_int(model_verdict.get("estimated_files", 0)),
        "estimated_minutes": _as_int(model_verdict.get("estimated_minutes", 0)),
        "confidence": confidence,
        "summary": str(model_verdict.get("summary", "")),
        "reasons": blockers,
        "issue_updated_at": updated_at,
        "checked_at": now.isoformat(),
        "model_called": not hard_blockers,
        "test_mode": owned_test,
    }
    if suitable:
        rejections.clear(key)
    else:
        rejections.reject(
            key,
            url=result["url"],
            title=result["title"],
            issue_updated_at=updated_at,
            reasons=blockers,
            issue_kind=issue_kind,
            confidence=confidence,
            now=now,
        )
    rejections.save(store)
    store.write_json("vet.json", result)
    return result
