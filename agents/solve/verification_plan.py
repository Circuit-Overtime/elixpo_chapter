"""Deterministic verification fallback from repository manifests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from agents.solve.git import CommandRejected, validate_command
from agents.solve.models import HarnessOutcome


class VerificationPlanError(RuntimeError):
    pass


def _node_package_manager(workspace: Path) -> tuple[str, str] | None:
    choices = (
        ("package-lock.json", "npm", "npm ci --ignore-scripts"),
        ("npm-shrinkwrap.json", "npm", "npm ci --ignore-scripts"),
        ("pnpm-lock.yaml", "pnpm", "pnpm install --frozen-lockfile --ignore-scripts"),
        ("yarn.lock", "yarn", "yarn install --immutable --ignore-scripts"),
        ("bun.lock", "bun", "bun install --frozen-lockfile --ignore-scripts"),
        ("bun.lockb", "bun", "bun install --frozen-lockfile --ignore-scripts"),
    )
    for lockfile, manager, setup in choices:
        if (workspace / lockfile).is_file():
            return manager, setup
    return None


def _node_script(manager: str, name: str) -> str:
    return f"{manager} run {name}" if manager in {"npm", "bun"} else f"{manager} {name}"


def _matching_script(scripts: dict[str, Any], preferred: str) -> str | None:
    matches = sorted(str(name) for name in scripts if str(name) == preferred or str(name).startswith(f"{preferred}:"))
    return matches[0] if matches else None


def _uses_biome(workspace: Path, package: dict[str, Any]) -> bool:
    dependencies: dict[str, Any] = {}
    for field in ("dependencies", "devDependencies"):
        declared = package.get(field)
        if isinstance(declared, dict):
            dependencies.update(declared)
    return (
        "@biomejs/biome" in dependencies
        or (workspace / "biome.json").is_file()
        or (workspace / "biome.jsonc").is_file()
    )


def _node_verification(workspace: Path, manager: str, package: dict[str, Any]) -> str | None:
    scripts = package.get("scripts") or {}
    for preferred in ("typecheck", "check"):
        if matching := _matching_script(scripts, preferred):
            return _node_script(manager, matching)
    if _uses_biome(workspace, package):
        return "npx biome check ."
    if (workspace / "tsconfig.json").is_file():
        return "npx tsc --noEmit"
    for preferred in ("lint", "test", "build"):
        if matching := _matching_script(scripts, preferred):
            return _node_script(manager, matching)
    return None


def _non_node_verification(workspace: Path, changed_paths: list[str]) -> str | None:
    suffixes = {Path(path).suffix.casefold() for path in changed_paths}
    if ".py" in suffixes:
        if (workspace / "tests").is_dir():
            return "python -m pytest"
        return "python -m compileall ."
    if (workspace / "go.mod").is_file() and suffixes & {".go"}:
        return "go test ./..."
    if (workspace / "Cargo.toml").is_file() and suffixes & {".rs"}:
        return "cargo check"
    shell_paths = [path for path in changed_paths if Path(path).suffix.casefold() in {".sh", ".bash"}]
    if shell_paths:
        return "shellcheck " + " ".join(shell_paths)
    return None


def complete_verification_plan(
    workspace: Path,
    outcome: HarnessOutcome,
    changed_paths: list[str],
    *,
    allowed_setup_prefixes: list[str] | None = None,
    allowed_command_prefixes: list[str] | None = None,
) -> tuple[HarnessOutcome, bool]:
    """Keep safe model commands and deterministically replace omitted or unsafe ones."""
    if not outcome.solvable:
        return outcome, False

    setup = list(outcome.setup_commands)
    checks = list(outcome.verification_commands)
    inferred = False
    if allowed_setup_prefixes is not None:
        filtered_setup = []
        for command in setup:
            try:
                validate_command(command, allowed_setup_prefixes)
            except CommandRejected:
                inferred = True
            else:
                filtered_setup.append(command)
        setup = filtered_setup
    if allowed_command_prefixes is not None:
        filtered_checks = []
        for command in checks:
            try:
                validate_command(command, allowed_command_prefixes)
            except CommandRejected:
                inferred = True
            else:
                filtered_checks.append(command)
        checks = filtered_checks
    package_file = workspace / "package.json"
    node_change = any(Path(path).suffix.casefold() in {".js", ".jsx", ".ts", ".tsx"} for path in changed_paths)
    if package_file.is_file() and node_change:
        try:
            package = json.loads(package_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise VerificationPlanError(f"cannot read package.json for verification: {exc}") from exc
        manager_plan = _node_package_manager(workspace)
        if manager_plan is not None:
            manager, setup_command = manager_plan
            if not setup:
                setup = [setup_command]
                inferred = True
            if not checks:
                command = _node_verification(workspace, manager, package)
                if command:
                    checks = [command]
                    inferred = True

    if not checks:
        command = _non_node_verification(workspace, changed_paths)
        if command:
            checks = [command]
            inferred = True
    if any(Path(path).suffix.casefold() == ".py" for path in changed_paths):
        if not setup and (workspace / "pyproject.toml").is_file():
            setup = ["python -m pip install -e ."]
            inferred = True

    if not checks:
        raise VerificationPlanError("no safe verification command was returned or inferred")
    return outcome.model_copy(update={"setup_commands": setup, "verification_commands": checks}), inferred
