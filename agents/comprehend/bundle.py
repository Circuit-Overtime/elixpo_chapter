"""Build a small, deterministic repository bundle for Solve.

Comprehend is intentionally a library, not a squad. It performs no model calls
and reads only tracked files in the isolated target workspace.
"""

from __future__ import annotations

import re
import subprocess
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from mcp_server.tools._fs import safe_path
from rtk.count import count_text
from rtk.truncate import truncate_text

_PATH_RE = re.compile(
    r"(?<![\w.-])(?:[\w.@+-]+/)+[\w.@+-]+(?:\.[A-Za-z0-9][\w.-]*)?"
)
_CODE_TOKEN_RE = re.compile(r"`([A-Za-z_$][\w$.-]{2,80})`")
_SEARCH_TOKEN_RE = re.compile(r"[A-Za-z_$][A-Za-z0-9_$.-]{2,80}")
_SEARCH_STOPWORDS = {
    "and",
    "about",
    "after",
    "again",
    "also",
    "are",
    "been",
    "before",
    "being",
    "bug",
    "does",
    "for",
    "from",
    "have",
    "into",
    "not",
    "must",
    "should",
    "that",
    "the",
    "their",
    "this",
    "was",
    "version",
    "what",
    "when",
    "where",
    "which",
    "with",
}
_MANIFESTS = (
    "pyproject.toml",
    "package.json",
    "pnpm-workspace.yaml",
    "requirements.txt",
    "setup.cfg",
    "tox.ini",
    "Makefile",
)


