"""Atomic, plan-confined file edits returned by the coding model."""

from __future__ import annotations

from pathlib import Path

from agents.solve.models import FileEdit
from mcp_server.tools._fs import safe_path


class EditRejected(RuntimeError):
    pass


def _validate_target(workspace: Path, rel: str, allowed: set[str]) -> Path:
    if rel not in allowed:
        raise EditRejected(f"model attempted unplanned file: {rel}")
    path = safe_path(workspace, rel)
    if path.is_symlink():
        raise EditRejected(f"refusing symlink edit: {rel}")
    return path


def apply_edit_batch(workspace: Path, edits: list[FileEdit], allowed: set[str]) -> list[str]:
    """Validate every edit, then write all or roll every target back."""
    rendered: dict[Path, str] = {}
    originals: dict[Path, bytes | None] = {}
    changed: list[str] = []

    for edit in edits:
        path = _validate_target(workspace, edit.path, allowed)
        if path in rendered:
            raise EditRejected(f"duplicate edit target: {edit.path}")
        originals[path] = path.read_bytes() if path.exists() else None

        if edit.operation == "create":
            if path.exists():
                raise EditRejected(f"create target already exists: {edit.path}")
            rendered[path] = edit.content
        else:
            if not path.is_file():
                raise EditRejected(f"replace target does not exist: {edit.path}")
            text = path.read_text()
            for replacement in edit.replacements:
                if not replacement.old:
                    raise EditRejected(f"empty old text for {edit.path}")
                count = text.count(replacement.old)
                if count != 1:
                    raise EditRejected(
                        f"old text occurs {count} times in {edit.path}; exact unique context required"
                    )
                text = text.replace(replacement.old, replacement.new, 1)
            rendered[path] = text
        changed.append(edit.path)

    try:
        for path, text in rendered.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
    except Exception:
        for path, data in originals.items():
            if data is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(data)
        raise
    return changed
