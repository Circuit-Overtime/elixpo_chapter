"""Natural deterministic branch names for one vetted issue."""

from __future__ import annotations

import re
import unicodedata
from typing import Any

_FEATURE_LABELS = {"enhancement", "feature", "new feature", "proposal"}
_FEATURE_TITLE = re.compile(r"^(add|create|introduce|implement|support)\b", re.IGNORECASE)


def _label_names(issue: dict[str, Any]) -> set[str]:
    names: set[str] = set()
    for label in issue.get("labels") or []:
        value = label.get("name") if isinstance(label, dict) else label
        if value:
            names.add(str(value).strip().casefold())
    return names


def _slug(title: str, max_length: int = 44) -> str:
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.casefold()).strip("-")
    return (slug[:max_length].rstrip("-") or "issue")


def build_work_branch(issue: dict[str, Any], number: int, nonce: str) -> str:
    if not re.fullmatch(r"[0-9a-f]{4}", nonce):
        raise ValueError("branch nonce must be four lowercase hex characters")
    title = str(issue.get("title") or "")
    feature = bool(_label_names(issue) & _FEATURE_LABELS) or bool(_FEATURE_TITLE.match(title.strip()))
    prefix = "feat" if feature else "patch"
    return f"{prefix}/{_slug(title)}-{number}-{nonce}"
