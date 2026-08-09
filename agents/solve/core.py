"""Bounded Solve orchestration: fork, comprehend, edit, verify, review."""

from __future__ import annotations

import asyncio
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from lib.github.issues import fetch_issue_evidence, parse_issue_url, referenced_pull_requests
from lib.solve_policy import is_test_repository
from lib.state.ledger import Ledger
from lib.state.store import StateStore
from lib.workspace import Workspace

from agents.solve.branch import build_work_branch
from agents.solve.command_policy import (
    effective_prefixes,
    setup_failure_is_infrastructure,
    setup_fallback_command,
)
from agents.solve.correction import CorrectionRejected, apply_review_correction, correction_targets
from agents.solve.edit import EditRejected
from agents.solve.failure import cleanup_manifest
from agents.solve.git import (
    assert_workspace_identity,
    changed_files,
    commit_files,
    git,
    run_verification,
    validate_command,
)
from agents.solve.harness import run_harness
from agents.solve.model import review_diff
from agents.solve.models import SolvePlan
from agents.solve.verification_plan import complete_verification_plan


class SolveRejected(RuntimeError):
    pass


def issue_key(owner: str, repo: str, number: int) -> str:
    return f"{owner}/{repo}#{number}"


def write_solve_state(store: StateStore, payload: dict) -> None:
    """Persist one evolving Solve receipt with its current execution identity."""
    store.write_state(
        "solve.json",
        payload,
        producer="solve",
        run_id=str(payload.get("run_id") or ""),
        key=str(payload.get("key") or ""),
        ttl=timedelta(hours=24),
    )


def resolve_target(store: StateStore, explicit_url: str | None, owned_test: bool) -> str:
    vet = store.read_state(
        "vet.json",
        {},
        expected_producer="vet",
        max_age=timedelta(hours=24),
        allow_legacy=True,
    ) or {}
    if explicit_url:
        if not owned_test or not is_test_repository(_repo_from_url(explicit_url)):
            raise SolveRejected("explicit targets require --owned-test and a configured test repository")
        if vet.get("url") == explicit_url and vet.get("suitable") is not True:
            reasons = "; ".join(str(item) for item in (vet.get("reasons") or [])[:3])
            suffix = f": {reasons}" if reasons else ""
            raise SolveRejected(f"Vet rejected this target{suffix}")
        if vet.get("url") != explicit_url or vet.get("test_mode") is not True:
            raise SolveRejected("run Vet with the same URL, --owned-test, and --force before Solve")
        return explicit_url

    pick = store.read_state(
        "pick.json",
        {},
        expected_producer="vet",
        expected_run_id=str(vet.get("run_id") or "") if vet.get("run_id") else None,
        expected_key=str(vet.get("key") or "") if vet.get("key") else None,
        max_age=timedelta(hours=24),
        allow_legacy=True,
    ) or {}
    if pick.get("status") != "picked" or not pick.get("url"):
        raise SolveRejected("state/pick.json has no Vet-approved target")
    url = str(pick["url"])
    if vet.get("url") != url or vet.get("suitable") is not True or vet.get("test_mode") is True:
        raise SolveRejected("Vet approval does not match the picked target")
    return url


def _repo_from_url(url: str) -> str:
    owner, repo, _ = parse_issue_url(url)
    return f"{owner}/{repo}"


def _validate_path(path: str) -> None:
    candidate = Path(path)
    if (
        not path
        or not re.fullmatch(r"[A-Za-z0-9_./@+\-]+", path)
        or candidate.is_absolute()
        or ".." in candidate.parts
        or candidate.parts[0] == ".git"
    ):
        raise SolveRejected(f"unsafe planned path: {path}")


