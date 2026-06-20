"""MCP Tool: Execute shell commands with mode-aware safety."""

from __future__ import annotations

import asyncio
import os

from elixpo.mcp.base import BaseTool, ToolResult
from elixpo.config import settings

MAX_OUTPUT_LINES = 500


class ShellExecTool(BaseTool):
    name = "shell_exec"
    description = (
        "Execute a shell command in the workspace directory. "
        "Returns stdout, stderr, and exit code. "
        "In PLAN mode, only read-only commands are allowed. "
        "This is the primary tool for interacting with the system."
    )
    parameters = {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The shell command to execute.",
            },
            "timeout": {
                "type": "integer",
                "description": "Timeout in seconds. Defaults to sandbox timeout setting.",
            },
            "description": {
                "type": "string",
                "description": "Brief description of what this command does.",
            },
        },
        "required": ["command"],
    }
    allowed_modes = {"plan", "edit"}

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        command = kwargs["command"]
        timeout = kwargs.get("timeout", settings.sandbox.timeout)

        # Mode-aware safety check
        if self._context and self._context.mode_controller and self._context.current_mode:
            allowed, reason = self._context.mode_controller.filter_bash_for_mode(
                command, self._context.current_mode
            )
            if not allowed:
                return ToolResult(success=False, output="", error=reason)

        full_workspace = os.path.normpath(workspace_path)

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=full_workspace,
                env={**os.environ, "HOME": full_workspace},
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return ToolResult(
                success=False,
                output="",
                error=f"Command timed out after {timeout}s.",
            )
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

        stdout_str = stdout.decode("utf-8", errors="replace")
        stderr_str = stderr.decode("utf-8", errors="replace")

        # Truncate very long output
        stdout_str = _truncate_output(stdout_str)
        stderr_str = _truncate_output(stderr_str)

        output_parts = []
        if stdout_str:
            output_parts.append(f"STDOUT:\n{stdout_str}")
        if stderr_str:
            output_parts.append(f"STDERR:\n{stderr_str}")
        output_parts.append(f"EXIT CODE: {proc.returncode}")

        return ToolResult(
            success=proc.returncode == 0,
            output="\n".join(output_parts),
            error=stderr_str if proc.returncode != 0 else None,
        )


def _truncate_output(text: str) -> str:
    """Truncate output that exceeds MAX_OUTPUT_LINES."""
    lines = text.splitlines()
    if len(lines) <= MAX_OUTPUT_LINES:
        return text

    keep = MAX_OUTPUT_LINES // 2
    head = lines[:keep]
    tail = lines[-keep:]
    omitted = len(lines) - MAX_OUTPUT_LINES
    return "\n".join(head + [f"\n... ({omitted} lines omitted) ...\n"] + tail)
