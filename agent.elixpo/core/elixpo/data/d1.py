"""Cloudflare D1 client — sync session metadata, users, repos, memories to edge DB."""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from elixpo.config import settings

log = structlog.get_logger()

# D1 REST API base (via Cloudflare API)
CF_API = "https://api.cloudflare.com/client/v4"


class D1Client:
    """Client for Cloudflare D1 database operations via REST API.

    Used by the VPS-hosted core to sync metadata to the edge database.
    The Worker (workers/src/index.ts) handles direct D1 bindings.
    """

    def __init__(
        self,
        account_id: str | None = None,
        database_id: str | None = None,
        api_token: str | None = None,
    ):
        self.account_id = account_id or settings.cloudflare.account_id
        self.database_id = database_id or settings.cloudflare.d1_database_id
        self.api_token = api_token or settings.cloudflare.api_token
        self._client = httpx.AsyncClient(
            base_url=CF_API,
            headers={
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def query(self, sql: str, params: list | None = None) -> list[dict]:
        """Execute a SQL query against D1 and return results."""
        payload: dict[str, Any] = {"sql": sql}
        if params:
            payload["params"] = params

        resp = await self._client.post(
            f"/accounts/{self.account_id}/d1/database/{self.database_id}/query",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        results = data.get("result", [])
        if results and isinstance(results, list):
            # D1 API returns [{results: [...], success: true}]
            return results[0].get("results", [])
        return []

    async def execute(self, sql: str, params: list | None = None) -> bool:
        """Execute a SQL statement (INSERT/UPDATE/DELETE)."""
        payload: dict[str, Any] = {"sql": sql}
        if params:
            payload["params"] = params

        resp = await self._client.post(
            f"/accounts/{self.account_id}/d1/database/{self.database_id}/query",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("success", False)

    # --- Convenience methods ---

    async def upsert_session_meta(self, session_data: dict) -> bool:
        """Sync a session's metadata to D1."""
        return await self.execute(
            """INSERT OR REPLACE INTO sessions_meta
               (id, status, trigger, repo_full_name, issue_number, pr_number,
                user_id, created_at, updated_at, completed_at,
                prompt_tokens, completion_tokens, total_tokens,
                current_step, result_pr_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                session_data.get("id"),
                session_data.get("status"),
                session_data.get("trigger"),
                session_data.get("repo_full_name"),
                session_data.get("issue_number"),
                session_data.get("pr_number"),
                session_data.get("user_id"),
                session_data.get("created_at"),
                session_data.get("updated_at"),
                session_data.get("completed_at"),
                session_data.get("token_usage", {}).get("prompt_tokens", 0),
                session_data.get("token_usage", {}).get("completion_tokens", 0),
                session_data.get("token_usage", {}).get("total_tokens", 0),
                session_data.get("current_step", 0),
                session_data.get("result_pr_url"),
            ],
        )

    async def upsert_user(self, user_data: dict) -> bool:
        return await self.execute(
            """INSERT OR REPLACE INTO users
               (id, github_user_id, github_username, email, api_key_hash, settings, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                user_data.get("id"),
                user_data.get("github_user_id"),
                user_data.get("github_username"),
                user_data.get("email"),
                user_data.get("api_key_hash"),
                str(user_data.get("settings", "{}")),
                user_data.get("created_at"),
                user_data.get("updated_at"),
            ],
        )

    async def get_user_by_github_id(self, github_user_id: int) -> dict | None:
        results = await self.query(
            "SELECT * FROM users WHERE github_user_id = ?",
            [github_user_id],
        )
        return results[0] if results else None

    async def save_memory(self, memory_data: dict) -> bool:
        return await self.execute(
            """INSERT INTO memories
               (id, repo_id, user_id, category, content, source_session_id,
                relevance_score, created_at, last_accessed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                memory_data.get("id"),
                memory_data.get("repo_id"),
                memory_data.get("user_id"),
                memory_data.get("category"),
                memory_data.get("content"),
                memory_data.get("source_session_id"),
                memory_data.get("relevance_score", 1.0),
                memory_data.get("created_at"),
                memory_data.get("last_accessed_at"),
            ],
        )

    async def get_memories(
        self,
        repo_id: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[dict]:
        sql = "SELECT * FROM memories WHERE 1=1"
        params = []
        if repo_id:
            sql += " AND repo_id = ?"
            params.append(repo_id)
        if category:
            sql += " AND category = ?"
            params.append(category)
        sql += " ORDER BY relevance_score DESC LIMIT ?"
        params.append(limit)
        return await self.query(sql, params)

    async def close(self):
        await self._client.aclose()
