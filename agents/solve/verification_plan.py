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
        ("pnpm-lock.yaml", "pnpm", "pnpm install --frozen-lockfile --ignore-scripts"),
        ("yarn.lock", "yarn", "yarn install --immutable --ignore-scripts"),
    )
    for lockfile, manager, setup in choices:
        if (workspace / lockfile).is_file():
            return manager, setup
    return None


def _node_verification(workspace: Path, manager: str, scripts: dict[str, Any]) -> str | None:
    if "typecheck" in scripts:
        return f"{manager} run typecheck" if manager == "npm" else f"{manager} typecheck"
    if (workspace / "tsconfig.json").is_file():
        return "npx tsc --noEmit"
    if "lint" in scripts:
        return f"{manager} run lint" if manager == "npm" else f"{manager} lint"
    if "test" in scripts:
        return "npm test" if manager == "npm" else f"{manager} test"
    if "build" in scripts:
        return f"{manager} run build" if manager == "npm" else f"{manager} build"
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
                command = _node_verification(workspace, manager, package.get("scripts") or {})
                if command:
                    checks = [command]
                    inferred = True

    if not checks and any(Path(path).suffix.casefold() == ".py" for path in changed_paths):
        if (workspace / "tests").is_dir():
            checks = ["pytest"]
            inferred = True
        if not setup and (workspace / "pyproject.toml").is_file():
            setup = ["python -m pip install -e ."]
            inferred = True

    if not checks:
        raise VerificationPlanError("no safe verification command was returned or inferred")
    return outcome.model_copy(update={"setup_commands": setup, "verification_commands": checks}), inferred
