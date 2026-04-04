"""
Unified embedding provider — supports local models (sentence_transformers)
or any OpenAI-compatible embedding API.

Configuration (config.json → "embeddings"):
  provider: "local" or "api"
  model:    model name or path
            - local: HuggingFace model ID or filesystem path
              e.g. "jinaai/jina-embeddings-v2-base-code", "/models/bge-m3"
            - api: model name sent in the API request
              e.g. "text-embedding-3-small"
  api_base_url: base URL for the API (only for provider=api)
              e.g. "https://api.openai.com/v1"

API key is read from EMBEDDINGS_API_KEY env var (only for provider=api).
"""

import asyncio
import logging
import os
from typing import Protocol

logger = logging.getLogger(__name__)


class EmbeddingProvider(Protocol):
    """Interface that both providers implement."""

    def embed_sync(self, texts: list[str]) -> list[list[float]]: ...
    async def embed(self, texts: list[str]) -> list[list[float]]: ...
    async def embed_query(self, text: str) -> list[float]: ...


class LocalEmbeddingProvider:
    """Embeds text using a local sentence_transformers model."""

    def __init__(self, model_path: str):
        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading local embedding model: {model_path}")
        self._model = SentenceTransformer(model_path, trust_remote_code=True)
        dim = self._model.get_sentence_embedding_dimension()
        logger.info(f"Local embedding model loaded — dimensions={dim}")

    def embed_sync(self, texts: list[str]) -> list[list[float]]:
        embeddings = self._model.encode(texts, show_progress_bar=False)
        return [e.tolist() for e in embeddings]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(self.embed_sync, texts)

    async def embed_query(self, text: str) -> list[float]:
        result = await self.embed([text])
        return result[0]


class APIEmbeddingProvider:
    """Embeds text using an OpenAI-compatible embedding API."""

    def __init__(self, model: str, api_base_url: str, api_key: str):
        from openai import OpenAI

        if not api_key:
            raise ValueError(
                "EMBEDDINGS_API_KEY env var is required when using provider='api'.\n"
                "Set it in your .env file."
            )
        if not api_base_url:
            raise ValueError(
                "embeddings.api_base_url is required in config.json when using provider='api'."
            )

        self._model_name = model
        self._client = OpenAI(api_key=api_key, base_url=api_base_url)
        logger.info(f"API embedding provider initialized — model={model}, base_url={api_base_url}")

    def embed_sync(self, texts: list[str]) -> list[list[float]]:
        response = self._client.embeddings.create(model=self._model_name, input=texts)
        return [item.embedding for item in response.data]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(self.embed_sync, texts)

    async def embed_query(self, text: str) -> list[float]:
        result = await self.embed([text])
        return result[0]


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
_provider: EmbeddingProvider | None = None


def get_provider() -> EmbeddingProvider:
    """Return the global embedding provider, creating it on first call."""
    global _provider
    if _provider is not None:
        return _provider

    from ..config import config

    provider_type = config.embeddings_provider
    model = config.embeddings_model

    if provider_type == "local":
        _provider = LocalEmbeddingProvider(model_path=model)
    elif provider_type == "api":
        api_key = os.getenv("EMBEDDINGS_API_KEY", "")
        _provider = APIEmbeddingProvider(
            model=model,
            api_base_url=config.embeddings_api_base_url,
            api_key=api_key,
        )
    else:
        raise ValueError(
            f"Unknown embeddings.provider: '{provider_type}'. Must be 'local' or 'api'."
        )

    return _provider


def reset_provider():
    """Reset the singleton (used during shutdown)."""
    global _provider
    _provider = None
