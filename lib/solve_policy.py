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
    return repo.casefold() in {str(item).casefold() for item in policy.get("test_repositories", [])}


def solve_token_limit(policy: dict[str, Any], vet: dict[str, Any] | None) -> int:
    """Turn Vet's estimate into bounded headroom; never trust state as a limit."""
    base = max(1, int(policy["token_budget"]))
    absolute = max(base, int(policy.get("max_token_budget", base)))
    if not vet or vet.get("suitable") is not True:
        return base
    try:
        estimate = int(vet.get("estimated_solve_tokens") or 0)
        ratio = float(policy.get("token_budget_headroom_ratio", 1.0))
    except (TypeError, ValueError):
        return base
    if estimate <= 0 or ratio <= 0:
        return base
    recommended = int(estimate * ratio)
    # Stable 10k bands avoid false precision in a semantic estimate.
    rounded = ((recommended + 9_999) // 10_000) * 10_000
    return min(absolute, max(base, rounded))
