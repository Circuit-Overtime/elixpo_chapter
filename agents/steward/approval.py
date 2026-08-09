"""Create durable, manually approved mention requests in the control repository."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

APPROVAL_LABEL = "elixpoo/approved"
REQUEST_LABEL = "elixpoo/approval-required"
_BLOCK_RE = re.compile(
    r"<!-- elixpoo-mention-approval:v1\s*(\{.*?\})\s*-->", re.DOTALL
)


def approval_fingerprint(repository: str, subject_number: int, source_id: int) -> str:
    raw = f"{repository.casefold()}#{subject_number}:{source_id}"
    return hashlib.sha256(raw.encode()).hexdigest()[:20]


def approval_body(payload: dict[str, Any]) -> str:
    metadata = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return (
        "A public `@elixpoo` request requires maintainer approval before any reply or "
        "repository action.\n\n"
        f"- Source: {payload['subject_url']}\n"
        f"- Requested by: `@{payload['author']}`\n"
        f"- Kind: `{payload['subject_kind']}`\n\n"
        f"Add `{APPROVAL_LABEL}` to authorize one bounded response. Closing this issue "
        "without that label denies the request.\n\n"
        f"<!-- elixpoo-mention-approval:v1\n{metadata}\n-->"
    )


def parse_approval(body: str) -> dict[str, Any]:
    match = _BLOCK_RE.search(body or "")
    if not match:
        raise ValueError("approval issue has no valid mention metadata")
    payload = json.loads(match.group(1))
    required = {
        "repository",
        "subject_kind",
        "subject_number",
        "subject_url",
        "source_id",
        "author",
        "body",
        "fingerprint",
    }
    if not required.issubset(payload):
        raise ValueError("approval metadata is incomplete")
    return payload


async def create_approval(api, control_repo: str, payload: dict[str, Any]) -> dict:
    owner, repo = control_repo.split("/", 1)
    await api.ensure_label(owner, repo, REQUEST_LABEL, "b60205", "Manual approval required")
    await api.ensure_label(owner, repo, APPROVAL_LABEL, "0e8a16", "Approved agent action")
    title = (
        f"[MENTION APPROVAL] {payload['repository']}#{payload['subject_number']} "
        f"from @{payload['author']}"
    )[:250]
    return await api.create_issue(
        owner,
        repo,
        title,
        approval_body(payload),
        labels=[REQUEST_LABEL],
    )
