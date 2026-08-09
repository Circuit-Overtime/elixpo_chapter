"""One bounded, repository-grounded correction after semantic review rejection."""

from __future__ import annotations

import re
from pathlib import Path

from agents.solve.edit import apply_edit_batch
from agents.solve.model import implement_review_correction
from rtk.truncate import truncate_text

_CODE_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sh", ".bash", ".yaml", ".yml"}
_SAFE_RELATIVE = re.compile(r"[A-Za-z0-9_./@+\-]+")


class CorrectionRejected(RuntimeError):
    pass


def correction_targets(
    workspace: Path,
    changed_paths: list[str],
    grounded_paths: list[str],
    *,
    max_files: int,
    blocked_prefixes: list[str],
) -> list[str]:
    """Select existing grounded code files, prioritizing the current diff."""
    blocked = [str(item).casefold().rstrip("/") for item in blocked_prefixes]
    selected: list[str] = []
    for raw in [*changed_paths, *grounded_paths]:
        path = str(raw or "").strip()
        candidate = Path(path)
        lowered = path.casefold()
        if (
            not path
            or path in selected
            or not _SAFE_RELATIVE.fullmatch(path)
            or candidate.is_absolute()
            or ".." in candidate.parts
            or candidate.parts[0] == ".git"
            or any(lowered == prefix or lowered.startswith(f"{prefix}/") for prefix in blocked)
        ):
            continue
        target = workspace / candidate
        if not target.is_file() or target.is_symlink():
            continue
        if path not in changed_paths and candidate.suffix.casefold() not in _CODE_SUFFIXES:
            continue
        selected.append(path)
        if len(selected) >= max_files:
            break
    if not selected or not set(changed_paths).issubset(selected):
        raise CorrectionRejected("semantic correction has no safe grounded target set")
    return selected


def correction_context(workspace: Path, paths: list[str], *, max_tokens: int) -> str:
    """Build one compact exact context bundle without another discovery loop."""
    per_file = max(300, max_tokens // max(1, len(paths)))
    sections: list[str] = []
    for path in paths:
        body = (workspace / path).read_text(encoding="utf-8", errors="replace")
        sections.append(f"// FILE: {path}\n{truncate_text(body, max_tokens=per_file)}")
    return truncate_text("\n\n".join(sections), max_tokens=max_tokens)


async def apply_review_correction(
    router,
    *,
    workspace: Path,
    issue: dict,
    findings: list[str],
    diff: str,
    allowed_paths: list[str],
    max_context_tokens: int,
    max_output_tokens: int,
) -> tuple[list[str], str]:
    """Ask Qwen for one exact edit batch and apply it atomically."""
    implementation = await implement_review_correction(
        router,
        issue=issue,
        findings=findings,
        current_diff=diff,
        allowed_paths=allowed_paths,
        exact_context=correction_context(
            workspace,
            allowed_paths,
            max_tokens=max_context_tokens,
        ),
        max_tokens=max_output_tokens,
    )
    changed = apply_edit_batch(workspace, implementation.edits, set(allowed_paths))
    return changed, implementation.summary
