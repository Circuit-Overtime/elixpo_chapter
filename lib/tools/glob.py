"""MCP Tool: Find files by glob pattern."""

from __future__ import annotations

import fnmatch
import os

from elixpo.mcp.base import BaseTool, ToolResult


class GlobTool(BaseTool):
    name = "glob"
    description = (
        "Find files matching a glob pattern in the workspace. "
        "Supports patterns like '**/*.py', 'src/**/*.ts', etc."
    )
    parameters = {
        "type": "object",
        "properties": {
            "pattern": {
                "type": "string",
                "description": "Glob pattern to match files against (e.g., '**/*.py').",
            },
            "path": {
                "type": "string",
                "description": "Directory to search in (relative to workspace). Defaults to '.'.",
            },
        },
        "required": ["pattern"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        pattern = kwargs["pattern"]
        search_path = kwargs.get("path", ".")

        full_path = os.path.normpath(os.path.join(workspace_path, search_path))
        if not full_path.startswith(os.path.normpath(workspace_path)):
            return ToolResult(success=False, output="", error="Path traversal not allowed.")

        skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next"}
        matches = []
        max_results = 500

        for root, dirs, files in os.walk(full_path):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for fname in files:
                fpath = os.path.join(root, fname)
                rel = os.path.relpath(fpath, workspace_path)
                if fnmatch.fnmatch(rel, pattern) or fnmatch.fnmatch(fname, pattern):
                    matches.append(rel)
                    if len(matches) >= max_results:
                        break
            if len(matches) >= max_results:
                break

        if not matches:
            return ToolResult(success=True, output="No files matched the pattern.")

        truncated = f"\n(truncated at {max_results})" if len(matches) >= max_results else ""
        return ToolResult(
            success=True,
            output=f"Found {len(matches)} file(s):\n" + "\n".join(matches) + truncated,
        )
