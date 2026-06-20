"""MCP Tool: Validate task completion by running tests/lint/build."""

from __future__ import annotations

import asyncio
import os

from elixpo.mcp.base import BaseTool, ToolResult
from elixpo.config import settings


class TaskValidateTool(BaseTool):
    name = "task_validate"
    description = (
        "Validate that changes are correct by running tests, linting, or builds. "
        "Use this after making changes to verify they work."
    )
    parameters = {
        "type": "object",
        "properties": {
            "validation_type": {
                "type": "string",
                "enum": ["tests", "lint", "build", "custom"],
                "description": "Type of validation to run.",
            },
            "command": {
                "type": "string",
                "description": "Custom command to run (required for 'custom' type).",
            },
        },
        "required": ["validation_type"],
    }
    allowed_modes = {"edit"}

    # Default commands per validation type
    COMMANDS = {
        "tests": "python -m pytest --tb=short -q 2>&1 || npm test 2>&1 || echo 'No test runner found'",
        "lint": "ruff check . 2>&1 || npx eslint . 2>&1 || echo 'No linter found'",
        "build": "python -m py_compile *.py 2>&1 || npm run build 2>&1 || echo 'No build system found'",
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        validation_type = kwargs["validation_type"]
        command = kwargs.get("command")

        if validation_type == "custom":
            if not command:
                return ToolResult(success=False, output="", error="'command' is required for custom validation.")
        else:
            command = self.COMMANDS.get(validation_type, "echo 'Unknown validation type'")

        timeout = settings.sandbox.timeout

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.path.normpath(workspace_path),
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return ToolResult(success=False, output="", error=f"Validation timed out after {timeout}s.")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

        stdout_str = stdout.decode("utf-8", errors="replace")
        stderr_str = stderr.decode("utf-8", errors="replace")

        output = f"VALIDATION: {validation_type}\n"
        output += f"COMMAND: {command}\n"
        output += f"EXIT CODE: {proc.returncode}\n"
        if stdout_str:
            output += f"\nSTDOUT:\n{stdout_str}"
        if stderr_str:
            output += f"\nSTDERR:\n{stderr_str}"

        passed = proc.returncode == 0
        output += f"\nRESULT: {'PASSED' if passed else 'FAILED'}"

        return ToolResult(success=passed, output=output, error=stderr_str if not passed else None)
