"""MCP Tool: Execute shell commands."""

from __future__ import annotations

import asyncio
import os

from elixpo.mcp.base import BaseTool, ToolResult
from elixpo.config import settings


class ShellExecTool(BaseTool):
    name = "shell_exec"
    description = (
        "Execute a shell command in the workspace directory. "
        "Returns stdout, stderr, and exit code. "
        "Commands are subject to a timeout."
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
        },
        "required": ["command"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        command = kwargs["command"]
        timeout = kwargs.get("timeout", settings.sandbox.timeout)

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
