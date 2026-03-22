"""MCP Tools: Git operations."""

from __future__ import annotations

import asyncio
import os

from elixpo.mcp.base import BaseTool, ToolResult


async def _run_git(workspace: str, *args: str, timeout: int = 30) -> tuple[int, str, str]:
    """Run a git command and return (returncode, stdout, stderr)."""
    proc = await asyncio.create_subprocess_exec(
        "git", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=workspace,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    return proc.returncode, stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace")


class GitStatusTool(BaseTool):
    name = "git_status"
    description = "Show the working tree status of the git repository."
    parameters = {"type": "object", "properties": {}, "required": []}

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        code, out, err = await _run_git(workspace_path, "status", "--short")
        if code != 0:
            return ToolResult(success=False, output="", error=err)
        return ToolResult(success=True, output=out or "(clean working tree)")


class GitDiffTool(BaseTool):
    name = "git_diff"
    description = "Show diffs — unstaged changes by default, or between specified refs."
    parameters = {
        "type": "object",
        "properties": {
            "staged": {
                "type": "boolean",
                "description": "Show staged changes (--cached). Defaults to false.",
            },
            "ref": {
                "type": "string",
                "description": "Git ref or range to diff (e.g., 'HEAD~3', 'main...feature').",
            },
        },
        "required": [],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        args = ["diff"]
        if kwargs.get("staged"):
            args.append("--cached")
        if kwargs.get("ref"):
            args.append(kwargs["ref"])
        args.append("--stat")

        code, out, err = await _run_git(workspace_path, *args)
        if code != 0:
            return ToolResult(success=False, output="", error=err)

        # Also get the actual diff (limited)
        full_args = ["diff"]
        if kwargs.get("staged"):
            full_args.append("--cached")
        if kwargs.get("ref"):
            full_args.append(kwargs["ref"])

        _, full_out, _ = await _run_git(workspace_path, *full_args)
        # Truncate large diffs
        if len(full_out) > 10000:
            full_out = full_out[:10000] + "\n... (diff truncated)"

        return ToolResult(success=True, output=f"{out}\n{full_out}")


class GitLogTool(BaseTool):
    name = "git_log"
    description = "Show recent commit history."
    parameters = {
        "type": "object",
        "properties": {
            "count": {
                "type": "integer",
                "description": "Number of commits to show. Defaults to 10.",
            },
            "oneline": {
                "type": "boolean",
                "description": "Use one-line format. Defaults to true.",
            },
        },
        "required": [],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        count = kwargs.get("count", 10)
        oneline = kwargs.get("oneline", True)
        args = ["log", f"-{count}"]
        if oneline:
            args.append("--oneline")
        code, out, err = await _run_git(workspace_path, *args)
        if code != 0:
            return ToolResult(success=False, output="", error=err)
        return ToolResult(success=True, output=out or "(no commits)")


class GitCommitTool(BaseTool):
    name = "git_commit"
    description = "Stage specified files (or all changes) and create a commit."
    parameters = {
        "type": "object",
        "properties": {
            "message": {
                "type": "string",
                "description": "Commit message.",
            },
            "files": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Files to stage. If empty, stages all changes.",
            },
        },
        "required": ["message"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        message = kwargs["message"]
        files = kwargs.get("files", [])

        if files:
            for f in files:
                code, _, err = await _run_git(workspace_path, "add", f)
                if code != 0:
                    return ToolResult(success=False, output="", error=f"Failed to stage {f}: {err}")
        else:
            code, _, err = await _run_git(workspace_path, "add", "-A")
            if code != 0:
                return ToolResult(success=False, output="", error=f"Failed to stage: {err}")

        code, out, err = await _run_git(workspace_path, "commit", "-m", message)
        if code != 0:
            return ToolResult(success=False, output="", error=err)
        return ToolResult(success=True, output=out)


class GitBranchTool(BaseTool):
    name = "git_branch"
    description = "List, create, or switch branches."
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["list", "create", "switch"],
                "description": "Action to perform. Defaults to 'list'.",
            },
            "name": {
                "type": "string",
                "description": "Branch name (required for create/switch).",
            },
        },
        "required": [],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        action = kwargs.get("action", "list")
        name = kwargs.get("name")

        if action == "list":
            code, out, err = await _run_git(workspace_path, "branch", "-a")
            if code != 0:
                return ToolResult(success=False, output="", error=err)
            return ToolResult(success=True, output=out or "(no branches)")

        if not name:
            return ToolResult(success=False, output="", error="Branch name is required.")

        if action == "create":
            code, out, err = await _run_git(workspace_path, "checkout", "-b", name)
        elif action == "switch":
            code, out, err = await _run_git(workspace_path, "checkout", name)
        else:
            return ToolResult(success=False, output="", error=f"Unknown action: {action}")

        if code != 0:
            return ToolResult(success=False, output="", error=err)
        return ToolResult(success=True, output=out or f"Switched to branch '{name}'")
