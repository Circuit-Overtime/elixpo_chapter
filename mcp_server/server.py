"""The elixpoo MCP server (FastMCP).

Exposes the workspace tools over MCP so any MCP client — the Solve squad, or an
external host like Claude Desktop once published — can drive a coding workspace.
The server is bound to one workspace root (default: cwd, or ELIXPO_WORKSPACE).

Run standalone:  python -m mcp_server         (stdio transport)
Embed in tests:  build_server(tmp_path)
"""

from __future__ import annotations

import os
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from mcp_server import tools


def build_server(workspace: str | Path | None = None) -> FastMCP:
    root = Path(workspace or os.environ.get("ELIXPO_WORKSPACE") or ".").resolve()
    mcp = FastMCP("elixpoo-mcp", instructions="Workspace tools for the elixpoo coding agent.")

    @mcp.tool(description="Read a file (line-numbered). offset/limit page through large files.")
    def read_file(path: str, offset: int = 0, limit: int = 2000) -> str:
        return tools.read_file(root, path, offset, limit)

    @mcp.tool(description="Overwrite a file with content (creates parent dirs).")
    def write_file(path: str, content: str) -> str:
        return tools.write_file(root, path, content)

    @mcp.tool(description="Exact-string replace in a file. Set replace_all for every occurrence.")
    def edit_file(path: str, old: str, new: str, replace_all: bool = False) -> str:
        return tools.edit_file(root, path, old, new, replace_all)

    @mcp.tool(description="List a directory.")
    def list_dir(path: str = ".") -> str:
        return tools.list_dir(root, path)

    @mcp.tool(description="Glob files by pattern, e.g. '**/*.py'.")
    def glob(pattern: str) -> str:
        return tools.glob(root, pattern)

    @mcp.tool(description="Regex search across files. Optional glob_filter on filenames.")
    def grep(pattern: str, path: str = ".", glob_filter: str | None = None) -> str:
        return tools.grep(root, pattern, path, glob_filter)

    @mcp.tool(description="Directory tree to max_depth.")
    def directory_tree(path: str = ".", max_depth: int = 3) -> str:
        return tools.directory_tree(root, path, max_depth)

    @mcp.tool(description="Run a shell command in the workspace (output token-compressed via rtk).")
    def run_shell(command: str) -> str:
        return tools.run_shell(root, command)

    @mcp.tool(description="Run a git command in the workspace.")
    def git(args: str) -> str:
        return tools.git(root, args)

    return mcp
