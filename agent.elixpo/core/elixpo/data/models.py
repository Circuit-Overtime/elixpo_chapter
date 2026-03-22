"""Data models for Cloudflare D1 storage — users, repos, memories, installations."""

from __future__ import annotations

from pydantic import BaseModel, Field
import time
import uuid


class User(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    github_user_id: int | None = None
    github_username: str = ""
    email: str | None = None
    api_key_hash: str | None = None
    settings: dict = Field(default_factory=dict)
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)


class Repo(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    github_repo_id: int | None = None
    full_name: str = ""  # "owner/repo"
    installation_id: int | None = None
    default_branch: str = "main"
    language: str | None = None
    settings: dict = Field(default_factory=dict)
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)


class Memory(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    repo_id: str | None = None
    user_id: str | None = None
    category: str = "codebase_fact"  # pattern | decision | preference | codebase_fact
    content: str = ""
    source_session_id: str | None = None
    relevance_score: float = 1.0
    created_at: float = Field(default_factory=time.time)
    last_accessed_at: float = Field(default_factory=time.time)


class Installation(BaseModel):
    id: int  # GitHub App installation ID
    account_type: str = "user"  # user | organization
    account_login: str = ""
    account_id: int = 0
    permissions: dict = Field(default_factory=dict)
    events: list[str] = Field(default_factory=list)
    created_at: float = Field(default_factory=time.time)
    suspended_at: float | None = None
