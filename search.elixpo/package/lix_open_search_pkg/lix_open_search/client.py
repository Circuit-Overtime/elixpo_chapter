from __future__ import annotations

import json
from typing import Any, Iterator, AsyncIterator, Optional

import httpx

from lix_open_search.models import (
    SearchResult,
    Message,
    Session,
    SurfResult,
    StreamChunk,
)


_DEFAULT_TIMEOUT = 120.0


class LixSearch:
    """Synchronous client for the lixSearch API.

    Usage::

        lix = LixSearch("http://localhost:9002")
        result = lix.search("quantum computing breakthroughs")
        print(result.content)

        # Streaming
        for chunk in lix.search_stream("latest AI papers"):
            print(chunk.content, end="", flush=True)
    """

    def __init__(
        self,
        base_url: str = "http://localhost:9002",
        api_key: Optional[str] = None,
        timeout: float = _DEFAULT_TIMEOUT,
    ):
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["X-API-Key"] = api_key
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers=headers,
            timeout=timeout,
        )

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # ── Search ──────────────────────────────────────────────

    def search(
        self,
        query: str,
        *,
        session_id: Optional[str] = None,
        images: Optional[list[str]] = None,
    ) -> SearchResult:
        messages = _build_messages(query, images)
        body: dict[str, Any] = {"messages": messages, "stream": False}
        if session_id:
            body["session_id"] = session_id
        resp = self._client.post("/v1/chat/completions", json=body)
        resp.raise_for_status()
        data = resp.json()
        return SearchResult.from_openai_response(data, session_id)

    def search_stream(
        self,
        query: str,
        *,
        session_id: Optional[str] = None,
        images: Optional[list[str]] = None,
    ) -> Iterator[StreamChunk]:
        messages = _build_messages(query, images)
        body: dict[str, Any] = {"messages": messages, "stream": True}
        if session_id:
            body["session_id"] = session_id
        with self._client.stream("POST", "/v1/chat/completions", json=body) as resp:
            resp.raise_for_status()
            yield from _iter_sse(resp.iter_lines())

    # ── Chat (multi-turn) ──────────────────────────────────

    def chat(
        self,
        messages: list[dict[str, str] | Message],
        *,
        session_id: Optional[str] = None,
        stream: bool = False,
    ) -> SearchResult | Iterator[StreamChunk]:
        msg_dicts = [
            {"role": m.role, "content": m.content} if isinstance(m, Message) else m
            for m in messages
        ]
        body: dict[str, Any] = {"messages": msg_dicts, "stream": stream}
        if session_id:
            body["session_id"] = session_id

        if stream:
            return self._chat_stream(body)

        resp = self._client.post("/v1/chat/completions", json=body)
        resp.raise_for_status()
        return SearchResult.from_openai_response(resp.json(), session_id)

    def _chat_stream(self, body: dict) -> Iterator[StreamChunk]:
        with self._client.stream("POST", "/v1/chat/completions", json=body) as resp:
            resp.raise_for_status()
            yield from _iter_sse(resp.iter_lines())

    # ── Surf (lightweight, no LLM) ─────────────────────────

    def surf(
        self,
        query: str,
        *,
        limit: int = 5,
        images: bool = False,
    ) -> SurfResult:
        resp = self._client.post(
            "/api/surf",
            json={"query": query, "limit": limit, "images": images},
        )
        resp.raise_for_status()
        data = resp.json()
        return SurfResult(
            urls=data.get("urls", []),
            query=data.get("query", query),
            images=data.get("images", []),
            raw=data,
        )

    # ── Sessions ───────────────────────────────────────────

    def create_session(self, query: str) -> Session:
        resp = self._client.post("/api/session/create", json={"query": query})
        resp.raise_for_status()
        data = resp.json()
        return Session(
            session_id=data["session_id"],
            query=data.get("query"),
            created_at=data.get("created_at"),
            raw=data,
        )

    def get_session(self, session_id: str) -> Session:
        resp = self._client.get(f"/api/session/{session_id}")
        resp.raise_for_status()
        data = resp.json()
        return Session(session_id=data["session_id"], raw=data)

    def get_history(self, session_id: str) -> list[Message]:
        resp = self._client.get(f"/api/session/{session_id}/history")
        resp.raise_for_status()
        data = resp.json()
        return [
            Message(role=m["role"], content=m["content"])
            for m in data.get("conversation_history", [])
        ]

    def delete_session(self, session_id: str) -> None:
        resp = self._client.delete(f"/api/session/{session_id}")
        resp.raise_for_status()

    # ── Health ─────────────────────────────────────────────

    def health(self) -> dict:
        resp = self._client.get("/api/health")
        resp.raise_for_status()
        return resp.json()


