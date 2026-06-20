"""MCP Tool: Edit a file with search-and-replace."""

from __future__ import annotations

import os

from elixpo.mcp.base import BaseTool, ToolResult


class FileEditTool(BaseTool):
    name = "file_edit"
    allowed_modes = {"edit"}
    description = (
        "Edit a file by replacing a specific text block with new content. "
        "The old_text must match exactly (including whitespace). "
        "Use this for targeted edits rather than rewriting entire files."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the file from workspace root.",
            },
            "old_text": {
                "type": "string",
                "description": "The exact text to find and replace.",
            },
            "new_text": {
                "type": "string",
                "description": "The replacement text.",
            },
        },
        "required": ["path", "old_text", "new_text"],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        path = kwargs["path"]
        old_text = kwargs["old_text"]
        new_text = kwargs["new_text"]

        full_path = os.path.normpath(os.path.join(workspace_path, path))

        if not full_path.startswith(os.path.normpath(workspace_path)):
            return ToolResult(success=False, output="", error="Path traversal not allowed.")

        if not os.path.isfile(full_path):
            return ToolResult(success=False, output="", error=f"File not found: {path}")

        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

        count = content.count(old_text)
        if count == 0:
            return ToolResult(
                success=False, output="", error="old_text not found in file."
            )
        if count > 1:
            return ToolResult(
                success=False,
                output="",
                error=f"old_text found {count} times. Make it more specific to match exactly once.",
            )

        new_content = content.replace(old_text, new_text, 1)

        try:
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(new_content)
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

        return ToolResult(success=True, output=f"Edited {path}: replaced 1 occurrence.")
