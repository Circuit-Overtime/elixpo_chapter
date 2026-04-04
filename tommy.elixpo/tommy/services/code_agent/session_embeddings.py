"""
Session-scoped embeddings for sandbox code changes.

Creates an isolated embedding index per sandbox session that:
1. Tracks files edited by the code agent in real-time
2. Allows semantic search over session changes
3. Gets destroyed when sandbox ends
4. Can be combined with global repo embeddings for full search
"""
import asyncio
import hashlib
import logging
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field

from ..embeddings_utils import get_provider

logger = logging.getLogger(__name__)


def _chunk_code(content: str, file_path: str, max_lines: int = 100) -> list[dict]:
    lines = content.split("\n")

    if len(lines) <= max_lines:
        return [
            {
                "content": content,
                "file_path": file_path,
                "start_line": 1,
                "end_line": len(lines),
            }
        ]

    chunks = []
    current_chunk = []
    chunk_start = 1

    for i, line in enumerate(lines, 1):
        current_chunk.append(line)

        is_break = len(current_chunk) >= max_lines or (
            len(current_chunk) >= 20 and _is_definition_start(line)
        )

        if is_break and current_chunk:
            chunks.append(
                {
                    "content": "\n".join(current_chunk),
                    "file_path": file_path,
                    "start_line": chunk_start,
                    "end_line": i,
                }
            )
            current_chunk = []
            chunk_start = i + 1

    if current_chunk:
        chunks.append(
            {
                "content": "\n".join(current_chunk),
                "file_path": file_path,
                "start_line": chunk_start,
                "end_line": len(lines),
            }
        )

    return chunks


def _is_definition_start(line: str) -> bool:
    stripped = line.strip()
    return (
        stripped.startswith("def ")
        or stripped.startswith("class ")
        or stripped.startswith("async def ")
        or stripped.startswith("function ")
        or stripped.startswith("const ")
        or stripped.startswith("export ")
        or stripped.startswith("pub fn ")
        or stripped.startswith("fn ")
        or stripped.startswith("func ")
    )


@dataclass
class EmbeddedChunk:
    id: str
    file_path: str
    start_line: int
    end_line: int
    content: str
    embedding: list[float]
    content_hash: str


@dataclass
class SessionEmbeddings:
    sandbox_id: str
    chunks: dict[str, EmbeddedChunk] = field(default_factory=dict)
    files_indexed: set[str] = field(default_factory=set)
    _initialized: bool = False

    async def initialize(self):
        if not self._initialized:
            get_provider()  # ensure provider is loaded
            self._initialized = True
            logger.info(f"Session embeddings initialized for sandbox {self.sandbox_id}")

    async def index_file(self, file_path: str, content: str) -> int:
        if not content.strip():
            return 0

        provider = get_provider()

        old_chunk_ids = [
            chunk_id
            for chunk_id, chunk in self.chunks.items()
            if chunk.file_path == file_path
        ]
        for chunk_id in old_chunk_ids:
            del self.chunks[chunk_id]

        chunks = _chunk_code(content, file_path)

        # Batch-embed all chunks at once
        chunk_texts = [c["content"] for c in chunks if c["content"].strip()]
        if not chunk_texts:
            return 0
        embeddings = await provider.embed(chunk_texts)

        indexed_count = 0
        emb_idx = 0
        for chunk in chunks:
            if not chunk["content"].strip():
                continue
            chunk_id = f"{file_path}:{chunk['start_line']}-{chunk['end_line']}"
            chunk_hash = hashlib.md5(chunk["content"].encode()).hexdigest()

            self.chunks[chunk_id] = EmbeddedChunk(
                id=chunk_id,
                file_path=file_path,
                start_line=chunk["start_line"],
                end_line=chunk["end_line"],
                content=chunk["content"],
                embedding=embeddings[emb_idx],
                content_hash=chunk_hash,
            )
            emb_idx += 1
            indexed_count += 1

        self.files_indexed.add(file_path)
        logger.debug(
            f"Indexed {indexed_count} chunks from {file_path} in session {self.sandbox_id}"
        )

        return indexed_count

    async def remove_file(self, file_path: str):
        old_chunk_ids = [
            chunk_id
            for chunk_id, chunk in self.chunks.items()
            if chunk.file_path == file_path
        ]
        for chunk_id in old_chunk_ids:
            del self.chunks[chunk_id]

        self.files_indexed.discard(file_path)
        logger.debug(f"Removed {file_path} from session {self.sandbox_id}")

    async def search(self, query: str, top_k: int = 5) -> list[dict]:
        if not self.chunks:
            return []

        provider = get_provider()
        query_embedding = await provider.embed_query(query)

        import numpy as np

        query_vec = np.array(query_embedding)

        results = []
        for chunk in self.chunks.values():
            chunk_vec = np.array(chunk.embedding)

            similarity = np.dot(query_vec, chunk_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec)
            )

            results.append(
                {
                    "file_path": chunk.file_path,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "content": chunk.content,
                    "similarity": round(float(similarity), 3),
                    "source": "session",
                }
            )

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def get_stats(self) -> dict:
        return {
            "sandbox_id": self.sandbox_id,
            "total_chunks": len(self.chunks),
            "files_indexed": len(self.files_indexed),
            "file_list": list(self.files_indexed),
        }

    def clear(self):
        self.chunks.clear()
        self.files_indexed.clear()
        logger.info(f"Session embeddings cleared for sandbox {self.sandbox_id}")


class SessionEmbeddingsManager:
    def __init__(self):
        self.sessions: dict[str, SessionEmbeddings] = {}

    async def create_session(self, sandbox_id: str) -> SessionEmbeddings:
        session = SessionEmbeddings(sandbox_id=sandbox_id)
        await session.initialize()
        self.sessions[sandbox_id] = session
        logger.info(f"Created session embeddings for sandbox {sandbox_id}")
        return session

    def get_session(self, sandbox_id: str) -> Optional[SessionEmbeddings]:
        return self.sessions.get(sandbox_id)

    async def destroy_session(self, sandbox_id: str):
        session = self.sessions.pop(sandbox_id, None)
        if session:
            session.clear()
            logger.info(f"Destroyed session embeddings for sandbox {sandbox_id}")

    async def index_file(self, sandbox_id: str, file_path: str, content: str) -> int:
        session = self.sessions.get(sandbox_id)
        if not session:
            session = await self.create_session(sandbox_id)

        return await session.index_file(file_path, content)

    async def search_session(
        self, sandbox_id: str, query: str, top_k: int = 5
    ) -> list[dict]:
        session = self.sessions.get(sandbox_id)
        if not session:
            return []

        return await session.search(query, top_k)

    async def search_combined(
        self,
        sandbox_id: str,
        query: str,
        top_k: int = 10,
        session_weight: float = 1.2,
    ) -> list[dict]:
        from ..embeddings import search_code as global_search

        results = []
        seen_files = set()

        session_results = await self.search_session(sandbox_id, query, top_k=top_k)
        for r in session_results:
            r["similarity"] = min(
                1.0, r["similarity"] * session_weight
            )
            results.append(r)
            seen_files.add(r["file_path"])

        try:
            global_results = await global_search(query, top_k=top_k)
            for r in global_results:
                if r["file_path"] not in seen_files:
                    r["source"] = "global"
                    results.append(r)
                    seen_files.add(r["file_path"])
        except Exception as e:
            logger.warning(f"Global search failed: {e}")

        results.sort(key=lambda x: x["similarity"], reverse=True)

        return results[:top_k]


session_embeddings_manager = SessionEmbeddingsManager()


