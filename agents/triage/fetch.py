"""GitHub fetching for Triage — open issues, timelines, and comments.

Injectable api (`_request`) so the orchestrator is testable without network.
"""

from __future__ import annotations

from typing import Any, Protocol


class Fetcher(Protocol):
    async def _request(self, method: str, path: str, **kwargs: Any) -> Any: ...


async def fetch_candidate_issues(api: Fetcher, full_name: str, per_repo: int = 10) -> list[dict]:
    """Fetch recently active open issues without requiring a label. Excludes PRs."""
    data = await api._request(
        "GET",
        f"/repos/{full_name}/issues",
        params={
            "state": "open",
            "per_page": per_repo,
            "sort": "updated",
            "direction": "desc",
        },
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


async def fetch_issue_timeline(api: Fetcher, full_name: str, number: int, per: int = 100) -> list[dict]:
    """Fetch timeline events used to detect pull requests already attempting the issue."""
    data = await api._request(
        "GET",
        f"/repos/{full_name}/issues/{number}/timeline",
        params={"per_page": per},
    )
    return data if isinstance(data, list) else []


async def search_pull_requests_referencing_issues(
    api: Fetcher,
    full_name: str,
    numbers: list[int],
    per: int = 100,
) -> list[dict]:
    """Search a repository's PRs for references to several issue numbers at once."""
    if not numbers:
        return []
    references = " OR ".join(f'"#{number}"' for number in numbers)
    data = await api._request(
        "GET",
        "/search/issues",
        params={"q": f"repo:{full_name} is:pr ({references})", "per_page": per},
    )
    return data.get("items", []) if isinstance(data, dict) else []
