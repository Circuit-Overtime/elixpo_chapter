"""repository_dispatch — fire custom events that trigger squad workflows.

The webhook worker and the squads chain through repository_dispatch: e.g. Scout
finishing dispatches `triage`, a merged PR dispatches `celebrate`. Thin wrapper
over the REST endpoint; auth via the GitHubAPI client (App token or GITHUB_TOKEN).
"""

from __future__ import annotations

from typing import Any

from lib.github.api import GitHubAPI


async def repository_dispatch(
    api: GitHubAPI,
    owner: str,
    repo: str,
    event_type: str,
    client_payload: dict[str, Any] | None = None,
) -> None:
    """POST /repos/{owner}/{repo}/dispatches. 204 No Content on success."""
    body: dict[str, Any] = {"event_type": event_type}
    if client_payload is not None:
        body["client_payload"] = client_payload
    await api._request("POST", f"/repos/{owner}/{repo}/dispatches", json=body)
