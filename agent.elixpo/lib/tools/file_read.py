"""MCP Tool: Read file contents."""

from __future__ import annotations

import os

from elixpo.mcp.base import BaseTool, ToolResult


class FileReadTool(BaseTool):
    name = "file_read"
    description = (
        "Read the contents of a file. Supports reading specific line ranges "
        "for large files. Returns file contents with line numbers."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the file from workspace root.",
            },
            "offset": {
                "type": "integer",
                "description": "Starting line number (1-based). Defaults to 1.",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of lines to read. Defaults to 2000.",
            },
        },
        "required": ["path"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        path = kwargs["path"]
        offset = kwargs.get("offset", 1)
        limit = kwargs.get("limit", 2000)

        full_path = os.path.normpath(os.path.join(workspace_path, path))

        # Prevent path traversal
        if not full_path.startswith(os.path.normpath(workspace_path)):
            return ToolResult(success=False, output="", error="Path traversal not allowed.")

        if not os.path.isfile(full_path):
            return ToolResult(success=False, output="", error=f"File not found: {path}")

        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

        start = max(0, offset - 1)
        end = start + limit
        selected = lines[start:end]

        numbered = []
        for i, line in enumerate(selected, start=start + 1):
            numbered.append(f"{i:>6}\t{line.rstrip()}")

        total = len(lines)
        header = f"[{path}] Lines {start + 1}-{min(end, total)} of {total}\n"
        return ToolResult(success=True, output=header + "\n".join(numbered))
