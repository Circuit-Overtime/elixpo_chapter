"""Detect and apply one bounded PR follow-up correction on the recorded fork branch."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import structlog
from lib.github.issues import parse_issue_url
from lib.state.followups import FollowupRecord
from lib.state.ledger import Ledger
from lib.workspace import Workspace, git_auth_env
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from rtk.models import FunctionDef, Message, ToolDef
from rtk.truncate import truncate_text

from agents.steward.respond import safety_check

log = structlog.get_logger()
_FAILED_CONCLUSIONS = {"action_required", "cancelled", "failure", "startup_failure", "timed_out"}
_SAFE_PATH = re.compile(r"[A-Za-z0-9_./@+\-]+")
_CONVENTIONAL = re.compile(r"^(fix|feat|docs|test|refactor|ci|chore)(\([^)]+\))?: .+")
_SKILL_PATH = Path(__file__).resolve().parents[2] / "skills" / "address-pr-followup" / "SKILL.md"


class StewardFixRejected(RuntimeError):
    pass


class Replacement(BaseModel):
    model_config = ConfigDict(extra="forbid")
    old: str = Field(min_length=1, max_length=5000)
    new: str = Field(max_length=7000)


class FollowupEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str
    operation: Literal["replace"] = "replace"
    replacements: list[Replacement] = Field(min_length=1, max_length=8)


class FixImplementation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=1, max_length=500)
    commit_message: str = Field(min_length=1, max_length=120)
    edits: list[FollowupEdit] = Field(min_length=1, max_length=5)


class FixReview(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approved: bool
    summary: str = Field(min_length=1, max_length=500)
    findings: list[str] = Field(default_factory=list, max_length=5)


def _tool(name: str, description: str, model: type[BaseModel]) -> ToolDef:
    return ToolDef(function=FunctionDef(name=name, description=description, parameters=model.model_json_schema()))


def _parse_tool(response, model: type[BaseModel]):
    calls = response.choices[0].message.tool_calls or []
    if not calls:
        raise StewardFixRejected("model did not return the required structured result")
    try:
        return model.model_validate_json(calls[0].function.arguments)
    except (ValidationError, json.JSONDecodeError) as exc:
        raise StewardFixRejected(f"invalid structured follow-up result: {exc}") from exc


def build_fix_action(pull: dict, reviews: list[dict], checks: list[dict]) -> dict | None:
    """Create one stable action from current review state and failing checks."""
    head_sha = str((pull.get("head") or {}).get("sha") or "")
    if not head_sha:
        return None
    latest_by_author: dict[str, dict] = {}
    for review in sorted(reviews, key=lambda item: str(item.get("submitted_at") or "")):
        author = str((review.get("user") or {}).get("login") or review.get("id") or "")
        if author:
            latest_by_author[author.casefold()] = review
    requested = [
        review
        for review in latest_by_author.values()
        if str(review.get("state") or "").casefold() == "changes_requested"
    ]
    latest_checks: dict[str, dict] = {}
    for check in sorted(checks, key=lambda item: int(item.get("id") or 0)):
        identity = f"{(check.get('app') or {}).get('slug', '')}:{check.get('name', '')}"
        latest_checks[identity] = check
    failed = [
        check
        for check in latest_checks.values()
        if str(check.get("status") or "").casefold() == "completed"
        and str(check.get("conclusion") or "").casefold() in _FAILED_CONCLUSIONS
    ]
    if not requested and not failed:
        return None
    evidence = {
        "head_sha": head_sha,
        "review_ids": sorted(int(item.get("id") or 0) for item in requested),
        "check_ids": sorted(int(item.get("id") or 0) for item in failed),
    }
    fingerprint = hashlib.sha256(json.dumps(evidence, sort_keys=True).encode()).hexdigest()[:20]
    return {
        "kind": "fix",
        "fingerprint": fingerprint,
        "head_sha": head_sha,
        "review_ids": evidence["review_ids"],
        "check_ids": evidence["check_ids"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _run(workspace: Path, args: list[str], *, timeout: int = 180, env: dict[str, str] | None = None) -> str:
    process = subprocess.run(
        args,
        cwd=workspace,
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if process.returncode:
        output = (process.stderr or process.stdout).strip()
        raise StewardFixRejected(f"command failed ({shlex.join(args)}): {output[:1600]}")
    return process.stdout.strip()


def _verification_env() -> dict[str, str]:
    """Expose runtime basics but never agent or provider credentials to target code."""
    allowed = ("PATH", "LANG", "LC_ALL", "SYSTEMROOT", "COMSPEC", "PATHEXT", "VIRTUAL_ENV")
    env = {name: os.environ[name] for name in allowed if name in os.environ}
    env.update(
        {
            "CI": "true",
            "GIT_TERMINAL_PROMPT": "0",
            "NO_COLOR": "1",
            "HOME": "/tmp",
            "TMPDIR": "/tmp",
            "NODE_OPTIONS": "--max-old-space-size=768",
            "npm_config_audit": "false",
            "npm_config_fund": "false",
            "npm_config_maxsockets": "4",
        }
    )
    return env


def _candidate_paths(workspace: Path, files: list[dict], *, max_files: int = 5) -> list[str]:
    paths: list[str] = []
    for item in files:
        path = str(item.get("filename") or "")
        candidate = Path(path)
        if (
            not path
            or path in paths
            or not _SAFE_PATH.fullmatch(path)
            or candidate.is_absolute()
            or ".." in candidate.parts
            or candidate.parts[0] == ".git"
        ):
            continue
        target = workspace / candidate
        if target.is_file() and not target.is_symlink():
            paths.append(path)
        if len(paths) >= max_files:
            break
    if not paths:
        raise StewardFixRejected("PR has no safe existing changed files for a bounded follow-up")
    return paths


def _exact_context(workspace: Path, paths: list[str], *, max_tokens: int = 9000) -> str:
    per_file = max(600, max_tokens // len(paths))
    parts = []
    for path in paths:
        text = (workspace / path).read_text(encoding="utf-8", errors="replace")
        parts.append(f"// FILE: {path}\n{truncate_text(text, max_tokens=per_file)}")
    return truncate_text("\n\n".join(parts), max_tokens=max_tokens)


def _feedback(reviews: list[dict], comments: list[dict], checks: list[dict], action: dict) -> list[dict]:
    review_ids = set(action.get("review_ids") or [])
    check_ids = set(action.get("check_ids") or [])
    result: list[dict] = []
    for review in reviews:
        if int(review.get("id") or 0) in review_ids:
            result.append(
                {
                    "kind": "review",
                    "author": (review.get("user") or {}).get("login", ""),
                    "body": truncate_text(str(review.get("body") or ""), max_tokens=700),
                }
            )
    for comment in comments[-20:]:
        review_id = int(comment.get("pull_request_review_id") or 0)
        if review_id not in review_ids:
            continue
        result.append(
            {
                "kind": "inline_comment",
                "author": (comment.get("user") or {}).get("login", ""),
                "path": comment.get("path", ""),
                "line": comment.get("line") or comment.get("original_line"),
                "body": truncate_text(str(comment.get("body") or ""), max_tokens=500),
            }
        )
    for check in checks:
        if int(check.get("id") or 0) in check_ids:
            output = check.get("output") or {}
            result.append(
                {
                    "kind": "check",
                    "name": check.get("name", ""),
                    "conclusion": check.get("conclusion", ""),
                    "summary": truncate_text(str(output.get("summary") or output.get("text") or ""), max_tokens=700),
                }
            )
    return result


async def _implementation(
    router,
    record: FollowupRecord,
    paths: list[str],
    context: str,
    feedback: list[dict],
    diff: str,
):
    name = "record_steward_fix"
    payload = {
        "pull_request": {
            "repository": record.repository,
            "number": record.subject_number,
            "title": record.title,
            "branch": record.branch,
        },
        "requested_delta": feedback,
        "current_pr_diff": truncate_text(diff, max_tokens=3000),
        "allowed_paths": paths,
        "exact_current_files": context,
        "rules": [
            "Resolve only the concrete requested changes or failing checks.",
            "Edit only allowed_paths with exact unique replacements.",
            "Preserve unrelated behavior and do not refactor opportunistically.",
            "Return one conventional commit and one atomic structured edit batch.",
        ],
    }
    response = await router.call(
        "code",
        [
            Message(
                role="system",
                content=(_SKILL_PATH.read_text(encoding="utf-8") + "\nReturn the fix."),
            ),
            Message(role="user", content=json.dumps(payload, separators=(",", ":"))),
        ],
        tools=[_tool(name, "Record the exact bounded PR follow-up edit.", FixImplementation)],
        tool_choice={"type": "function", "function": {"name": name}},
        effort="low",
        max_tokens=4200,
    )
    return _parse_tool(response, FixImplementation)


def _apply(workspace: Path, implementation: FixImplementation, allowed: set[str]) -> list[str]:
    rendered: dict[Path, str] = {}
    originals: dict[Path, str] = {}
    for edit in implementation.edits:
        if edit.path not in allowed:
            raise StewardFixRejected(f"model attempted an ungrounded file: {edit.path}")
        target = (workspace / edit.path).resolve()
        if workspace.resolve() not in target.parents or not target.is_file() or target.is_symlink():
            raise StewardFixRejected(f"unsafe follow-up edit target: {edit.path}")
        if target in rendered:
            raise StewardFixRejected(f"duplicate follow-up edit target: {edit.path}")
        text = target.read_text(encoding="utf-8")
        originals[target] = text
        for replacement in edit.replacements:
            count = text.count(replacement.old)
            if count != 1:
                raise StewardFixRejected(f"replacement context occurs {count} times in {edit.path}")
            text = text.replace(replacement.old, replacement.new, 1)
        rendered[target] = text
    try:
        for target, text in rendered.items():
            target.write_text(text, encoding="utf-8")
    except Exception:
        for target, text in originals.items():
            target.write_text(text, encoding="utf-8")
        raise
    return [str(path.relative_to(workspace)) for path in rendered]


def _verification_commands(workspace: Path, changed: list[str]) -> list[list[str]]:
    suffixes = {Path(path).suffix.casefold() for path in changed}
    commands: list[list[str]] = []
    package_path = workspace / "package.json"
    if suffixes & {".js", ".jsx", ".ts", ".tsx"} and package_path.is_file():
        package = json.loads(package_path.read_text(encoding="utf-8"))
        scripts = package.get("scripts") or {}
        if (workspace / "pnpm-lock.yaml").is_file():
            manager = "pnpm"
        elif (workspace / "yarn.lock").is_file():
            manager = "yarn"
        else:
            manager = "npm"
        for name in ("typecheck", "check", "lint", "test"):
            if name in scripts:
                commands.append([manager, "run", name] if manager == "npm" else [manager, name])
                break
        if not commands and (workspace / "tsconfig.json").is_file():
            commands.append(["./node_modules/.bin/tsc", "--noEmit"])
    if ".py" in suffixes:
        command = (
            ["python", "-m", "pytest"]
            if (workspace / "tests").is_dir()
            else ["python", "-m", "compileall", *changed]
        )
        commands.append(command)
    shell = [path for path in changed if Path(path).suffix.casefold() in {".sh", ".bash"}]
    commands.extend([["bash", "-n", path] for path in shell])
    workflows = [path for path in changed if Path(path).parts[:2] == (".github", "workflows")]
    if workflows and shutil.which("actionlint"):
        commands.append(["actionlint", *workflows])
    yaml_files = [path for path in changed if Path(path).suffix.casefold() in {".yaml", ".yml"}]
    if yaml_files and not workflows and shutil.which("yamllint"):
        commands.append(["yamllint", *yaml_files])
    plain_javascript = [path for path in changed if Path(path).suffix.casefold() in {".js", ".mjs", ".cjs"}]
    if plain_javascript and not any(command[0] in {"npm", "pnpm", "yarn"} for command in commands):
        commands.extend([["node", "--check", path] for path in plain_javascript])
    if not commands:
        raise StewardFixRejected("no language-specific verification command could be inferred")
    return commands[:3]


def _setup_command(workspace: Path, changed: list[str]) -> list[str] | None:
    suffixes = {Path(path).suffix.casefold() for path in changed}
    if suffixes & {".js", ".jsx", ".ts", ".tsx"}:
        if (workspace / "pnpm-lock.yaml").is_file():
            return ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"]
        if (workspace / "yarn.lock").is_file():
            return ["yarn", "install", "--immutable", "--ignore-scripts"]
        if (workspace / "package-lock.json").is_file() or (workspace / "npm-shrinkwrap.json").is_file():
            return ["npm", "ci", "--ignore-scripts"]
    if ".py" in suffixes and (workspace / "pyproject.toml").is_file():
        return ["python", "-m", "pip", "install", "-e", "."]
    return None


async def _review(router, record: FollowupRecord, feedback: list[dict], diff: str, checks: list[dict]) -> FixReview:
    name = "record_steward_fix_review"
    response = await router.call(
        "review",
        [
            Message(
                role="system",
                content=(
                    "Review a bounded PR follow-up. Approve only if the new diff resolves every concrete "
                    "request and failed-check cause without unrelated changes. Record a structured verdict."
                ),
            ),
            Message(
                role="user",
                content=json.dumps(
                    {
                        "pull_request": record.subject_url,
                        "requested_delta": feedback,
                        "new_diff": truncate_text(diff, max_tokens=4000),
                        "checks": checks,
                    },
                    separators=(",", ":"),
                ),
            ),
        ],
        tools=[_tool(name, "Record the independent follow-up review.", FixReview)],
        tool_choice={"type": "function", "function": {"name": name}},
        effort="low",
        max_tokens=700,
    )
    return _parse_tool(response, FixReview)


async def fix_one(api, gist, router, store, *, key: str, fingerprint: str, workspace_base: Path) -> dict:
    memory = await gist.load()
    record = memory.active.get(key)
    if record is None or record.subject_kind != "pull_request":
        raise StewardFixRejected("follow-up record is missing or is not a pull request")
    action = dict(record.pending_action)
    if action.get("kind") != "fix" or action.get("fingerprint") != fingerprint:
        raise StewardFixRejected("stale or mismatched follow-up action")
    if record.fix_attempts.get(fingerprint, 0) >= 1:
        raise StewardFixRejected("this follow-up fingerprint already used its single fix attempt")
    owner, repo = record.repository.split("/", 1)
    pull = await api.get_pull(owner, repo, record.subject_number)
    if str((pull.get("head") or {}).get("sha") or "") != action.get("head_sha"):
        raise StewardFixRejected("pull request head changed after the fix receipt was created")
    reviews = await api.get_pull_reviews(owner, repo, record.subject_number)
    checks = await api.get_check_runs(owner, repo, action["head_sha"])
    current = build_fix_action(pull, reviews, checks)
    if current is None or current["fingerprint"] != fingerprint:
        raise StewardFixRejected("requested changes or failing checks changed before execution")
    comments = await api.get_pull_comments(owner, repo, record.subject_number)
    files = await api.get_pull_files(owner, repo, record.subject_number)
    if not record.fork_repository or not record.branch:
        raise StewardFixRejected("follow-up memory lacks the fork branch identity")

    workspace = Workspace(f"steward-{record.subject_number}-{uuid.uuid4().hex[:8]}", workspace_base)
    root = workspace.setup_existing_branch(
        fork_url=f"https://github.com/{record.fork_repository}.git",
        upstream_url=f"https://github.com/{record.repository}.git",
        branch=record.branch,
        token=await api._token(),
    )
    receipt = {
        "schema_version": 1,
        "status": "running",
        "key": key,
        "fingerprint": fingerprint,
        "workspace": str(root),
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    store.write_json("steward_fix.json", receipt)
    try:
        paths = _candidate_paths(root, files)
        feedback = _feedback(reviews, comments, checks, action)
        original_diff = await api.get_pull_diff(owner, repo, record.subject_number)
        implementation = await _implementation(
            router,
            record,
            paths,
            _exact_context(root, paths),
            feedback,
            original_diff,
        )
        if not _CONVENTIONAL.fullmatch(implementation.commit_message.strip()):
            raise StewardFixRejected("follow-up commit message is not conventional")
        changed = _apply(root, implementation, set(paths))
        diff = _run(root, ["git", "diff", "--unified=40", "--", *changed])
        if not diff:
            raise StewardFixRejected("follow-up edit produced no diff")
        check_receipts = []
        setup = _setup_command(root, changed)
        if setup:
            _run(root, setup, timeout=300, env=_verification_env())
        for command in _verification_commands(root, changed):
            output = _run(root, command, timeout=240, env=_verification_env())
            check_receipts.append({"command": shlex.join(command), "status": "passed", "output": output[-1000:]})
        verdict = await _review(router, record, feedback, diff, check_receipts)
        if not verdict.approved or verdict.findings:
            raise StewardFixRejected("follow-up semantic review rejected: " + "; ".join(verdict.findings[:3]))
        _run(root, ["git", "add", "--", *changed])
        _run(root, ["git", "commit", "-m", implementation.commit_message.strip()])
        head_sha = _run(root, ["git", "rev-parse", "HEAD"])
        _run(
            root,
            ["git", "push", "origin", f"HEAD:{record.branch}"],
            env=git_auth_env(await api._token()),
        )
        record.head_sha = head_sha
        record.last_fix_fingerprint = fingerprint
        record.fix_attempts[fingerprint] = 1
        record.status = "awaiting_review"
        record.clear_action()
        memory.upsert(record)
        await gist.save(memory)
        if record.issue_url:
            issue_owner, issue_repo, issue_number = parse_issue_url(record.issue_url)
            ledger = Ledger.load(store)
            ledger.set_status(
                f"{issue_owner}/{issue_repo}#{issue_number}",
                "awaiting_review",
                datetime.now(timezone.utc).isoformat(),
            )
            ledger.save(store)
        body = (
            f"Automated follow-up pushed `{head_sha[:8]}` with the requested changes. "
            f"Verified: {', '.join(item['command'] for item in check_receipts)}."
        )
        comment_error = ""
        try:
            await safety_check(router, body)
            await api.create_issue_comment(owner, repo, record.subject_number, body)
        except Exception as exc:
            comment_error = str(exc)[:500]
        receipt.update(
            {
                "status": "complete",
                "head_sha": head_sha,
                "changed_files": changed,
                "checks": check_receipts,
                "summary": implementation.summary,
                "comment_error": comment_error,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        store.write_json("steward_fix.json", receipt)
        return receipt
    except Exception as exc:
        record.fix_attempts[fingerprint] = record.fix_attempts.get(fingerprint, 0) + 1
        record.status = "fix_failed"
        record.last_error = str(exc)[:500]
        memory.upsert(record)
        await gist.save(memory)
        if record.issue_url:
            issue_owner, issue_repo, issue_number = parse_issue_url(record.issue_url)
            ledger = Ledger.load(store)
            ledger.set_status(
                f"{issue_owner}/{issue_repo}#{issue_number}",
                "changes_requested",
                datetime.now(timezone.utc).isoformat(),
            )
            ledger.save(store)
        receipt.update({"status": "failed", "error": str(exc)[:1000]})
        store.write_json("steward_fix.json", receipt)
        raise
    finally:
        workspace.cleanup()


async def _run_cli(key: str, fingerprint: str) -> int:
    from lib.config import settings
    from lib.github.api import GitHubAPI
    from lib.github.gists import FollowupGist
    from lib.state.store import StateStore
    from rtk import Budget, Router

    if not settings.github.solver_token or not settings.followups.gist_token or not settings.followups.gist_id:
        log.error("steward.fix_missing_credentials")
        return 1
    github = GitHubAPI.from_token(settings.github.solver_token)
    gist_api = GitHubAPI.from_token(settings.followups.gist_token)
    router = Router.from_settings("steward_fix", budget=Budget("steward_fix", limit=50_000))
    try:
        result = await fix_one(
            github,
            FollowupGist(gist_api, settings.followups.gist_id),
            router,
            StateStore(settings.state_dir),
            key=key,
            fingerprint=fingerprint,
            workspace_base=Path(os.getenv("ELIXPO_WORKSPACE_DIR", "/tmp/elixpoo-workspaces")),
        )
    except Exception as exc:
        log.error("steward.fix_failed", error=str(exc))
        return 1
    finally:
        await github.close()
        await gist_api.close()
        await router.aclose()
    log.info("steward.fix_done", key=key, head_sha=result["head_sha"])
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply one bounded PR follow-up fix")
    parser.add_argument("--key", required=True)
    parser.add_argument("--fingerprint", required=True)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run_cli(args.key, args.fingerprint)))


if __name__ == "__main__":
    main()
