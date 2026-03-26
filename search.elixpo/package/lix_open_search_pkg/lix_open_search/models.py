from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Message:
    role: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class StreamChunk:
    content: str
    finish_reason: Optional[str] = None
    raw: Optional[dict] = None


@dataclass
class SearchResult:
    content: str
    model: str = "lixsearch"
    session_id: Optional[str] = None
    usage: Optional[dict] = None
    raw: Optional[dict] = None

    @classmethod
    def from_openai_response(cls, data: dict, session_id: str | None = None) -> SearchResult:
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        return cls(
            content=message.get("content", ""),
            model=data.get("model", "lixsearch"),
            session_id=session_id,
            usage=data.get("usage"),
            raw=data,
        )


@dataclass
class Session:
    session_id: str
    query: Optional[str] = None
    created_at: Optional[str] = None
    history: list[Message] = field(default_factory=list)
    raw: Optional[dict] = None


@dataclass
class SurfResult:
    urls: list[str]
    query: str
    images: list[str] = field(default_factory=list)
    raw: Optional[dict] = None
