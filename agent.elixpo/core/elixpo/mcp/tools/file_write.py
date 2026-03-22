"""MCP Tool: Write or create a file."""

from __future__ import annotations

import os

from elixpo.mcp.base import BaseTool, ToolResult


class FileWriteTool(BaseTool):
    name = "file_write"
    description = (
        "Write content to a file. Creates the file and parent directories if they "
        "don't exist. Overwrites the file if it already exists."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the file from workspace root.",
            },
            "content": {
                "type": "string",
                "description": "The content to write to the file.",
            },
        },
        "required": ["path", "content"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        path = kwargs["path"]
        content = kwargs["content"]

        full_path = os.path.normpath(os.path.join(workspace_path, path))

        if not full_path.startswith(os.path.normpath(workspace_path)):
            return ToolResult(success=False, output="", error="Path traversal not allowed.")

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

        return ToolResult(success=True, output=f"Wrote {len(content)} bytes to {path}")
