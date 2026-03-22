"""Session lifecycle management — create, persist, resume, manage state."""

from __future__ import annotations

import json
import os
import time
import uuid
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from elixpo.llm.models import Message


class SessionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SessionTrigger(str, Enum):
    GITHUB_WEBHOOK = "github_webhook"
    CLI = "cli"
    WEB_DASHBOARD = "web_dashboard"


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class Session(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    status: SessionStatus = SessionStatus.PENDING
    trigger: SessionTrigger = SessionTrigger.CLI
    repo_full_name: str | None = None
    issue_number: int | None = None
    pr_number: int | None = None
    user_id: str | None = None
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    completed_at: float | None = None
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    workspace_path: str = ""
    plan: str | None = None
    result_pr_url: str | None = None
    current_step: int = 0
    max_steps: int = 50
    messages: list[Message] = Field(default_factory=list)


class SessionStore:
    """Persist sessions to disk as JSON + message history as JSONL."""

    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

    def _session_dir(self, session_id: str) -> str:
        path = os.path.join(self.storage_path, session_id)
        os.makedirs(path, exist_ok=True)
        return path

    def save(self, session: Session) -> None:
        """Persist session metadata and messages to disk."""
        session.updated_at = time.time()
        sdir = self._session_dir(session.id)

        # Save metadata (without messages — those go to JSONL)
        meta = session.model_dump(exclude={"messages"})
        with open(os.path.join(sdir, "session.json"), "w") as f:
            json.dump(meta, f, indent=2, default=str)

        # Append new messages to JSONL
        messages_path = os.path.join(sdir, "messages.jsonl")
        existing_count = 0
        if os.path.exists(messages_path):
            with open(messages_path, "r") as f:
                existing_count = sum(1 for _ in f)

        if len(session.messages) > existing_count:
            with open(messages_path, "a") as f:
                for msg in session.messages[existing_count:]:
                    f.write(json.dumps(msg.model_dump(exclude_none=True)) + "\n")

    def load(self, session_id: str) -> Session | None:
        """Load a session from disk."""
        sdir = os.path.join(self.storage_path, session_id)
        meta_path = os.path.join(sdir, "session.json")
        if not os.path.exists(meta_path):
            return None

        with open(meta_path, "r") as f:
            meta = json.load(f)

        messages = []
        messages_path = os.path.join(sdir, "messages.jsonl")
        if os.path.exists(messages_path):
            with open(messages_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        messages.append(Message(**json.loads(line)))

        meta["messages"] = messages
        return Session(**meta)

    def list_sessions(self, limit: int = 50) -> list[dict[str, Any]]:
        """List session metadata (without messages) sorted by most recent."""
        sessions = []
        if not os.path.isdir(self.storage_path):
            return sessions

        for name in os.listdir(self.storage_path):
            meta_path = os.path.join(self.storage_path, name, "session.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r") as f:
                    sessions.append(json.load(f))

        sessions.sort(key=lambda s: s.get("updated_at", 0), reverse=True)
        return sessions[:limit]

    def delete(self, session_id: str) -> bool:
        """Delete a session from disk."""
        import shutil
        sdir = os.path.join(self.storage_path, session_id)
        if os.path.isdir(sdir):
            shutil.rmtree(sdir)
            return True
        return False
