"""Search tools — glob, grep, directory tree. Pure functions over a workspace."""

from __future__ import annotations

import fnmatch
import re
from pathlib import Path

from mcp_server.tools._fs import safe_path

_IGNORE = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}
MAX_HITS = 200


def _walk(root: Path):
    for p in root.rglob("*"):
        if any(part in _IGNORE for part in p.relative_to(root).parts):
            continue
        yield p


def glob(workspace: Path, pattern: str) -> str:
    root = safe_path(workspace, ".")
    hits = [
        str(p.relative_to(root))
        for p in _walk(root)
        if p.is_file() and fnmatch.fnmatch(str(p.relative_to(root)), pattern)
    ]
    hits.sort()
    return "\n".join(hits[:MAX_HITS]) or "(no matches)"


def grep(workspace: Path, pattern: str, path: str = ".", glob_filter: str | None = None) -> str:
    root = safe_path(workspace, path)
    rx = re.compile(pattern)
    out: list[str] = []
    files = [root] if root.is_file() else _walk(root)
    for p in files:
        if not p.is_file():
            continue
        if glob_filter and not fnmatch.fnmatch(p.name, glob_filter):
            continue
        try:
            for n, line in enumerate(p.read_text(errors="replace").splitlines(), 1):
                if rx.search(line):
                    rel = p.relative_to(workspace.resolve())
                    out.append(f"{rel}:{n}: {line.strip()[:200]}")
                    if len(out) >= MAX_HITS:
                        return "\n".join(out) + f"\n... (capped at {MAX_HITS})"
        except (OSError, UnicodeDecodeError):
            continue
    return "\n".join(out) or "(no matches)"


def directory_tree(workspace: Path, path: str = ".", max_depth: int = 3) -> str:
    root = safe_path(workspace, path)
    lines: list[str] = []

    def rec(d: Path, depth: int, prefix: str):
        if depth > max_depth:
            return
        kids = sorted(
            (e for e in d.iterdir() if e.name not in _IGNORE),
            key=lambda e: (e.is_file(), e.name),
        )
        for e in kids:
            lines.append(f"{prefix}{'/' if e.is_dir() else ''}{e.name}")
            if e.is_dir():
                rec(e, depth + 1, prefix + "  ")

    rec(root, 1, "")
    return "\n".join(lines) or "(empty)"
