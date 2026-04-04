"""Cloudflare KV client — rate limiting, feature flags, ephemeral state."""

from __future__ import annotations

import httpx
import structlog

from elixpo.config import settings

log = structlog.get_logger()

CF_API = "https://api.cloudflare.com/client/v4"


class KVClient:
    """Client for Cloudflare Workers KV via REST API.

    Used for:
      - Rate limiting counters (per-user request counts)
      - Feature flags (enable/disable features globally)
      - Ephemeral state (temp tokens, pending operations)
    """

    def __init__(
        self,
        account_id: str | None = None,
        namespace_id: str | None = None,
        api_token: str | None = None,
    ):
        self.account_id = account_id or settings.cloudflare.account_id
        self.namespace_id = namespace_id or settings.cloudflare.kv_namespace_id
        self.api_token = api_token or settings.cloudflare.api_token
        self._client = httpx.AsyncClient(
            base_url=CF_API,
            headers={
                "Authorization": f"Bearer {self.api_token}",
            },
            timeout=15.0,
        )

    def _url(self, key: str = "") -> str:
        base = f"/accounts/{self.account_id}/storage/kv/namespaces/{self.namespace_id}/values"
        if key:
            return f"{base}/{key}"
        return base

    async def get(self, key: str) -> str | None:
        """Get a value by key. Returns None if not found."""
        resp = await self._client.get(self._url(key))
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.text

    async def put(self, key: str, value: str, ttl: int | None = None) -> bool:
        """Set a key-value pair. Optional TTL in seconds."""
        params = {}
        if ttl:
            params["expiration_ttl"] = str(ttl)
        resp = await self._client.put(
            self._url(key),
            content=value,
            headers={"Content-Type": "text/plain"},
            params=params,
        )
        resp.raise_for_status()
        return True

    async def delete(self, key: str) -> bool:
        """Delete a key."""
        resp = await self._client.delete(self._url(key))
        resp.raise_for_status()
        return True

    # --- Rate limiting helpers ---

    async def check_rate_limit(
        self,
        user_id: str,
        action: str = "session",
        max_requests: int = 10,
        window_seconds: int = 3600,
    ) -> tuple[bool, int]:
        """Check and increment a rate limit counter.

        Returns (allowed: bool, current_count: int).
        """
        key = f"ratelimit:{action}:{user_id}"
        current = await self.get(key)
        count = int(current) if current else 0

        if count >= max_requests:
            return False, count

        await self.put(key, str(count + 1), ttl=window_seconds)
        return True, count + 1

    # --- Feature flags ---

    async def get_flag(self, flag_name: str, default: bool = False) -> bool:
        """Get a feature flag value."""
        value = await self.get(f"flag:{flag_name}")
        if value is None:
            return default
        return value.lower() in ("true", "1", "yes")

    async def set_flag(self, flag_name: str, enabled: bool) -> None:
        """Set a feature flag."""
        await self.put(f"flag:{flag_name}", str(enabled).lower())

    async def close(self):
        await self._client.aclose()
