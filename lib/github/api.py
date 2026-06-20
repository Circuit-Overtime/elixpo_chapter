"""GitHub REST API wrapper — authenticated requests scoped to installations."""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from elixpo.github.app import GitHubApp

log = structlog.get_logger()

GITHUB_API = "https://api.github.com"


class GitHubAPI:
    """Authenticated GitHub API client for a specific installation."""

    def __init__(self, github_app: GitHubApp, installation_id: int):
        self._app = github_app
        self._installation_id = installation_id
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create an authenticated HTTP client."""
        token = await self._app.get_installation_token(self._installation_id)
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
        resp = await client.request(method, path, **kwargs)
        resp.raise_for_status()
        if resp.status_code == 204:
            return None
        return resp.json()

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
        token = await self._app.get_installation_token(self._installation_id)
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
