"""Workspace-sandboxed path resolution. Every tool path is confined to the
workspace root — attempts to escape (.. or absolute outside) are rejected.
"""

from __future__ import annotations

from pathlib import Path


class PathEscape(ValueError):
    """A requested path resolved outside the workspace root."""


def safe_path(workspace: Path, rel: str) -> Path:
    root = workspace.resolve()
    p = (root / rel).resolve()
    if p != root and root not in p.parents:
        raise PathEscape(f"path {rel!r} escapes workspace {root}")
    return p
