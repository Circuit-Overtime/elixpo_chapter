"""stdio entrypoint: `python -m mcp_server` (or the `elixpoo-mcp` console script).

The publishable artifact — an MCP server any host can spawn over stdio.
"""

from __future__ import annotations

from mcp_server.server import build_server


def main() -> None:
    build_server().run()  # FastMCP defaults to stdio transport


if __name__ == "__main__":
    main()
