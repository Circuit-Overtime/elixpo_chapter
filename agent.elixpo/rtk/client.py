"""OpenAI-compatible async LLM client. Self-contained — no global settings.

The router constructs one client per model with explicit credentials, so this
class never reaches for configuration on its own (keeps it unit-testable).
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx
import structlog

from rtk.models import (
    ChatCompletionChunk,
    ChatCompletionRequest,
    ChatCompletionResponse,
    Message,
    StreamChoice,
    ToolDef,
)

log = structlog.get_logger()


class LLMClient:
    """Sends chat completion requests to any OpenAI-compatible endpoint."""

    def __init__(
        self,
        api_url: str,
        api_key: str,
        model: str,
        timeout: float = 300.0,
    ):
        raw_url = api_url.rstrip("/")
        if raw_url.endswith("/chat/completions"):
            raw_url = raw_url[: -len("/chat/completions")]
        self.api_url = raw_url
        self.api_key = api_key
        self.model = model
        self._client = httpx.AsyncClient(
            base_url=self.api_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def chat(
        self,
        messages: list[Message],
        tools: list[ToolDef] | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> ChatCompletionResponse:
        request = ChatCompletionRequest(
            model=self.model,
            messages=messages,
            tools=tools or None,
            tool_choice="auto" if tools else None,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )
        resp = await self._client.post("/chat/completions", json=request.model_dump(exclude_none=True))
        resp.raise_for_status()
        return ChatCompletionResponse(**resp.json())

    async def chat_stream(
        self,
        messages: list[Message],
        tools: list[ToolDef] | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> AsyncIterator[ChatCompletionChunk]:
        request = ChatCompletionRequest(
            model=self.model,
            messages=messages,
            tools=tools or None,
            tool_choice="auto" if tools else None,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async with self._client.stream(
            "POST", "/chat/completions", json=request.model_dump(exclude_none=True)
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    yield ChatCompletionChunk(**json.loads(data_str))
                except (json.JSONDecodeError, ValueError) as e:
                    log.warning("llm.stream_parse_error", error=str(e), data=data_str[:200])

    async def close(self) -> None:
        await self._client.aclose()


def assemble_tool_result(tool_call_id: str, content: str) -> Message:
    return Message(role="tool", content=content, tool_call_id=tool_call_id)


def collect_stream_tool_calls(chunks: list[StreamChoice]) -> list[dict]:
    """Reassemble tool calls from streamed deltas."""
    calls: dict[int, dict] = {}
    for choice in chunks:
        if not choice.delta.tool_calls:
            continue
        for tc in choice.delta.tool_calls:
            idx = 0  # single-tool-call providers use index 0
            if tc.id:
                calls[idx] = {"id": tc.id, "type": "function", "function": {"name": "", "arguments": ""}}
            if idx in calls:
                if tc.function.name:
                    calls[idx]["function"]["name"] += tc.function.name
                if tc.function.arguments:
                    calls[idx]["function"]["arguments"] += tc.function.arguments
    return list(calls.values())
