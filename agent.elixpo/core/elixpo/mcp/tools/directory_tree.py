"""MCP Tool: Display directory tree structure."""

from __future__ import annotations

import os

from elixpo.mcp.base import BaseTool, ToolResult


class DirectoryTreeTool(BaseTool):
    name = "directory_tree"
    description = (
        "Show the directory tree structure of the workspace or a subdirectory. "
        "Useful for understanding project layout."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Directory to list (relative to workspace). Defaults to '.'.",
            },
            "max_depth": {
                "type": "integer",
                "description": "Maximum depth to traverse. Defaults to 3.",
            },
        },
        "required": [],
    }

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        rel_path = kwargs.get("path", ".")
        max_depth = kwargs.get("max_depth", 3)

        full_path = os.path.normpath(os.path.join(workspace_path, rel_path))
        if not full_path.startswith(os.path.normpath(workspace_path)):
            return ToolResult(success=False, output="", error="Path traversal not allowed.")

        if not os.path.isdir(full_path):
            return ToolResult(success=False, output="", error=f"Not a directory: {rel_path}")

        skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next", "dist", "build"}
        lines = []
        entry_count = 0
        max_entries = 500

        def walk(dir_path: str, prefix: str, depth: int):
            nonlocal entry_count
            if depth > max_depth or entry_count >= max_entries:
                return

            try:
                entries = sorted(os.listdir(dir_path))
            except PermissionError:
                return

            dirs = [e for e in entries if os.path.isdir(os.path.join(dir_path, e)) and e not in skip_dirs]
            files = [e for e in entries if os.path.isfile(os.path.join(dir_path, e))]

            items = [(d, True) for d in dirs] + [(f, False) for f in files]

            for i, (name, is_dir) in enumerate(items):
                if entry_count >= max_entries:
                    lines.append(f"{prefix}... (truncated)")
                    return
                is_last = i == len(items) - 1
                connector = "└── " if is_last else "├── "
                display = f"{name}/" if is_dir else name
                lines.append(f"{prefix}{connector}{display}")
                entry_count += 1

                if is_dir:
                    extension = "    " if is_last else "│   "
                    walk(os.path.join(dir_path, name), prefix + extension, depth + 1)

        root_name = os.path.basename(full_path) or rel_path
        lines.append(f"{root_name}/")
        walk(full_path, "", 1)

        return ToolResult(success=True, output="\n".join(lines))
