"""Long-term memory system — read/write memories for repos, users, and global patterns."""

from __future__ import annotations

import json
import os
import time

from elixpo.data.models import Memory


class MemoryStore:
    """File-based memory store. Will be backed by Cloudflare D1 in Phase 3."""

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

        # Sort by relevance_score descending, then recency
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

        # Rewrite file
        with open(path, "w") as f:
            for mem in memories:
                f.write(json.dumps(mem.model_dump()) + "\n")
