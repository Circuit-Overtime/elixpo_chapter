"""Deterministic verification fallback from repository manifests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

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
) -> tuple[HarnessOutcome, bool]:
    """Fill only omitted setup/check fields; never replace a model-selected command."""
    if not outcome.solvable:
        return outcome, False

    setup = list(outcome.setup_commands)
    checks = list(outcome.verification_commands)
    inferred = False
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
    return outcome.model_copy(
        update={"setup_commands": setup, "verification_commands": checks}
    ), inferred
