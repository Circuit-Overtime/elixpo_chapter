"""elixpoo MCP tools — pure functions over a workspace root.

Imported by the FastMCP server (mcp_server.server) and directly by tests. Keeping
them transport-free is what makes them unit-testable and the package publishable.
"""

from mcp_server.tools.files import edit_file, list_dir, read_file, write_file
from mcp_server.tools.search import directory_tree, glob, grep
from mcp_server.tools.shell import git, run_shell

__all__ = [
    "read_file",
    "write_file",
    "edit_file",
    "list_dir",
    "glob",
    "grep",
    "directory_tree",
    "run_shell",
    "git",
]