@dataclass
class ContextBundle:
    guidance: dict[str, str] = field(default_factory=dict)
    candidates: dict[str, str] = field(default_factory=dict)
    tracked_files: list[str] = field(default_factory=list)
    omitted: list[str] = field(default_factory=list)

    def render(self, max_tokens: int) -> str:
        index = truncate_text(
            "\n".join(self.tracked_files),
            max_tokens=max(500, max_tokens // 4),
        )
        parts = ["TRACKED FILE INDEX:\n" + index]
        for path, text in self.guidance.items():
            parts.append(f"GUIDANCE {path}:\n{text}")
        for path, text in self.candidates.items():
            parts.append(f"CANDIDATE {path}:\n{text}")
        if self.omitted:
            parts.append("OMITTED CANDIDATES:\n" + "\n".join(self.omitted))
        return truncate_text("\n\n".join(parts), max_tokens=max_tokens)


def _git_lines(workspace: Path, *args: str) -> list[str]:
    proc = subprocess.run(
        ["git", *args],
        cwd=workspace,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip()[:1000])
    return [line for line in proc.stdout.splitlines() if line.strip()]


def tracked_files(workspace: Path) -> list[str]:
    return _git_lines(workspace, "ls-files")


def _read(workspace: Path, rel: str, max_tokens: int) -> str:
    path = safe_path(workspace, rel)
    if not path.is_file() or path.is_symlink():
        return ""
    return truncate_text(path.read_text(errors="replace"), max_tokens=max_tokens)


def _mentioned_paths(text: str, tracked: set[str]) -> list[str]:
    found: list[str] = []
    for raw in _PATH_RE.findall(text):
        candidate = raw.strip("`'\".,:;()[]{}")
        if candidate in tracked and candidate not in found:
            found.append(candidate)
    return found


def _search_terms(text: str, limit: int = 12) -> tuple[list[str], set[str]]:
    exact_terms = _CODE_TOKEN_RE.findall(text)
    terms: list[str] = []
    seen_terms: set[str] = set()
    for term in [*exact_terms, *_SEARCH_TOKEN_RE.findall(text)]:
        normalized = term.casefold()
        if normalized in seen_terms or normalized in _SEARCH_STOPWORDS:
            continue
        seen_terms.add(normalized)
        terms.append(term)
        if len(terms) >= limit:
            break
    return terms, set(exact_terms)


def _search_candidates(workspace: Path, text: str, tracked: set[str], limit: int = 10) -> list[str]:
    terms, exact_terms = _search_terms(text)

    scores: Counter[str] = Counter()
    first_seen: dict[str, int] = {}
    for term in terms:
        normalized = term.casefold()
        for rel in tracked:
            if normalized in rel.casefold():
                scores[rel] += 1
                first_seen.setdefault(rel, len(first_seen))
        proc = subprocess.run(
            ["git", "grep", "-l", "-i", "-F", "-e", term, "--", "."],
            cwd=workspace,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        if proc.returncode not in (0, 1):
            continue
        for raw in proc.stdout.splitlines():
            rel = raw.removeprefix("./")
            if rel.endswith(".lock"):
                continue
            if rel in tracked:
                scores[rel] += 2 if term in exact_terms else 1
                first_seen.setdefault(rel, len(first_seen))
    return sorted(scores, key=lambda rel: (-scores[rel], first_seen[rel], rel))[:limit]


def _read_relevant(workspace: Path, rel: str, terms: list[str], max_tokens: int) -> str:
    """Return merged source windows around issue terms instead of blind head/tail truncation."""
    path = safe_path(workspace, rel)
    if not path.is_file() or path.is_symlink():
        return ""
    text = path.read_text(errors="replace")
    if count_text(text) <= max_tokens:
        return text

    lines = text.splitlines()
    needles = [term.casefold() for term in terms]
    matches = [
        (sum(needle in line.casefold() for needle in needles), index)
        for index, line in enumerate(lines)
        if any(needle in line.casefold() for needle in needles)
    ]
    if not matches:
        return truncate_text(text, max_tokens=max_tokens)

    anchors: list[int] = []
    for _, index in sorted(matches, key=lambda item: (-item[0], item[1])):
        if all(abs(index - existing) > 36 for existing in anchors):
            anchors.append(index)
        if len(anchors) >= 3:
            break

    spans: list[tuple[int, int]] = []
    for index in sorted(anchors):
        start, end = max(0, index - 30), min(len(lines), index + 31)
        if spans and start <= spans[-1][1]:
            spans[-1] = (spans[-1][0], max(spans[-1][1], end))
        else:
            spans.append((start, end))
    excerpts = [
        f"// lines {start + 1}-{end}\n" + "\n".join(lines[start:end])
        for start, end in spans
    ]
    return truncate_text("\n\n// ...\n\n".join(excerpts), max_tokens=max_tokens)


def _guidance_paths(files: list[str], names: set[str], targets: list[str]) -> list[str]:
    selected: list[str] = []
    for rel in files:
        if Path(rel).name in names and len(Path(rel).parts) == 1:
            selected.append(rel)
    for target in targets:
        parent = Path(target).parent
        for rel in files:
            path = Path(rel)
            if path.name not in names:
                continue
            try:
                parent.relative_to(path.parent)
            except ValueError:
                continue
            if rel not in selected:
                selected.append(rel)
    return selected


def build_context_bundle(
    workspace: Path,
    issue: dict,
    *,
    guidance_names: list[str],
    max_context_tokens: int,
    max_file_tokens: int,
) -> ContextBundle:
    """Read guidance and likely files without sending the whole repository."""
    files = tracked_files(workspace)
    tracked = set(files)
    issue_text = f"{issue.get('title', '')}\n{issue.get('body') or ''}"
    search_terms, _ = _search_terms(issue_text)
    mentioned = _mentioned_paths(issue_text, tracked)
    searched = _search_candidates(workspace, issue_text, tracked)
    # Ranked behavioral matches lead. Explicitly mentioned paths remain useful
    # context, but a route/page named in a report is not necessarily where its
    # behavior is implemented.
    candidates = list(dict.fromkeys([*searched, *mentioned, *[m for m in _MANIFESTS if m in tracked]]))

    bundle = ContextBundle(tracked_files=files[:350])
    guidance_paths = _guidance_paths(files, set(guidance_names), mentioned)
    guidance_remaining = min(1200, max_context_tokens // 3)
    for index, rel in enumerate(guidance_paths):
        slots = len(guidance_paths) - index
        content = _read(
            workspace,
            rel,
            min(max_file_tokens, max(250, guidance_remaining // slots)),
        )
        if content:
            bundle.guidance[rel] = content
            guidance_remaining -= min(guidance_remaining, count_text(content))

    remaining = max_context_tokens - count_text(bundle.render(max_context_tokens))
    for rel in candidates:
        if remaining <= 250:
            bundle.omitted.append(rel)
            continue
        content = _read_relevant(
            workspace,
            rel,
            search_terms,
            min(max_file_tokens, remaining),
        )
        if not content:
            continue
        bundle.candidates[rel] = content
        remaining -= count_text(content)
    return bundle


def load_exact_context(
    workspace: Path,
    paths: list[str],
    *,
    guidance_names: list[str],
    max_tokens: int,
    max_file_tokens: int,
) -> str:
    """Load only plan-declared files plus guidance governing their directories."""
    files = tracked_files(workspace)
    tracked = set(files)
    parts: list[str] = []
    guidance_paths = _guidance_paths(files, set(guidance_names), paths)
    guidance_remaining = min(1000, max_tokens // 4)
    for index, rel in enumerate(guidance_paths):
        slots = len(guidance_paths) - index
        text = _read(
            workspace,
            rel,
            min(max_file_tokens, max(250, guidance_remaining // slots)),
        )
        if text:
            parts.append(f"GUIDANCE {rel}:\n{text}")
            guidance_remaining -= min(guidance_remaining, count_text(text))
    for rel in paths:
        if rel in tracked:
            text = _read(workspace, rel, max_file_tokens)
            parts.append(f"FILE {rel}:\n{text}")
        else:
            parts.append(f"NEW FILE {rel}: (does not exist)")
    return truncate_text("\n\n".join(parts), max_tokens=max_tokens)
