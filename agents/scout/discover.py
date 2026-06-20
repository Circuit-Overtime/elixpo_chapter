"""Scout's GitHub fetching — search + CONTRIBUTING detection.

Takes any object with an async `_request(method, path, params=...)` (the
GitHubAPI client, or a fake in tests), so discovery is testable without network.
"""

from __future__ import annotations

from typing import Any, Protocol


class Fetcher(Protocol):
    async def _request(self, method: str, path: str, **kwargs: Any) -> Any: ...


async def search_repos(
    api: Fetcher,
    language: str,
    min_stars: int,
    max_stars: int,
    pushed_after: str,
    per_page: int = 30,
) -> list[dict]:
    """One GitHub repo-search page for a language, sorted by recent activity."""
    q = f"language:{language} stars:{min_stars}..{max_stars} pushed:>={pushed_after} archived:false"
    data = await api._request(
        "GET",
        "/search/repositories",
        params={"q": q, "sort": "updated", "order": "desc", "per_page": per_page},
    )
    return data.get("items", []) if isinstance(data, dict) else []


async def has_contributing(api: Fetcher, full_name: str) -> bool:
    """True if the repo has a CONTRIBUTING file (community-friendly signal)."""
    for path in ("CONTRIBUTING.md", ".github/CONTRIBUTING.md", "CONTRIBUTING"):
        try:
            await api._request("GET", f"/repos/{full_name}/contents/{path}")
            return True
        except Exception:
            continue
    return False
