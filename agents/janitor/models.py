"""Strict cleanup receipts owned by the Janitor squad."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CleanupResult(StrictModel):
    kind: str
    locator: str
    outcome: Literal["removed", "missing", "preserved", "terminated", "failed"]
    detail: str = ""


class DoctorAuthorization(StrictModel):
    schema_version: Literal[1]
    run_id: str
    key: str
    failure_fingerprint: str
    category: str
    stage: str
    action: Literal["retry", "terminate", "preserve"]
    reason: str
    retry_count: int = Field(ge=0, le=1)
    retry_after_seconds: int = Field(ge=0, le=300)
    cleanup_authorized: bool
    token_spent: int = Field(ge=0)
    token_limit: int = Field(ge=0)
    elapsed_seconds: float = Field(ge=0)
    decided_at: str


class JanitorReceipt(StrictModel):
    schema_version: Literal[1] = 1
    status: Literal["complete", "partial", "preserved"]
    run_id: str = ""
    key: str = ""
    doctor_fingerprint: str
    results: list[CleanupResult] = Field(default_factory=list, max_length=20)
    cleaned_at: str
