"""Bounded git and verification operations for an isolated Solve workspace."""

from __future__ import annotations

import os
import re
import shlex
import subprocess
from pathlib import Path

from rtk.shell import CmdResult
from rtk.shell import run as rtk_run
from rtk.truncate import truncate_text

from agents.solve.sandbox import sandbox_command

_CONVENTIONAL = re.compile(r"^(feat|fix|refactor|docs|test|chore|ci|perf|build)(\([^)]+\))?: .+")
_CONTROL_TOKENS = {";", "&&", "||", "|", ">", ">>", "<", "`"}


class CommandRejected(RuntimeError):
    pass


def _github_remote_repo(url: str) -> str:
    match = re.search(r"github\.com[:/]([^/\s]+/[^/\s]+?)(?:\.git)?$", url.strip(), re.IGNORECASE)
    if not match:
        raise RuntimeError(f"unsupported GitHub remote URL: {url[:200]}")
    return match.group(1).removesuffix(".git").casefold()


def git(workspace: Path, *args: str, timeout: int = 60) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=workspace,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip()[:2000])
    return proc.stdout.strip()


def changed_files(workspace: Path, *, cached: bool = False) -> list[str]:
    args = ["diff", "--name-only"]
    if cached:
        args.append("--cached")
    found = git(workspace, *args).splitlines()
    if not cached:
        untracked = git(workspace, "ls-files", "--others", "--exclude-standard").splitlines()
        found.extend(path for path in untracked if path not in found)
    return found


def assert_workspace_identity(
    workspace: Path,
    *,
    fork_repo: str,
    upstream_repo: str,
    branch: str,
) -> None:
    """Fail closed unless edits are occurring on the expected fork branch."""
    origin = _github_remote_repo(git(workspace, "remote", "get-url", "origin"))
    upstream = _github_remote_repo(git(workspace, "remote", "get-url", "upstream"))
    current_branch = git(workspace, "branch", "--show-current")
    if origin != fork_repo.casefold():
        raise RuntimeError(f"workspace origin is {origin}, expected fork {fork_repo}")
    if upstream != upstream_repo.casefold():
        raise RuntimeError(f"workspace upstream is {upstream}, expected {upstream_repo}")
    if current_branch != branch:
        raise RuntimeError(f"workspace branch is {current_branch}, expected {branch}")
    if origin == upstream:
        raise RuntimeError("workspace origin and upstream must be different repositories")


def validate_command(command: str, allowed_prefixes: list[str]) -> list[str]:
    args = shlex.split(command)
    if not args or any(token in _CONTROL_TOKENS for token in args):
        raise CommandRejected(f"unsafe verification command: {command}")
    allowed = any(args[: len(prefix)] == prefix for prefix in (shlex.split(item) for item in allowed_prefixes))
    if not allowed:
        raise CommandRejected(f"verification command is not allowlisted: {command}")
    return args


def run_verification(
    workspace: Path,
    command: str,
    *,
    allowed_prefixes: list[str],
    timeout: int,
    node_heap_mb: int = 512,
    network: bool = False,
) -> CmdResult:
    args = validate_command(command, allowed_prefixes)
    inherited = ("PATH", "LANG", "LC_ALL", "TMPDIR", "VIRTUAL_ENV", "SYSTEMROOT", "COMSPEC", "PATHEXT")
    env = {key: os.environ[key] for key in inherited if key in os.environ}
    heap_mb = max(256, min(int(node_heap_mb), 2048))
    env.update(
        {
            "CI": "true",
            "GIT_TERMINAL_PROMPT": "0",
            "NO_COLOR": "1",
            "NODE_OPTIONS": f"--max-old-space-size={heap_mb}",
            "npm_config_maxsockets": "4",
            "npm_config_audit": "false",
            "npm_config_fund": "false",
            "HOME": "/tmp",
            "TMPDIR": "/tmp",
        }
    )
    supervised_args, backend = sandbox_command(workspace, args, network=network)
    result = rtk_run(supervised_args, cwd=str(workspace), timeout=timeout, env=env)
    result.output = f"[sandbox={backend}]\n{result.output}"
    result.output = truncate_text(result.output, max_tokens=1800)
    return result


def commit_files(workspace: Path, files: list[str], message: str) -> str:
    if not _CONVENTIONAL.fullmatch(message.strip()):
        raise CommandRejected(f"non-conventional commit message: {message}")
    git(workspace, "add", "--", *files)
    staged = set(changed_files(workspace, cached=True))
    if not staged:
        raise RuntimeError("implementation step produced no staged changes")
    if not staged.issubset(set(files)):
        raise RuntimeError(f"step staged unplanned files: {sorted(staged - set(files))}")
    git(workspace, "commit", "-m", message.strip())
    return git(workspace, "rev-parse", "HEAD")
