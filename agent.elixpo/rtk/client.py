"""OpenAI-compatible LLM client with streaming support."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx
import structlog

from elixpo.config import settings
from elixpo.llm.models import (
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
        api_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 300.0,
    ):
        raw_url = (api_url or settings.llm.api_url).rstrip("/")
        # If the URL already ends with /chat/completions, strip it —
        # we append it ourselves in chat() and chat_stream()
        if raw_url.endswith("/chat/completions"):
            raw_url = raw_url[: -len("/chat/completions")]
        self.api_url = raw_url
        self.api_key = api_key or settings.llm.api_key
        self.model = model or settings.llm.model
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
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ChatCompletionResponse:
        """Send a non-streaming chat completion request."""
        request = ChatCompletionRequest(
            model=self.model,
            messages=messages,
            tools=tools if tools else None,
            tool_choice="auto" if tools else None,
            temperature=temperature if temperature is not None else settings.llm.temperature,
            max_tokens=max_tokens,
            stream=False,
        )
        payload = request.model_dump(exclude_none=True)

        log.debug("llm.request", model=self.model, message_count=len(messages))

        resp = await self._client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()

        result = ChatCompletionResponse(**data)
        log.debug(
            "llm.response",
            finish_reason=result.choices[0].finish_reason if result.choices else None,
            usage=result.usage.model_dump() if result.usage else None,
        )
        return result

    async def chat_stream(
        self,
        messages: list[Message],
        tools: list[ToolDef] | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[ChatCompletionChunk]:
        """Send a streaming chat completion request, yielding chunks."""
        request = ChatCompletionRequest(
            model=self.model,
            messages=messages,
            tools=tools if tools else None,
            tool_choice="auto" if tools else None,
            temperature=temperature if temperature is not None else settings.llm.temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        payload = request.model_dump(exclude_none=True)

        log.debug("llm.stream_request", model=self.model, message_count=len(messages))

        async with self._client.stream("POST", "/chat/completions", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk_data = json.loads(data_str)
                    yield ChatCompletionChunk(**chunk_data)
                except (json.JSONDecodeError, Exception) as e:
                    log.warning("llm.stream_parse_error", error=str(e), data=data_str[:200])

    async def close(self):
        await self._client.aclose()


def assemble_tool_result(tool_call_id: str, content: str) -> Message:
    """Create a tool result message."""
    return Message(role="tool", content=content, tool_call_id=tool_call_id)


def collect_stream_tool_calls(chunks: list[StreamChoice]) -> list[dict]:
    """Reassemble tool calls from streamed deltas."""
    calls: dict[int, dict] = {}
    for choice in chunks:
        if choice.delta.tool_calls:
            for tc in choice.delta.tool_calls:
                idx = 0  # most providers use index 0 for single tool call
                if tc.id:
                    calls[idx] = {"id": tc.id, "type": "function", "function": {"name": "", "arguments": ""}}
                if idx in calls:
                    if tc.function.name:
                        calls[idx]["function"]["name"] += tc.function.name
                    if tc.function.arguments:
                        calls[idx]["function"]["arguments"] += tc.function.arguments
    return list(calls.values())
