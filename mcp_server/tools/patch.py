"""apply_patch — apply a unified diff to the workspace via `git apply`.

The token-efficient way to land multi-hunk / multi-file edits in one call (pairs
with rtk.diff_context, which produces diffs instead of whole files). Requires the
workspace to be a git repo (Solve clones the fork, so it is).
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path


def apply_patch(workspace: Path, diff: str) -> str:
    root = Path(workspace).resolve()
    with tempfile.NamedTemporaryFile("w", suffix=".patch", delete=False) as f:
        f.write(diff if diff.endswith("\n") else diff + "\n")
        patch_path = f.name
    try:
        # --3way lets it apply against drifted context; --whitespace=nowarn keeps output clean
        proc = subprocess.run(
            ["git", "apply", "--3way", "--whitespace=nowarn", patch_path],
            cwd=str(root),
            capture_output=True,
            text=True,
        )
    finally:
        Path(patch_path).unlink(missing_ok=True)
    if proc.returncode == 0:
        return "patch applied"
    return f"error applying patch:\n{(proc.stderr or proc.stdout).strip()[:1000]}"