def validate_plan(
    plan: SolvePlan,
    policy: dict[str, Any],
    repository_files: set[str],
    retrieved_files: set[str] | None = None,
) -> None:
    if not plan.solvable:
        raise SolveRejected(f"coding model declined issue: {plan.rationale}")
    if not 1 <= plan.estimated_minutes <= int(policy["max_minutes"]):
        raise SolveRejected(f"plan exceeds {policy['max_minutes']} minutes")
    if not plan.steps or len(plan.steps) > int(policy["max_commit_steps"]):
        raise SolveRejected("plan has an invalid number of commit steps")
    targets: set[str] = set()
    command_count = 0
    for path in plan.context_files:
        _validate_path(path)
        if path not in repository_files:
            raise SolveRejected(f"context file does not exist: {path}")
    for step in plan.steps:
        if not step.purpose.strip():
            raise SolveRejected("plan step has no purpose")
        for path in step.files:
            _validate_path(path)
            if retrieved_files is not None and path in repository_files and path not in retrieved_files:
                raise SolveRejected(f"plan selected unretrieved existing file: {path}")
            targets.add(path)
        for command in step.setup_commands:
            validate_command(command, list(policy["allowed_setup_prefixes"]))
        for command in step.verification_commands:
            validate_command(command, list(policy["allowed_command_prefixes"]))
            command_count += 1
    if len(targets) > int(policy["max_files"]):
        raise SolveRejected(f"plan targets {len(targets)} files; maximum is {policy['max_files']}")
    if command_count < 1:
        raise SolveRejected("plan must include at least one repository verification command")
    if plan.needs_search:
        if int(policy.get("max_search_calls", 0)) < 1 or not plan.search_query.strip():
            raise SolveRejected("plan requested search without an allowed narrow query")


async def ensure_fork(api, owner: str, repo: str, fork_owner: str) -> dict:
    try:
        existing = await api.get_repo(fork_owner, repo)
        parent = str((existing.get("parent") or {}).get("full_name") or "")
        source = str((existing.get("source") or {}).get("full_name") or "")
        if f"{fork_owner}/{repo}".casefold() != f"{owner}/{repo}".casefold() and not (
            parent.casefold() == f"{owner}/{repo}".casefold() or source.casefold() == f"{owner}/{repo}".casefold()
        ):
            raise SolveRejected(f"{fork_owner}/{repo} exists but is not a fork of {owner}/{repo}")
        return existing
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code != 404:
            raise

    profile = await api._request("GET", "/user")
    login = str(profile.get("login") or "")
    payload: dict[str, str] = {}
    if fork_owner.casefold() != login.casefold():
        destination = await api._request("GET", f"/users/{fork_owner}")
        if str(destination.get("type") or "").casefold() != "organization":
            raise SolveRejected(
                f"fork destination {fork_owner} is not the authenticated user {login} or an organization"
            )
        payload["organization"] = fork_owner
    try:
        await api._request("POST", f"/repos/{owner}/{repo}/forks", json=payload)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code != 403:
            raise
        try:
            github_message = str(exc.response.json().get("message") or "forbidden")
        except (TypeError, ValueError):
            github_message = "forbidden"
        accepted = exc.response.headers.get("X-Accepted-GitHub-Permissions", "")
        permission_hint = accepted or "administration=write, contents=read"
        raise SolveRejected(
            "GitHub denied fork creation "
            f"from {owner}/{repo} to {fork_owner}/{repo} for {login}: {github_message}. "
            "For a fine-grained token, select the source repository and grant "
            f"Administration: read/write plus Contents: read ({permission_hint}); "
            "the destination account must also allow repository creation."
        ) from exc
    for _ in range(12):
        await asyncio.sleep(2)
        try:
            return await api.get_repo(fork_owner, repo)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 404:
                raise
    raise SolveRejected("fork was not ready within 24 seconds")


def _budget_guard(router) -> None:
    if router.budget.spent > router.budget.limit:
        raise SolveRejected(f"Solve exceeded its {router.budget.limit}-token budget")


