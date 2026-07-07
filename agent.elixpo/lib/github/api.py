"""GitHub REST API wrapper — authenticated requests scoped to installations."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog

from lib.github.app import GitHubApp

log = structlog.get_logger()

GITHUB_API = "https://api.github.com"

_RETRY_STATUS = {502, 503, 504}
_MAX_RETRIES = 3


class GitHubAPI:
    """Authenticated GitHub API client.

    Two auth modes:
      - App installation: pass a GitHubApp + installation_id (acts as elixpoo[bot]).
      - Static token: GitHubAPI.from_token(GITHUB_TOKEN) for control-repo ops in CI.
    """

    def __init__(
        self,
        github_app: GitHubApp | None = None,
        installation_id: int | None = None,
        token: str | None = None,
    ):
        self._app = github_app
        self._installation_id = installation_id
        self._static_token = token
        self._client: httpx.AsyncClient | None = None

    @classmethod
    def from_token(cls, token: str) -> GitHubAPI:
        """Build a client from a plain token (e.g. Actions GITHUB_TOKEN)."""
        return cls(token=token)

    async def _token(self) -> str:
        if self._static_token:
            return self._static_token
        if self._app is None or self._installation_id is None:
            raise RuntimeError("GitHubAPI needs either a token or an app+installation_id")
        return await self._app.get_installation_token(self._installation_id)

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create an authenticated HTTP client."""
        token = await self._token()
        if self._client is not None:
            await self._client.aclose()
        self._client = httpx.AsyncClient(
            base_url=GITHUB_API,
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )
        return self._client

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        client = await self._get_client()
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES):
            try:
                resp = await client.request(method, path, **kwargs)
                if resp.status_code in _RETRY_STATUS and attempt < _MAX_RETRIES - 1:
                    await asyncio.sleep(2**attempt)  # 1s, 2s backoff on transient 5xx
                    continue
                resp.raise_for_status()
                if resp.status_code == 204:
                    return None
                return resp.json()
            except (httpx.TransportError, httpx.TimeoutException) as e:
                last_exc = e
                if attempt < _MAX_RETRIES - 1:
                    await asyncio.sleep(2**attempt)
                    continue
                raise
        if last_exc:
            raise last_exc

    async def close(self):
        if self._client:
            await self._client.aclose()

    # --- Repositories ---

    async def get_repo(self, owner: str, repo: str) -> dict:
        return await self._request("GET", f"/repos/{owner}/{repo}")

    async def get_repo_contents(self, owner: str, repo: str, path: str = "", ref: str | None = None) -> list | dict:
        params = {}
        if ref:
            params["ref"] = ref
        return await self._request("GET", f"/repos/{owner}/{repo}/contents/{path}", params=params)

    async def get_tree(self, owner: str, repo: str, sha: str = "HEAD", recursive: bool = True) -> dict:
        params = {"recursive": "1"} if recursive else {}
        return await self._request("GET", f"/repos/{owner}/{repo}/git/trees/{sha}", params=params)

    async def get_default_branch(self, owner: str, repo: str) -> str:
        repo_data = await self.get_repo(owner, repo)
        return repo_data.get("default_branch", "main")

    # --- Issues ---

    async def get_issue(self, owner: str, repo: str, issue_number: int) -> dict:
        return await self._request("GET", f"/repos/{owner}/{repo}/issues/{issue_number}")

    async def get_issue_comments(self, owner: str, repo: str, issue_number: int) -> list:
        return await self._request("GET", f"/repos/{owner}/{repo}/issues/{issue_number}/comments")

    async def create_issue_comment(self, owner: str, repo: str, issue_number: int, body: str) -> dict:
        return await self._request(
            "POST",
            f"/repos/{owner}/{repo}/issues/{issue_number}/comments",
            json={"body": body},
        )

    # --- Pull Requests ---

    async def get_pull(self, owner: str, repo: str, pr_number: int) -> dict:
        return await self._request("GET", f"/repos/{owner}/{repo}/pulls/{pr_number}")

    async def get_pull_diff(self, owner: str, repo: str, pr_number: int) -> str:
        """Get PR diff as text."""
        token = await self._token()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}",
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github.v3.diff",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            resp.raise_for_status()
            return resp.text

    async def get_pull_files(self, owner: str, repo: str, pr_number: int) -> list:
        return await self._request("GET", f"/repos/{owner}/{repo}/pulls/{pr_number}/files")

    async def get_pull_comments(self, owner: str, repo: str, pr_number: int) -> list:
        return await self._request("GET", f"/repos/{owner}/{repo}/pulls/{pr_number}/comments")

    async def create_pull(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        head: str,
        base: str,
    ) -> dict:
        return await self._request(
            "POST",
            f"/repos/{owner}/{repo}/pulls",
            json={
                "title": title,
                "body": body,
                "head": head,
                "base": base,
            },
        )

    async def create_pull_review(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        body: str,
        event: str = "COMMENT",  # APPROVE | REQUEST_CHANGES | COMMENT
    ) -> dict:
        return await self._request(
            "POST",
            f"/repos/{owner}/{repo}/pulls/{pr_number}/reviews",
            json={"body": body, "event": event},
        )

    # --- Git refs / branches ---

    async def create_ref(self, owner: str, repo: str, ref: str, sha: str) -> dict:
        """Create a git reference (branch). ref should be 'refs/heads/branch-name'."""
        return await self._request(
            "POST",
            f"/repos/{owner}/{repo}/git/refs",
            json={"ref": ref, "sha": sha},
        )

    async def get_ref(self, owner: str, repo: str, ref: str) -> dict:
        return await self._request("GET", f"/repos/{owner}/{repo}/git/ref/{ref}")

    # --- File operations via API (for small changes without cloning) ---

    async def create_or_update_file(
        self,
        owner: str,
        repo: str,
        path: str,
        content_b64: str,
        message: str,
        branch: str,
        sha: str | None = None,
    ) -> dict:
        payload: dict = {
            "message": message,
            "content": content_b64,
            "branch": branch,
        }
        if sha:
            payload["sha"] = sha
        return await self._request(
            "PUT",
            f"/repos/{owner}/{repo}/contents/{path}",
            json=payload,
        )
