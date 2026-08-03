"""Read-only GitHub evidence collection for the Vet squad."""

from __future__ import annotations

import re
from typing import Any, Protocol

import httpx


class Fetcher(Protocol):
    async def _request(self, method: str, path: str, **kwargs: Any) -> Any: ...


def parse_issue_url(url: str) -> tuple[str, str, int]:
    match = re.fullmatch(r"https://github\.com/([^/]+)/([^/]+)/issues/(\d+)/?", url.strip())
    if not match:
        raise ValueError("expected https://github.com/OWNER/REPO/issues/NUMBER")
    return match.group(1), match.group(2), int(match.group(3))


async def fetch_issue_evidence(api: Fetcher, owner: str, repo: str, number: int) -> dict:
    base = f"/repos/{owner}/{repo}/issues/{number}"
    issue = await api._request("GET", base)
    comments = await api._request("GET", f"{base}/comments", params={"per_page": 100})
    timeline = await api._request("GET", f"{base}/timeline", params={"per_page": 100})
    sub_issues = await api._request("GET", f"{base}/sub_issues", params={"per_page": 100})
    try:
        parent = await api._request("GET", f"{base}/parent")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code != 404:
            raise
        parent = None

    search = await api._request(
        "GET",
        "/search/issues",
        params={"q": f'repo:{owner}/{repo} is:pr "#{number}"', "per_page": 100},
    )
    return {
        "issue": issue,
        "comments": comments if isinstance(comments, list) else [],
        "timeline": timeline if isinstance(timeline, list) else [],
        "sub_issues": sub_issues if isinstance(sub_issues, list) else [],
        "parent": parent if isinstance(parent, dict) else None,
        "pull_requests": search.get("items", []) if isinstance(search, dict) else [],
    }


def referenced_pull_requests(evidence: dict, number: int) -> list[dict]:
    """Collect timeline PRs and exact issue references from repository PR search."""
    found: dict[str, dict] = {}
    for event in evidence.get("timeline", []):
        source = (event.get("source") or {}).get("issue") or {}
        if event.get("event") != "cross-referenced" or not source.get("pull_request"):
            continue
        url = str(source.get("html_url") or source.get("url") or "")
        found[url or str(source.get("number"))] = source

    patterns = (rf"(?<!\w)#{number}(?!\d)", rf"/issues/{number}(?!\d)")
    for pull in evidence.get("pull_requests", []):
        text = f"{pull.get('title') or ''}\n{pull.get('body') or ''}"
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns):
            url = str(pull.get("html_url") or pull.get("url") or "")
            found[url or str(pull.get("number"))] = pull
    return list(found.values())
