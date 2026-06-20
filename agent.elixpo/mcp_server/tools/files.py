"""File tools — pure functions over a workspace root, no MCP dependency.

Returned strings are what the model sees, so they're concise. Read output is
line-numbered (cat -n style) so edits can reference lines.
"""

from __future__ import annotations

from pathlib import Path

from mcp_server.tools._fs import safe_path

MAX_READ_BYTES = 256_000


def read_file(workspace: Path, path: str, offset: int = 0, limit: int = 2000) -> str:
    p = safe_path(workspace, path)
    if not p.exists():
        return f"error: {path} not found"
    if p.is_dir():
        return f"error: {path} is a directory"
    data = p.read_text(errors="replace")
    lines = data.splitlines()
    chunk = lines[offset : offset + limit]
    width = len(str(offset + len(chunk)))
    return "\n".join(f"{offset + i + 1:>{width}}\t{ln}" for i, ln in enumerate(chunk))


def write_file(workspace: Path, path: str, content: str) -> str:
    p = safe_path(workspace, path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    return f"wrote {len(content)} bytes to {path}"


def edit_file(workspace: Path, path: str, old: str, new: str, replace_all: bool = False) -> str:
    p = safe_path(workspace, path)
    if not p.exists():
        return f"error: {path} not found"
    text = p.read_text()
    count = text.count(old)
    if count == 0:
        return f"error: old_string not found in {path}"
    if count > 1 and not replace_all:
        return f"error: old_string occurs {count}x in {path}; pass replace_all or add context"
    p.write_text(text.replace(old, new) if replace_all else text.replace(old, new, 1))
    return f"edited {path} ({'all ' + str(count) if replace_all else '1'} occurrence(s))"


def list_dir(workspace: Path, path: str = ".") -> str:
    p = safe_path(workspace, path)
    if not p.is_dir():
        return f"error: {path} is not a directory"
    entries = sorted(p.iterdir(), key=lambda e: (e.is_file(), e.name))
    return "\n".join(f"{'  ' if e.is_file() else '/ '}{e.name}" for e in entries) or "(empty)"
