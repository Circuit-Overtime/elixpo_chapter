"""MCP Tool: Search file contents with regex."""

from __future__ import annotations

import os
import re

from elixpo.mcp.base import BaseTool, ToolResult


class GrepTool(BaseTool):
    name = "grep"
    description = (
        "Search for a regex pattern across files in the workspace. "
        "Returns matching lines with file paths and line numbers."
    )
    parameters = {
        "type": "object",
        "properties": {
            "pattern": {
                "type": "string",
                "description": "Regex pattern to search for.",
            },
            "path": {
                "type": "string",
                "description": "Directory or file to search in (relative to workspace). Defaults to '.'.",
            },
            "include": {
                "type": "string",
                "description": "Glob pattern to filter files (e.g., '*.py'). Optional.",
            },
        },
        "required": ["pattern"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        pattern = kwargs["pattern"]
        search_path = kwargs.get("path", ".")
        include = kwargs.get("include")

        full_path = os.path.normpath(os.path.join(workspace_path, search_path))
        if not full_path.startswith(os.path.normpath(workspace_path)):
            return ToolResult(success=False, output="", error="Path traversal not allowed.")

        try:
            regex = re.compile(pattern)
        except re.error as e:
            return ToolResult(success=False, output="", error=f"Invalid regex: {e}")

        matches = []
        max_matches = 200
        skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next"}

        def should_include(filename: str) -> bool:
            if not include:
                return True
            import fnmatch
            return fnmatch.fnmatch(filename, include)

        if os.path.isfile(full_path):
            files = [full_path]
        else:
            files = []
            for root, dirs, filenames in os.walk(full_path):
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                for fname in filenames:
                    if should_include(fname):
                        files.append(os.path.join(root, fname))

        for fpath in files:
            if len(matches) >= max_matches:
                break
            try:
                with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                    for lineno, line in enumerate(f, 1):
                        if regex.search(line):
                            rel = os.path.relpath(fpath, workspace_path)
                            matches.append(f"{rel}:{lineno}: {line.rstrip()}")
                            if len(matches) >= max_matches:
                                break
            except (PermissionError, IsADirectoryError):
                continue

        if not matches:
            return ToolResult(success=True, output="No matches found.")

        truncated = f"\n(truncated at {max_matches} matches)" if len(matches) >= max_matches else ""
        return ToolResult(
            success=True,
            output=f"Found {len(matches)} match(es):\n" + "\n".join(matches) + truncated,
        )
