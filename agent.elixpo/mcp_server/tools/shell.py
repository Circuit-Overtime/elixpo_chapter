"""Shell + git tools. Output runs through rtk (token compression) and a
truncation governor so build/test logs can't blow the budget.
"""

from __future__ import annotations

import shlex
from pathlib import Path

from rtk.shell import run as rtk_run
from rtk.truncate import truncate_text

MAX_OUTPUT_TOKENS = 4000


def run_shell(workspace: Path, command: str, max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
    res = rtk_run(shlex.split(command), cwd=str(workspace))
    body = truncate_text(res.output, max_tokens)
    tag = "" if res.compressed else " (uncompressed: rtk CLI not found)"
    return f"[exit {res.code}]{tag}\n{body}"


def git(workspace: Path, args: str, max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
    return run_shell(workspace, f"git {args}", max_tokens)
