"""Optional OS boundary for target-repository commands."""

from __future__ import annotations

import functools
import shutil
import subprocess
from pathlib import Path


@functools.lru_cache(maxsize=1)
def bubblewrap_available() -> bool:
    executable = shutil.which("bwrap")
    if not executable:
        return False
    probe = subprocess.run(
        [executable, "--ro-bind", "/", "/", "--unshare-user", "--", "/bin/true"],
        capture_output=True,
        timeout=5,
        check=False,
    )
    return probe.returncode == 0


def sandbox_command(workspace: Path, args: list[str], *, network: bool) -> tuple[list[str], str]:
    """Wrap argv in a workspace-only Linux sandbox when the host supports it."""
    executable = shutil.which("bwrap")
    if not executable or not bubblewrap_available():
        return args, "process"

    command = [
        executable,
        "--die-with-parent",
        "--new-session",
        "--unshare-user",
        "--unshare-pid",
        "--unshare-uts",
        "--unshare-ipc",
    ]
    if not network:
        command.append("--unshare-net")
    for path in ("/usr", "/bin", "/lib", "/lib64", "/opt", "/etc"):
        if Path(path).exists():
            command.extend(["--ro-bind", path, path])
    command.extend(
        [
            "--proc",
            "/proc",
            "--dev",
            "/dev",
            "--tmpfs",
            "/tmp",
            "--dir",
            "/workspace",
            "--bind",
            str(workspace.resolve()),
            "/workspace",
        ]
    )
    git_dir = workspace / ".git"
    if git_dir.is_dir():
        command.extend(["--ro-bind", str(git_dir.resolve()), "/workspace/.git"])
    command.extend(["--chdir", "/workspace", "--", *args])
    return command, "bubblewrap"
