"""Small JSON-file abstraction over one GitHub Gist."""

from __future__ import annotations

import json

from lib.state.followups import FollowupMemory

FOLLOWUP_FILENAME = "elixpoo-followups.json"


class FollowupGist:
    def __init__(self, api, gist_id: str, filename: str = FOLLOWUP_FILENAME):
        if not gist_id.strip():
            raise ValueError("follow-up Gist ID is required")
        self.api = api
        self.gist_id = gist_id.strip()
        self.filename = filename

    async def load(self) -> FollowupMemory:
        gist = await self.api._request("GET", f"/gists/{self.gist_id}")
        file = (gist.get("files") or {}).get(self.filename)
        if not file or not str(file.get("content") or "").strip():
            return FollowupMemory()
        if file.get("truncated"):
            raise RuntimeError("follow-up Gist file is unexpectedly truncated")
        try:
            payload = json.loads(file["content"])
        except (KeyError, TypeError, json.JSONDecodeError) as exc:
            raise RuntimeError("follow-up Gist contains invalid JSON") from exc
        return FollowupMemory.model_validate(payload)

    async def save(self, memory: FollowupMemory) -> None:
        content = json.dumps(memory.model_dump(mode="json"), indent=2, sort_keys=True) + "\n"
        await self.api._request(
            "PATCH",
            f"/gists/{self.gist_id}",
            json={"files": {self.filename: {"content": content}}},
        )
