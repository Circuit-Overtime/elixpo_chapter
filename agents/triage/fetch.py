"""GitHub fetching for Triage — open good-first issues + their comments.

Injectable api (`_request`) so the orchestrator is testable without network.
"""

from __future__ import annotations

from typing import Any, Protocol

GOOD_FIRST_LABEL = "good first issue"


class Fetcher(Protocol):
    async def _request(self, method: str, path: str, **kwargs: Any) -> Any: ...


async def fetch_good_first_issues(api: Fetcher, full_name: str, per_repo: int = 10) -> list[dict]:
    """Open issues labelled 'good first issue' (Scout guaranteed >0). Excludes PRs."""
    data = await api._request(
        "GET",
        f"/repos/{full_name}/issues",
        params={"labels": GOOD_FIRST_LABEL, "state": "open", "per_page": per_repo, "sort": "updated"},
    )
    issues = data if isinstance(data, list) else []
    return [i for i in issues if "pull_request" not in i]


async def fetch_comments(api: Fetcher, full_name: str, number: int, per: int = 100) -> list[dict]:
    """Fetch a broad bounded comment window so recent claims are not hidden."""
    data = await api._request(
        "GET",
        f"/repos/{full_name}/issues/{number}/comments",
        params={"per_page": per},
    )
    comments = data if isinstance(data, list) else []
    return comments[-per:]
