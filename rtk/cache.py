"""Prompt-prefix cache helpers.

Pollinations prices a stable, repeated prefix at promptCachedTokens (≈10x
cheaper) when the same leading messages recur. We don't cache responses here —
we keep the *prefix stable and hashable* so callers can reuse one system/tool
preamble across a task and let the server-side cache hit. `prefix_hash` lets the
ledger attribute cache hits and lets dedup detect an unchanged preamble.
"""

from __future__ import annotations

import hashlib

from rtk.models import Message


def prefix_hash(messages: list[Message], n: int = 1) -> str:
    """Stable hash of the first `n` messages (the cacheable preamble)."""
    head = messages[:n]
    blob = "".join(f"{m.role}:{m.content or ''}" for m in head)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


def split_cacheable(messages: list[Message], n: int = 1) -> tuple[list[Message], list[Message]]:
    """Split into (stable preamble, variable tail) so callers keep the prefix fixed."""
    return messages[:n], messages[n:]
