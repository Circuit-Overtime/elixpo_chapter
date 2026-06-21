"""elixpoo MCP tools — pure functions over a workspace root.

Imported by the FastMCP server (mcp_server.server) and directly by tests. Keeping
them transport-free is what makes them unit-testable and the package publishable.
"""

from mcp_server.tools.files import (
    delete_file,
    edit_file,
    list_dir,
    move_file,
    multi_edit,
    read_file,
    write_file,
)
from mcp_server.tools.patch import apply_patch
from mcp_server.tools.search import directory_tree, glob, grep
from mcp_server.tools.shell import git, run_shell

__all__ = [
    "read_file",
    "write_file",
    "edit_file",
    "multi_edit",
    "delete_file",
    "move_file",
    "apply_patch",
    "list_dir",
    "glob",
    "grep",
    "directory_tree",
    "run_shell",
    "git",
]
