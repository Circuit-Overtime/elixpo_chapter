"""Bounded Solve orchestration: fork, comprehend, edit, verify, review."""

from __future__ import annotations

import asyncio
import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from agents.comprehend.bundle import build_context_bundle, load_exact_context, tracked_files
from agents.solve.edit import apply_edit_batch
from agents.solve.git import changed_files, commit_files, git, run_verification, validate_command
from agents.solve.model import implement_step, plan_issue, review_diff, search_once
from agents.solve.models import SolvePlan
from lib.github.issues import fetch_issue_evidence, parse_issue_url, referenced_pull_requests
from lib.solve_policy import is_test_repository
from lib.state.ledger import Ledger
from lib.state.store import StateStore
from lib.workspace import Workspace


class SolveRejected(RuntimeError):
    pass


def issue_key(owner: str, repo: str, number: int) -> str:
    return f"{owner}/{repo}#{number}"


def resolve_target(store: StateStore, explicit_url: str | None, owned_test: bool) -> str:
    vet = store.read_json("vet.json", {}) or {}
    if explicit_url:
        if not owned_test or not is_test_repository(_repo_from_url(explicit_url)):
            raise SolveRejected("explicit targets require --owned-test and a configured test repository")
        if vet.get("url") != explicit_url or vet.get("suitable") is not True or vet.get("test_mode") is not True:
            raise SolveRejected("run Vet with the same URL, --owned-test, and --force before Solve")
        return explicit_url

    pick = store.read_json("pick.json", {}) or {}
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


def validate_plan(plan: SolvePlan, policy: dict[str, Any], repository_files: set[str]) -> None:
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
            parent.casefold() == f"{owner}/{repo}".casefold()
            or source.casefold() == f"{owner}/{repo}".casefold()
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
    fork = await ensure_fork(api, owner, repo, fork_owner)

    base_branch = str(upstream.get("default_branch") or "main")
    work_branch = f"elixpo/issue-{number}-{secrets.token_hex(3)}"
    session_id = re.sub(r"[^A-Za-z0-9_-]", "-", f"{owner}-{repo}-{number}-{secrets.token_hex(3)}")
    workspace = Workspace(session_id, workspace_base)
    root = workspace.setup(
        fork_url=str(fork.get("clone_url") or f"https://github.com/{fork_owner}/{repo}.git"),
        upstream_url=str(upstream.get("clone_url") or f"https://github.com/{owner}/{repo}.git"),
        base_branch=base_branch,
        work_branch=work_branch,
        token=await api._token(),
    )

    running = {
        "status": "running",
        "issue_url": issue_url,
        "key": key,
        "upstream_repo": f"{owner}/{repo}",
        "fork_repo": f"{fork_owner}/{repo}",
        "base_branch": base_branch,
        "branch": work_branch,
        "workspace": str(root),
        "test_mode": owned_test,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    store.write_json("solve.json", running)

    bundle = build_context_bundle(
        root,
        issue,
        guidance_names=list(policy["guidance_names"]),
        max_context_tokens=int(policy["max_context_tokens"]),
        max_file_tokens=int(policy["max_file_tokens"]),
    )
    plan = await plan_issue(router, issue, bundle.render(int(policy["max_context_tokens"])), policy)
    _budget_guard(router)
    validate_plan(plan, policy, set(tracked_files(root)))
    running["plan"] = plan.model_dump()
    store.write_json("solve.json", running)

    search_context = ""
    if plan.needs_search:
        search_context = await search_once(router, plan.search_query, issue)
        _budget_guard(router)

    commits: list[str] = []
    checks: list[dict] = []
    all_targets = {path for step in plan.steps for path in step.files}
    for step in plan.steps:
        if time.monotonic() - started >= int(policy["max_minutes"]) * 60:
            raise SolveRejected("Solve reached its wall-time limit")
        exact_paths = list(dict.fromkeys([*step.files, *plan.context_files]))
        exact_context = load_exact_context(
            root,
            exact_paths,
            guidance_names=list(policy["guidance_names"]),
            max_tokens=int(policy["max_context_tokens"]),
            max_file_tokens=int(policy["max_file_tokens"]),
        )
        implementation = await implement_step(
            router,
            issue=issue,
            step=step.model_dump(),
            exact_context=exact_context,
            search_context=search_context,
        )
        _budget_guard(router)
        changed = apply_edit_batch(root, implementation.edits, set(step.files))
        observed = set(changed_files(root))
        if not observed or not observed.issubset(set(step.files)):
            raise SolveRejected(f"working tree escaped planned files: {sorted(observed - set(step.files))}")
        if not set(changed).issubset(all_targets):
            raise SolveRejected("implementation escaped the full plan")

        for command in step.setup_commands[: int(policy["max_setup_commands"])]:
            result = run_verification(
                root,
                command,
                allowed_prefixes=list(policy["allowed_setup_prefixes"]),
                timeout=int(policy["command_timeout_seconds"]),
            )
            checks.append(
                {"kind": "setup", "command": command, "exit_code": result.code, "output": result.output}
            )
            if result.code != 0:
                raise SolveRejected(f"dependency setup failed: {command}")
        for command in step.verification_commands[: int(policy["max_test_commands"])]:
            result = run_verification(
                root,
                command,
                allowed_prefixes=list(policy["allowed_command_prefixes"]),
                timeout=int(policy["command_timeout_seconds"]),
            )
            checks.append(
                {"kind": "verification", "command": command, "exit_code": result.code, "output": result.output}
            )
            if result.code != 0:
                raise SolveRejected(f"verification failed: {command}")
        commits.append(commit_files(root, changed, step.commit_message))

    if git(root, "status", "--porcelain"):
        raise SolveRejected("workspace is not clean after step commits")
    diff = git(root, "diff", f"upstream/{base_branch}...HEAD", timeout=60)
    if not diff.strip():
        raise SolveRejected("Solve produced no diff")
    review = await review_diff(router, issue, plan, diff, checks)
    _budget_guard(router)
    if not review.approved or review.findings:
        raise SolveRejected("self-review rejected implementation: " + "; ".join(review.findings or [review.summary]))

    result = {
        **running,
        "status": "ready_to_submit",
        "title": str(issue.get("title") or ""),
        "issue_number": number,
        "plan": plan.model_dump(),
        "summary": review.summary,
        "target_files": sorted(all_targets),
        "checks": checks,
        "commits": commits,
        "head_sha": git(root, "rev-parse", "HEAD"),
        "review": review.model_dump(),
        "token_spent": router.budget.spent,
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }
    store.write_json("solve.json", result)
    return result
