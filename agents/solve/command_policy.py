"""Repository-derived command capabilities for Solve verification."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_SAFE_SCRIPT = re.compile(r"^(?:test|lint|typecheck|check|build|verify|validate|format(?::check)?)(?::[\w.-]+)?$")


def _package(workspace: Path) -> dict[str, Any]:
    try:
        value = json.loads((workspace / "package.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _node_managers(workspace: Path) -> list[str]:
    managers: list[str] = []
    if (workspace / "package-lock.json").is_file() or (workspace / "npm-shrinkwrap.json").is_file():
        managers.append("npm")
    if (workspace / "pnpm-lock.yaml").is_file():
        managers.append("pnpm")
    if (workspace / "yarn.lock").is_file():
        managers.append("yarn")
    if (workspace / "bun.lock").is_file() or (workspace / "bun.lockb").is_file():
        managers.append("bun")
    if not managers and (workspace / "package.json").is_file():
        managers.append("npm")
    return managers


def repository_command_prefixes(workspace: Path) -> list[str]:
    """Return exact, evidence-backed verification prefixes for this checkout."""
    prefixes: list[str] = []
    package = _package(workspace)
    scripts = package.get("scripts") or {}
    if isinstance(scripts, dict):
        for manager in _node_managers(workspace):
            for name in sorted(str(item) for item in scripts if _SAFE_SCRIPT.fullmatch(str(item))):
                prefixes.append(f"{manager} run {name}" if manager in {"npm", "bun"} else f"{manager} {name}")
        if (workspace / "tsconfig.json").is_file():
            prefixes.append("npx tsc")

    if (workspace / "pyproject.toml").is_file() or (workspace / "setup.py").is_file():
        prefixes.extend(
            [
                "pytest",
                "python -m pytest",
                "python -m compileall",
                "python -m ruff check",
                "python -m ruff format --check",
                "python -m mypy",
                "python -m pyright",
                "ruff check",
                "ruff format --check",
                "mypy",
                "pyright",
            ]
        )
    if (workspace / "go.mod").is_file():
        prefixes.extend(["go test", "go vet", "gofmt -d"])
    if (workspace / "Cargo.toml").is_file():
        prefixes.extend(["cargo check", "cargo test", "cargo clippy", "cargo fmt --check"])
    if any(path.suffix == ".sh" for path in workspace.rglob("*.sh")):
        prefixes.extend(["shellcheck", "bash -n", "sh -n"])
    return list(dict.fromkeys(prefixes))


def repository_setup_prefixes(workspace: Path) -> list[str]:
    """Return dependency setup commands justified by tracked manifests."""
    prefixes: list[str] = []
    if (workspace / "package-lock.json").is_file() or (workspace / "npm-shrinkwrap.json").is_file():
        prefixes.append("npm ci --ignore-scripts")
    if (workspace / "pnpm-lock.yaml").is_file():
        prefixes.append("pnpm install --frozen-lockfile --ignore-scripts")
    if (workspace / "yarn.lock").is_file():
        prefixes.append("yarn install --immutable --ignore-scripts")
    if (workspace / "bun.lock").is_file() or (workspace / "bun.lockb").is_file():
        prefixes.append("bun install --frozen-lockfile --ignore-scripts")
    if (workspace / "pyproject.toml").is_file() or (workspace / "setup.py").is_file():
        prefixes.append("python -m pip install -e .")
    return prefixes


def effective_prefixes(workspace: Path, configured: list[str], *, setup: bool = False) -> list[str]:
    discovered = repository_setup_prefixes(workspace) if setup else repository_command_prefixes(workspace)
    return list(dict.fromkeys([*configured, *discovered]))
