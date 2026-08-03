"""Strict structured outputs for the bounded Solve model calls."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlanStep(StrictModel):
    purpose: str
    files: list[str] = Field(min_length=1, max_length=5)
    setup_commands: list[str] = Field(default_factory=list, max_length=1)
    verification_commands: list[str] = Field(default_factory=list, max_length=3)
    commit_message: str


class SolvePlan(StrictModel):
    solvable: bool
    estimated_minutes: int = Field(ge=0)
    rationale: str
    needs_search: bool
    search_query: str = ""
    context_files: list[str] = Field(default_factory=list, max_length=8)
    steps: list[PlanStep] = Field(default_factory=list, max_length=2)


class Replacement(StrictModel):
    old: str = Field(min_length=1, max_length=4000)
    new: str = Field(max_length=6000)


class ReplaceFileEdit(StrictModel):
    path: str
    operation: Literal["replace"]
    replacements: list[Replacement] = Field(min_length=1, max_length=8)


class CreateFileEdit(StrictModel):
    path: str
    operation: Literal["create"]
    content: str = Field(min_length=1, max_length=8000)


FileEdit = Annotated[ReplaceFileEdit | CreateFileEdit, Field(discriminator="operation")]


class StepImplementation(StrictModel):
    summary: str = Field(max_length=500)
    edits: list[FileEdit] = Field(min_length=1, max_length=5)


class ReviewVerdict(StrictModel):
    approved: bool
    summary: str
    findings: list[str] = Field(default_factory=list, max_length=5)


class HarnessOutcome(StrictModel):
    solvable: bool
    estimated_minutes: int = Field(ge=0, le=15)
    rationale: str = Field(min_length=1, max_length=1000)
    summary: str = Field(min_length=1, max_length=1000)
    setup_commands: list[str] = Field(default_factory=list, max_length=1)
    verification_commands: list[str] = Field(default_factory=list, max_length=3)
    commit_message: str = Field(default="", max_length=120)

    @model_validator(mode="after")
    def require_execution_fields_for_solution(self) -> HarnessOutcome:
        if self.solvable and not self.commit_message.strip():
            raise ValueError("a solvable outcome requires a commit message")
        return self
