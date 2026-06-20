"""Workspace manager — isolated directory per session."""

from __future__ import annotations

import asyncio
import os
import shutil

import structlog

log = structlog.get_logger()


class Workspace:
    """Manages an isolated workspace directory for a session."""

    def __init__(self, session_id: str, base_path: str):
        self.session_id = session_id
        self.base_path = base_path
        self.root = os.path.join(base_path, session_id)

    async def setup(self, clone_url: str | None = None, branch: str | None = None) -> str:
        """Create workspace dir, optionally clone a repo into it."""
        os.makedirs(self.root, exist_ok=True)

        if clone_url:
            cmd = f"git clone --depth 1"
            if branch:
                cmd += f" --branch {branch}"
            cmd += f" {clone_url} {self.root}"
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                log.error("workspace.clone_failed", error=stderr.decode())

        log.info("workspace.setup", path=self.root)
        return self.root

    async def cleanup(self) -> None:
        """Remove the workspace directory."""
        if os.path.isdir(self.root):
            shutil.rmtree(self.root, ignore_errors=True)
            log.info("workspace.cleanup", path=self.root)

    def exists(self) -> bool:
        return os.path.isdir(self.root)
