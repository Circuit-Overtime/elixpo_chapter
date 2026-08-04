"""elixpoo-mcp — the publishable MCP server exposing coding-workspace tools."""

from __future__ import annotations

from typing import Any

__all__ = ["build_server"]


def __getattr__(name: str) -> Any:
    """Load the optional MCP runtime only when the server is requested."""
    if name != "build_server":
        raise AttributeError(name)
    from mcp_server.server import build_server

    return build_server