class AsyncLixSearch:
    """Async client for the lixSearch API.

    Usage::

        async with AsyncLixSearch("http://localhost:9002") as lix:
            result = await lix.search("quantum computing")
            print(result.content)

            async for chunk in lix.search_stream("latest AI papers"):
                print(chunk.content, end="", flush=True)
    """

    def __init__(
        self,
        base_url: str = "http://localhost:9002",
        api_key: Optional[str] = None,
        timeout: float = _DEFAULT_TIMEOUT,
    ):
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["X-API-Key"] = api_key
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers=headers,
            timeout=timeout,
        )

    async def close(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()

    # ── Search ──────────────────────────────────────────────

    async def search(
        self,
        query: str,
        *,
        session_id: Optional[str] = None,
        images: Optional[list[str]] = None,
    ) -> SearchResult:
        messages = _build_messages(query, images)
        body: dict[str, Any] = {"messages": messages, "stream": False}
        if session_id:
            body["session_id"] = session_id
        resp = await self._client.post("/v1/chat/completions", json=body)
        resp.raise_for_status()
        return SearchResult.from_openai_response(resp.json(), session_id)

    async def search_stream(
        self,
        query: str,
        *,
        session_id: Optional[str] = None,
        images: Optional[list[str]] = None,
    ) -> AsyncIterator[StreamChunk]:
        messages = _build_messages(query, images)
        body: dict[str, Any] = {"messages": messages, "stream": True}
        if session_id:
            body["session_id"] = session_id
        async with self._client.stream("POST", "/v1/chat/completions", json=body) as resp:
            resp.raise_for_status()
            async for chunk in _aiter_sse(resp.aiter_lines()):
                yield chunk

    # ── Chat (multi-turn) ──────────────────────────────────

    async def chat(
        self,
        messages: list[dict[str, str] | Message],
        *,
        session_id: Optional[str] = None,
    ) -> SearchResult:
        msg_dicts = [
            {"role": m.role, "content": m.content} if isinstance(m, Message) else m
            for m in messages
        ]
        body: dict[str, Any] = {"messages": msg_dicts, "stream": False}
        if session_id:
            body["session_id"] = session_id
        resp = await self._client.post("/v1/chat/completions", json=body)
        resp.raise_for_status()
        return SearchResult.from_openai_response(resp.json(), session_id)

    async def chat_stream(
        self,
        messages: list[dict[str, str] | Message],
        *,
        session_id: Optional[str] = None,
    ) -> AsyncIterator[StreamChunk]:
        msg_dicts = [
            {"role": m.role, "content": m.content} if isinstance(m, Message) else m
            for m in messages
        ]
        body: dict[str, Any] = {"messages": msg_dicts, "stream": True}
        if session_id:
            body["session_id"] = session_id
        async with self._client.stream("POST", "/v1/chat/completions", json=body) as resp:
            resp.raise_for_status()
            async for chunk in _aiter_sse(resp.aiter_lines()):
                yield chunk

    # ── Surf ───────────────────────────────────────────────

    async def surf(
        self,
        query: str,
        *,
        limit: int = 5,
        images: bool = False,
    ) -> SurfResult:
        resp = await self._client.post(
            "/api/surf",
            json={"query": query, "limit": limit, "images": images},
        )
        resp.raise_for_status()
        data = resp.json()
        return SurfResult(
            urls=data.get("urls", []),
            query=data.get("query", query),
            images=data.get("images", []),
            raw=data,
        )

    # ── Sessions ───────────────────────────────────────────

    async def create_session(self, query: str) -> Session:
        resp = await self._client.post("/api/session/create", json={"query": query})
        resp.raise_for_status()
        data = resp.json()
        return Session(
            session_id=data["session_id"],
            query=data.get("query"),
            created_at=data.get("created_at"),
            raw=data,
        )

    async def get_session(self, session_id: str) -> Session:
        resp = await self._client.get(f"/api/session/{session_id}")
        resp.raise_for_status()
        data = resp.json()
        return Session(session_id=data["session_id"], raw=data)

    async def get_history(self, session_id: str) -> list[Message]:
        resp = await self._client.get(f"/api/session/{session_id}/history")
        resp.raise_for_status()
        data = resp.json()
        return [
            Message(role=m["role"], content=m["content"])
            for m in data.get("conversation_history", [])
        ]

    async def delete_session(self, session_id: str) -> None:
        resp = await self._client.delete(f"/api/session/{session_id}")
        resp.raise_for_status()

    async def health(self) -> dict:
        resp = await self._client.get("/api/health")
        resp.raise_for_status()
        return resp.json()


# ── Helpers ────────────────────────────────────────────────


def _build_messages(query: str, images: list[str] | None = None) -> list[dict]:
    if not images:
        return [{"role": "user", "content": query}]
    content: list[dict] = [{"type": "text", "text": query}]
    for url in images[:3]:
        content.append({"type": "image_url", "image_url": {"url": url}})
    return [{"role": "user", "content": content}]


def _iter_sse(lines) -> Iterator[StreamChunk]:
    for line in lines:
        if not line.startswith("data: "):
            continue
        payload = line[6:].strip()
        if payload == "[DONE]":
            return
        try:
            data = json.loads(payload)
            delta = data.get("choices", [{}])[0].get("delta", {})
            content = delta.get("content", "")
            finish = data.get("choices", [{}])[0].get("finish_reason")
            if content or finish:
                yield StreamChunk(content=content, finish_reason=finish, raw=data)
        except json.JSONDecodeError:
            continue


async def _aiter_sse(lines) -> AsyncIterator[StreamChunk]:
    async for line in lines:
        if not line.startswith("data: "):
            continue
        payload = line[6:].strip()
        if payload == "[DONE]":
            return
        try:
            data = json.loads(payload)
            delta = data.get("choices", [{}])[0].get("delta", {})
            content = delta.get("content", "")
            finish = data.get("choices", [{}])[0].get("finish_reason")
            if content or finish:
                yield StreamChunk(content=content, finish_reason=finish, raw=data)
        except json.JSONDecodeError:
            continue
