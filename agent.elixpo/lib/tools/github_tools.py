"""MCP Tools: GitHub-specific operations (PR creation, commenting, reviews)."""

from __future__ import annotations

from elixpo.mcp.base import BaseTool, ToolResult


class GitPushTool(BaseTool):
    """Push commits to remote — used after git_commit to push changes."""
    name = "git_push"
    allowed_modes = {"edit"}
    description = "Push committed changes to the remote repository."
    parameters = {
        "type": "object",
        "properties": {
            "remote": {
                "type": "string",
                "description": "Remote name. Defaults to 'origin'.",
            },
            "branch": {
                "type": "string",
                "description": "Branch to push. Defaults to current branch.",
            },
        },
        "required": [],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        import asyncio
        remote = kwargs.get("remote", "origin")
        branch = kwargs.get("branch")

        args = ["git", "push", remote]
        if branch:
            args.append(branch)

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=workspace_path,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
        out = stdout.decode() + stderr.decode()

        if proc.returncode != 0:
            return ToolResult(success=False, output="", error=out)
        return ToolResult(success=True, output=out or "Push successful.")


class GitCloneTool(BaseTool):
    """Clone a repository into the workspace."""
    name = "git_clone"
    allowed_modes = {"edit"}
    description = "Clone a git repository into the workspace."
    parameters = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "Repository URL to clone.",
            },
            "branch": {
                "type": "string",
                "description": "Branch to checkout after clone. Optional.",
            },
            "depth": {
                "type": "integer",
                "description": "Shallow clone depth. Optional (omit for full clone).",
            },
        },
        "required": ["url"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        import asyncio
        url = kwargs["url"]
        branch = kwargs.get("branch")
        depth = kwargs.get("depth")

        args = ["git", "clone"]
        if depth:
            args.extend(["--depth", str(depth)])
        if branch:
            args.extend(["--branch", branch])
        args.extend([url, workspace_path])

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
        out = stdout.decode() + stderr.decode()

        if proc.returncode != 0:
            return ToolResult(success=False, output="", error=out)
        return ToolResult(success=True, output=out or f"Cloned {url} successfully.")
