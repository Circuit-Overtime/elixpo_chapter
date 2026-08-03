"""Strict structured outputs for the bounded Solve model calls."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


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
    old: str
    new: str


class FileEdit(StrictModel):
    path: str
    operation: str = Field(pattern="^(replace|create)$")
    replacements: list[Replacement] = Field(default_factory=list, max_length=8)
    content: str = ""


class StepImplementation(StrictModel):
    summary: str
    edits: list[FileEdit] = Field(min_length=1, max_length=5)


class ReviewVerdict(StrictModel):
    approved: bool
    summary: str
    findings: list[str] = Field(default_factory=list, max_length=5)
