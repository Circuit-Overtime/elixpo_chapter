"""Enhanced Pollinations API wrapper with retries, timeouts, and Bearer auth."""

import time
import logging

from openai import OpenAI, APIError, APITimeoutError, RateLimitError

from app.core.config import (
    POLLINATIONS_API_KEY,
    POLLINATIONS_BASE_URL,
    DEFAULT_MODEL,
    LLM_TIMEOUT,
    LLM_MAX_RETRIES,
    LLM_RETRY_BASE_DELAY,
)

logger = logging.getLogger(__name__)

_client = None


def get_client() -> OpenAI:
    """Get or create the Pollinations OpenAI-compatible client."""
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=POLLINATIONS_BASE_URL,
            api_key=POLLINATIONS_API_KEY or "dummy",
            default_headers={"Authorization": f"Bearer {POLLINATIONS_API_KEY}"},
            timeout=LLM_TIMEOUT,
        )
    return _client


def chat(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 1.0,
    seed: int = -1,
    max_tokens: int | None = None,
) -> str:
    """Send a chat completion with automatic retries and exponential backoff.

    Retries on API errors and rate limits. Raises after max retries exceeded.
    """
    model = model or DEFAULT_MODEL
    client = get_client()

    last_error = None
    for attempt in range(1, LLM_MAX_RETRIES + 1):
        try:
            kwargs = dict(
                model=model,
                messages=messages,
                temperature=temperature,
                seed=seed,
            )
            if max_tokens:
                kwargs["max_tokens"] = max_tokens

            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content

        except (APITimeoutError, RateLimitError, APIError) as e:
            last_error = e
            if attempt == LLM_MAX_RETRIES:
                break
            delay = LLM_RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.warning(
                "LLM call failed (attempt %d/%d): %s — retrying in %.1fs",
                attempt, LLM_MAX_RETRIES, e, delay,
            )
            time.sleep(delay)

    raise RuntimeError(
        f"LLM call failed after {LLM_MAX_RETRIES} attempts: {last_error}"
    )


def chat_stream(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 1.0,
    seed: int = -1,
):
    """Stream chat completion tokens. Yields content strings as they arrive."""
    model = model or DEFAULT_MODEL
    client = get_client()

    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        seed=seed,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