def _validate_changed_targets(root: Path, targets: list[str], policy: dict[str, Any]) -> None:
    if not targets:
        raise SolveRejected("coding harness produced no diff")
    if len(targets) > int(policy["max_files"]):
        raise SolveRejected(f"coding harness changed {len(targets)} files; maximum is {policy['max_files']}")
    blocked = [str(item).casefold() for item in policy.get("blocked_change_prefixes", [])]
    for path in targets:
        _validate_path(path)
        lowered_path = path.casefold()
        if any(lowered_path == item.rstrip("/") or lowered_path.startswith(item) for item in blocked):
            raise SolveRejected(f"coding harness changed a protected path: {path}")
        resolved = root / path
        if not resolved.exists():
            raise SolveRejected(f"coding harness deleted a file: {path}")
        if resolved.is_symlink():
            raise SolveRejected(f"coding harness created or changed a symlink: {path}")


async def solve(
    *,
    api,
    router,
    store: StateStore,
    policy: dict[str, Any],
    issue_url: str,
    owned_test: bool,
    workspace_base: Path,
    fork_owner: str | None = None,
) -> dict:
    started = time.monotonic()
    owner, repo, number = parse_issue_url(issue_url)
    key = issue_key(owner, repo, number)
    if not owned_test:
        ledger = Ledger.load(store)
        if key not in ledger.prs or ledger.prs[key].status != "claimed":
            raise SolveRejected("production target is not claimed in the ledger")

    evidence = await fetch_issue_evidence(api, owner, repo, number)
    issue = evidence["issue"]
    vet = store.read_json("vet.json", {}) or {}
    if str(issue.get("updated_at") or "") != str(vet.get("issue_updated_at") or ""):
        raise SolveRejected("issue changed after Vet; run Vet again")
    if issue.get("state") != "open" or issue.get("locked"):
        raise SolveRejected("issue is no longer open and available")
    if not owned_test and (issue.get("assignee") or issue.get("assignees")):
        raise SolveRejected("issue became assigned after Vet")
    if evidence.get("sub_issues"):
        raise SolveRejected("issue became a tracking parent after Vet")
    if referenced_pull_requests(evidence, number):
        raise SolveRejected("an implementation pull request appeared after Vet")
    upstream = await api.get_repo(owner, repo)
    if owned_test:
        permissions = upstream.get("permissions") or {}
        if not is_test_repository(f"{owner}/{repo}", policy) or not (
            permissions.get("push") or permissions.get("admin")
        ):
            raise SolveRejected("owned test target is not allowlisted and writable")

    if not fork_owner:
        profile = await api._request("GET", "/user")
        fork_owner = str(profile.get("login") or "")
    if not fork_owner:
        raise SolveRejected("cannot resolve the fork owner")
    if fork_owner.casefold() == owner.casefold():
        raise SolveRejected("fork owner must differ from the upstream owner")
    preparing = store.read_json("solve.json", {}) or {}
    preparing.update(
        {
            "status": "running",
            "stage": "forking",
            "key": key,
            "upstream_repo": f"{owner}/{repo}",
            "fork_repo": f"{fork_owner}/{repo}",
        }
    )
    write_solve_state(store, preparing)
    fork = await ensure_fork(api, owner, repo, fork_owner)

    base_branch = str(upstream.get("default_branch") or "main")
    work_branch = build_work_branch(issue, number, secrets.token_hex(2))
    session_id = re.sub(r"[^A-Za-z0-9_-]", "-", f"{owner}-{repo}-{number}-{secrets.token_hex(3)}")
    workspace = Workspace(session_id, workspace_base)
    running = {
        "run_id": str(preparing.get("run_id") or ""),
        "status": "running",
        "stage": "workspace_setup",
        "issue_url": issue_url,
        "key": key,
        "upstream_repo": f"{owner}/{repo}",
        "fork_repo": f"{fork_owner}/{repo}",
        "base_branch": base_branch,
        "branch": work_branch,
        "workspace": str(workspace.root),
        "test_mode": owned_test,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "model_route": str(preparing.get("model_route") or ""),
        "token_target": int(policy.get("token_target") or 0),
        "token_limit": int(policy.get("token_limit") or 0),
    }
    running["cleanup"] = cleanup_manifest(running, workspace_base, status="active")
    write_solve_state(store, running)
    root = workspace.setup(
        fork_url=str(fork.get("clone_url") or f"https://github.com/{fork_owner}/{repo}.git"),
        upstream_url=str(upstream.get("clone_url") or f"https://github.com/{owner}/{repo}.git"),
        base_branch=base_branch,
        work_branch=work_branch,
        token=await api._token(),
    )
    assert_workspace_identity(
        root,
        fork_repo=f"{fork_owner}/{repo}",
        upstream_repo=f"{owner}/{repo}",
        branch=work_branch,
    )
    running["stage"] = "harness"
    write_solve_state(store, running)

    remaining_seconds = max(1, int(policy["max_minutes"]) * 60 - int(time.monotonic() - started))

    def record_live_doctor(snapshot: dict[str, Any]) -> None:
        current = store.read_json("solve.json", {}) or {}
        if str(current.get("run_id") or "") != str(snapshot.get("run_id") or ""):
            return
        current["doctor_live"] = snapshot
        write_solve_state(store, current)

    outcome, usage, harness_metadata = await asyncio.to_thread(
        run_harness,
        root,
        issue,
        policy,
        timeout=remaining_seconds,
        live_update=record_live_doctor,
    )
    router.record_external_usage("code", usage, source="ccr-node-harness", extra=harness_metadata)
    _budget_guard(router)
    if not outcome.solvable:
        raise SolveRejected(f"coding harness declined issue: {outcome.rationale}")
    if outcome.estimated_minutes > int(policy["max_minutes"]):
        raise SolveRejected(f"harness estimate exceeds {policy['max_minutes']} minutes")

    targets = changed_files(root)
    _validate_changed_targets(root, targets, policy)

    running.update({"stage": "semantic_review", "target_files": sorted(targets)})
    write_solve_state(store, running)
    review_diff_text = git(root, "diff", "--unified=40", "--", *targets, timeout=60)
    review_verdict = await review_diff(
        router,
        issue,
        {
            "source": "bounded_coding_harness",
            "target_files": sorted(targets),
            "review_stage": "pre_verification",
        },
        review_diff_text,
        [],
    )
    _budget_guard(router)
    review_attempts = [
        {
            "attempt": 0,
            "approved": review_verdict.approved,
            "summary": review_verdict.summary,
            "findings": review_verdict.findings,
        }
    ]
    if not review_verdict.approved or review_verdict.findings:
        correction_passes = min(1, max(0, int(policy.get("semantic_correction_passes", 0))))
        if correction_passes < 1:
            findings = "; ".join(review_verdict.findings[:3]) or review_verdict.summary
            raise SolveRejected(f"semantic self-review rejected implementation: {findings}")
        if time.monotonic() - started >= int(policy["max_minutes"]) * 60:
            raise SolveRejected("semantic correction has no remaining wall-clock budget")
        allowed_correction_paths = correction_targets(
            root,
            targets,
            list(harness_metadata.get("grounded_paths") or []),
            max_files=int(policy["max_files"]),
            blocked_prefixes=list(policy.get("blocked_change_prefixes", [])),
        )
        running.update(
            {
                "stage": "semantic_correction",
                "semantic_correction": {
                    "attempt": 1,
                    "status": "running",
                    "findings": review_verdict.findings,
                    "allowed_paths": allowed_correction_paths,
                },
            }
        )
        write_solve_state(store, running)
        try:
            corrected_paths, correction_summary = await apply_review_correction(
                router,
                workspace=root,
                issue=issue,
                findings=review_verdict.findings or [review_verdict.summary],
                diff=review_diff_text,
                allowed_paths=allowed_correction_paths,
                max_context_tokens=max(
                    1000,
                    min(int(policy.get("semantic_correction_max_context_tokens", 6000)), 10_000),
                ),
                max_output_tokens=max(
                    800,
                    min(int(policy.get("semantic_correction_max_output_tokens", 3200)), 6000),
                ),
            )
        except (CorrectionRejected, EditRejected, ValueError) as exc:
            raise SolveRejected(f"semantic correction failed: {exc}") from exc
        _budget_guard(router)
        targets = changed_files(root)
        _validate_changed_targets(root, targets, policy)
        corrected_diff = git(root, "diff", "--unified=40", "--", *targets, timeout=60)
        if corrected_diff == review_diff_text:
            raise SolveRejected("semantic correction produced no new diff")
        harness_metadata = {
            **harness_metadata,
            "reviewed_paths": sorted(set(harness_metadata.get("reviewed_paths") or []) | set(targets)),
            "semantic_correction": {
                "attempts": 1,
                "allowed_paths": allowed_correction_paths,
                "edited_paths": corrected_paths,
                "summary": correction_summary,
            },
        }
        running["semantic_correction"] = {
            **harness_metadata["semantic_correction"],
            "status": "reviewing",
        }
        running["target_files"] = sorted(targets)
        running["stage"] = "semantic_re_review"
        write_solve_state(store, running)
        review_verdict = await review_diff(
            router,
            issue,
            {
                "source": "bounded_semantic_correction",
                "target_files": sorted(targets),
                "review_stage": "pre_verification",
                "prior_findings": review_attempts[0]["findings"],
            },
            corrected_diff,
            [],
        )
        _budget_guard(router)
        review_attempts.append(
            {
                "attempt": 1,
                "approved": review_verdict.approved,
                "summary": review_verdict.summary,
                "findings": review_verdict.findings,
            }
        )
        if not review_verdict.approved or review_verdict.findings:
            findings = "; ".join(review_verdict.findings[:3]) or review_verdict.summary
            raise SolveRejected(f"semantic correction remained incomplete: {findings}")
        running["semantic_correction"]["status"] = "approved"
        if time.monotonic() - started >= int(policy["max_minutes"]) * 60:
            raise SolveRejected("semantic correction exhausted the wall-clock budget")

    outcome, verification_inferred = complete_verification_plan(
        root,
        outcome,
        targets,
        allowed_setup_prefixes=effective_prefixes(root, list(policy["allowed_setup_prefixes"]), setup=True),
        allowed_command_prefixes=effective_prefixes(root, list(policy["allowed_command_prefixes"])),
    )

    running.update(
        {
            "stage": "verifying",
            "harness": {
                **outcome.model_dump(),
                **harness_metadata,
                "verification_inferred": verification_inferred,
            },
            "target_files": sorted(targets),
        }
    )
    write_solve_state(store, running)

    checks: list[dict] = []
    verification_exceptions: list[dict] = []
    setup_prefixes = effective_prefixes(root, list(policy["allowed_setup_prefixes"]), setup=True)
    verification_prefixes = effective_prefixes(root, list(policy["allowed_command_prefixes"]))

    def record_check(kind: str, command: str, result) -> None:
        checks.append({"kind": kind, "command": command, "exit_code": result.code, "output": result.output})
        running["checks"] = checks
        write_solve_state(store, running)

    def record_exception(check: dict) -> None:
        detail = re.sub(r"\s+", " ", str(check.get("output") or "")).strip()[-600:]
        verification_exceptions.append(
            {
                "kind": str(check.get("kind") or "verification"),
                "command": str(check.get("command") or ""),
                "exit_code": int(check.get("exit_code") or 1),
                "detail": detail,
            }
        )
        running["verification_exceptions"] = verification_exceptions
        write_solve_state(store, running)

    for command in outcome.setup_commands[: int(policy["max_setup_commands"])]:
        attempt_start = len(checks)
        result = run_verification(
            root,
            command,
            allowed_prefixes=setup_prefixes,
            timeout=int(policy["command_timeout_seconds"]),
            node_heap_mb=int(policy.get("verification_node_heap_mb", 512)),
            network=bool(policy.get("setup_network_access", True)),
        )
        record_check("setup", command, result)
        if result.code != 0:
            if setup_failure_is_infrastructure(result.output):
                record_exception(checks[-1])
                raise SolveRejected(f"dependency setup failed due to infrastructure: {command}")
            fallback = setup_fallback_command(command, result.output)
            if fallback:
                result = run_verification(
                    root,
                    fallback,
                    allowed_prefixes=setup_prefixes,
                    timeout=int(policy["command_timeout_seconds"]),
                    node_heap_mb=int(policy.get("verification_node_heap_mb", 512)),
                    network=bool(policy.get("setup_network_access", True)),
                )
                record_check("setup_fallback", fallback, result)
            if result.code != 0:
                for failed in checks[attempt_start:]:
                    if failed["exit_code"] != 0:
                        record_exception(failed)
    for command in outcome.verification_commands[: int(policy["max_test_commands"])]:
        result = run_verification(
            root,
            command,
            allowed_prefixes=verification_prefixes,
            timeout=int(policy["command_timeout_seconds"]),
            node_heap_mb=int(policy.get("verification_node_heap_mb", 512)),
        )
        record_check("verification", command, result)
        if result.code != 0:
            record_exception(checks[-1])

    observed = set(changed_files(root))
    if observed != set(targets):
        raise SolveRejected(f"verification changed the working tree: {sorted(observed ^ set(targets))}")
    unavailable = [
        check
        for check in checks
        if check.get("kind") == "verification"
        and int(check.get("exit_code") or 0) != 0
        and re.search(
            r"(?:execvp|command not found|no such file or directory)",
            str(check.get("output") or ""),
            flags=re.IGNORECASE,
        )
    ]
    if unavailable:
        commands = ", ".join(str(check.get("command") or "") for check in unavailable)
        raise SolveRejected(f"required verification tool unavailable: {commands}")

    running["stage"] = "committing"
    write_solve_state(store, running)
    commit_sha = commit_files(root, targets, outcome.commit_message)
    assert_workspace_identity(
        root,
        fork_repo=f"{fork_owner}/{repo}",
        upstream_repo=f"{owner}/{repo}",
        branch=work_branch,
    )
    committed_targets = set(git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", commit_sha).splitlines())
    if committed_targets != set(targets):
        raise SolveRejected(
            f"implementation commit files differ from reviewed targets: {sorted(committed_targets ^ set(targets))}"
        )
    commits = [commit_sha]
    print(
        f"[solve] committed fork={fork_owner}/{repo} branch={work_branch} sha={commit_sha[:12]}",
        flush=True,
    )

    if git(root, "status", "--porcelain"):
        raise SolveRejected("workspace is not clean after the implementation commit")
    diff = git(root, "diff", f"upstream/{base_branch}...HEAD", timeout=60)
    if not diff.strip():
        raise SolveRejected("Solve produced no diff")

    result = {
        **running,
        "status": "ready_to_submit",
        "stage": "complete",
        "title": str(issue.get("title") or ""),
        "issue_number": number,
        "summary": outcome.summary,
        "rationale": outcome.rationale,
        "target_files": sorted(targets),
        "checks": checks,
        "verification_exceptions": verification_exceptions,
        "verification_status": "exceptions" if verification_exceptions else "passed",
        "commits": commits,
        "head_sha": git(root, "rev-parse", "HEAD"),
        "harness": {
            **outcome.model_dump(),
            **harness_metadata,
            "verification_inferred": verification_inferred,
        },
        "review": {
            "approved": review_verdict.approved,
            "findings": review_verdict.findings,
            "summary": review_verdict.summary,
            "source": "independent_semantic_diff_review",
            "attempts": review_attempts,
        },
        "token_spent": router.budget.spent,
        "token_target": int(policy.get("token_target", router.budget.limit)),
        "token_target_exceeded": router.budget.spent > int(policy.get("token_target", router.budget.limit)),
        "token_limit": router.budget.limit,
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }
    write_solve_state(store, result)
    return result
