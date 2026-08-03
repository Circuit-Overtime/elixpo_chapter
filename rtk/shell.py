"""Run runner commands through the `rtk` CLI (Rust Token Killer) so build/test
output is token-compressed before it ever enters context — the single biggest
saver for a coding agent. Falls back to a raw run if `rtk` isn't on PATH.
"""

from __future__ import annotations

import shutil
import subprocess
from collections.abc import Mapping
from dataclasses import dataclass


@dataclass
class CmdResult:
    code: int
    output: str
    compressed: bool  # True if routed through the rtk CLI


def _has_rtk() -> bool:
    return shutil.which("rtk") is not None


def run(
    cmd: list[str],
    cwd: str | None = None,
    timeout: int = 600,
    env: Mapping[str, str] | None = None,
) -> CmdResult:
    """Execute `cmd`. If the rtk CLI exists, prefix it so output is compressed."""
    compressed = _has_rtk()
    full = (["rtk", *cmd]) if compressed else cmd
    proc = subprocess.run(
        full, cwd=cwd, timeout=timeout, capture_output=True, text=True, env=env
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    return CmdResult(code=proc.returncode, output=out, compressed=compressed)
