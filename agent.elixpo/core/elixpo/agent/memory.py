"""Memory system — working memory (in-context) and long-term memory (persisted)."""

from __future__ import annotations

import json
import os
import time

from elixpo.agent.context import estimate_tokens
from elixpo.data.models import Memory


class WorkingMemory:
    """In-context memory for the current task. Tracks loaded file contents."""

    def __init__(self):
        self._items: dict[str, str] = {}
        self._token_count: int = 0

    def load(self, key: str, content: str) -> None:
        """Load content into working memory."""
        if key in self._items:
            self.release(key)
        self._items[key] = content
        self._token_count += estimate_tokens(content)

    def release(self, key: str) -> None:
        """Release content from working memory."""
        if key in self._items:
            self._token_count -= estimate_tokens(self._items[key])
            del self._items[key]

    def release_all(self) -> None:
        """Clear all working memory."""
        self._items.clear()
        self._token_count = 0

    @property
    def keys(self) -> list[str]:
        return list(self._items.keys())

    @property
    def token_budget(self) -> int:
        return self._token_count

    def to_context_block(self) -> str | None:
        """Render working memory as a context block for the system prompt."""
        if not self._items:
            return None

        parts = ["## Working Memory (loaded files)"]
        for key, content in self._items.items():
            # Truncate very large files in context
            preview = content[:2000] if len(content) > 2000 else content
            parts.append(f"\n### {key}\n```\n{preview}\n```")

        return "\n".join(parts)


class MemoryStore:
    """File-based long-term memory. Persists across sessions."""

    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

    def _memories_file(self, repo_id: str | None = None) -> str:
        name = repo_id or "global"
        return os.path.join(self.storage_path, f"{name}.jsonl")

    def write(self, memory: Memory) -> None:
        """Append a memory entry."""
        path = self._memories_file(memory.repo_id)
        with open(path, "a") as f:
            f.write(json.dumps(memory.model_dump()) + "\n")

    def read(
        self,
        repo_id: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[Memory]:
        """Read memories, optionally filtered by repo and category."""
        path = self._memories_file(repo_id)
        if not os.path.exists(path):
            return []

        memories = []
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                mem = Memory(**json.loads(line))
                if category and mem.category != category:
                    continue
                memories.append(mem)

        memories.sort(key=lambda m: (m.relevance_score, m.created_at), reverse=True)
        return memories[:limit]

    def search(self, query: str, repo_id: str | None = None, limit: int = 10) -> list[Memory]:
        """Simple keyword search across memories."""
        all_mems = self.read(repo_id=repo_id, limit=200)
        query_lower = query.lower()
        matches = [m for m in all_mems if query_lower in m.content.lower()]
        return matches[:limit]

    def decay(self, repo_id: str | None = None, factor: float = 0.95) -> None:
        """Apply decay to relevance scores. Called periodically."""
        path = self._memories_file(repo_id)
        if not os.path.exists(path):
            return

        memories = []
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    mem = Memory(**json.loads(line))
                    mem.relevance_score *= factor
                    memories.append(mem)

        with open(path, "w") as f:
            for mem in memories:
                f.write(json.dumps(mem.model_dump()) + "\n")
