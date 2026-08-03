"""Bounded git and verification operations for an isolated Solve workspace."""

from __future__ import annotations

import os
import re
import shlex
import subprocess
from pathlib import Path

from rtk.shell import CmdResult, run as rtk_run
from rtk.truncate import truncate_text

_CONVENTIONAL = re.compile(r"^(feat|fix|refactor|docs|test|chore|ci|perf|build)(\([^)]+\))?: .+")
_CONTROL_TOKENS = {";", "&&", "||", "|", ">", ">>", "<", "`"}


class CommandRejected(RuntimeError):
    pass


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
) -> CmdResult:
    args = validate_command(command, allowed_prefixes)
    inherited = ("PATH", "LANG", "LC_ALL", "TMPDIR", "VIRTUAL_ENV", "SYSTEMROOT", "COMSPEC", "PATHEXT")
    env = {key: os.environ[key] for key in inherited if key in os.environ}
    env.update({"CI": "true", "GIT_TERMINAL_PROMPT": "0", "NO_COLOR": "1"})
    result = rtk_run(args, cwd=str(workspace), timeout=timeout, env=env)
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
