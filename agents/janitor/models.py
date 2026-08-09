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


class JanitorReceipt(StrictModel):
    schema_version: Literal[1] = 1
    status: Literal["complete", "partial", "preserved"]
    run_id: str = ""
    key: str = ""
    doctor_fingerprint: str
    results: list[CleanupResult] = Field(default_factory=list, max_length=20)
    cleaned_at: str
