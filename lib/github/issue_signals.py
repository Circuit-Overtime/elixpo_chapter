"""Shared deterministic signals extracted from GitHub issue conversations."""

from __future__ import annotations

import re

MAINTAINER_ASSOCIATIONS = {"OWNER", "MEMBER", "COLLABORATOR"}

_RESOLVED_RE = re.compile(
    r"\b(?:"
    r"(?:this|it|that|the issue|the bug)\s+(?:was|is|has been|had been)\s+"
    r"(?:already\s+)?(?:fixed|resolved|implemented|addressed)"
    r"|(?:we(?:'ve| have)|i(?:'ve| have))\s+(?:already\s+)?(?:fixed|resolved|implemented|addressed)"
    r"|(?:fixed|resolved|implemented|addressed)\s+(?:already\s+)?from\s+(?:our|my)\s+side"
    r"|(?:already\s+)?(?:fixed|resolved|implemented|addressed)\s+(?:in|on)\s+"
    r"(?:main|master|latest|head|the repository)"
    r")\b",
    re.IGNORECASE,
)
_UNRESOLVED_RE = re.compile(
    r"\b(?:not|isn't|wasn't|hasn't been|still not)\s+(?:fixed|resolved|implemented|addressed)\b"
    r"|\b(?:still|again)\s+(?:broken|failing|reproducible)\b"
    r"|\b(?:reopen(?:ed|ing)?|regression)\b",
    re.IGNORECASE,
)


def maintainer_says_resolved(comments: list[dict] | None) -> bool:
    """Return the latest explicit repository-staff resolution state."""
    resolved = False
    ordered = sorted(comments or [], key=lambda item: str(item.get("created_at") or ""))
    for comment in ordered:
        if comment.get("author_association", "") not in MAINTAINER_ASSOCIATIONS:
            continue
        body = str(comment.get("body") or "")
        if _UNRESOLVED_RE.search(body):
            resolved = False
        elif _RESOLVED_RE.search(body):
            resolved = True
    return resolved
