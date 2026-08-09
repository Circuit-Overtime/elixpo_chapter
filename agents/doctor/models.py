"""Strict state contracts owned by the Doctor squad."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FailureEvidence(StrictModel):
    schema_version: Literal[1]
    category: str
    stage: str
    exception_type: str
    message: str
    retryable: bool
    candidate_action: str
    occurred_at: str


class DoctorDecision(StrictModel):
    schema_version: Literal[1] = 1
    run_id: str = ""
    key: str = ""
    failure_fingerprint: str
    category: str
    stage: str
    action: Literal["retry", "terminate", "preserve"]
    reason: str
    retry_count: int = Field(default=0, ge=0, le=1)
    retry_after_seconds: int = Field(default=0, ge=0, le=300)
    cleanup_authorized: bool
    token_spent: int = Field(default=0, ge=0)
    token_limit: int = Field(default=0, ge=0)
    elapsed_seconds: float = Field(default=0, ge=0)
    decided_at: str


class DoctorState(StrictModel):
    schema_version: Literal[1] = 1
    status: Literal["decided"] = "decided"
    current: DoctorDecision
    history: list[DoctorDecision] = Field(default_factory=list, max_length=50)
