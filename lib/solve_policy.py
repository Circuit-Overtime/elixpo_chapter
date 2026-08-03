"""Shared, declarative safety limits for Vet, Solve, and Submit."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


@lru_cache(maxsize=1)
def load_solve_policy(path: str | Path | None = None) -> dict[str, Any]:
    if path is None:
        from lib.config import settings

        path = settings.config_dir / "solve.yaml"
    data = yaml.safe_load(Path(path).read_text()) or {}
    if not isinstance(data, dict):
        raise ValueError("config/solve.yaml must contain a mapping")
    return data


def is_test_repository(repo: str, policy: dict[str, Any] | None = None) -> bool:
    policy = policy or load_solve_policy()
    return repo.casefold() in {
        str(item).casefold() for item in policy.get("test_repositories", [])
    }

