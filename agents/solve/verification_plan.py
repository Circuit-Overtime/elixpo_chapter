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
        return "./node_modules/.bin/biome check ."
    if (workspace / "tsconfig.json").is_file():
        return "./node_modules/.bin/tsc --noEmit"
    for preferred in ("lint", "test", "build"):
        if matching := _matching_script(scripts, preferred):
            return _node_script(manager, matching)
    return None


def _non_node_verifications(workspace: Path, changed_paths: list[str]) -> list[str]:
    suffixes = {Path(path).suffix.casefold() for path in changed_paths}
    commands: list[str] = []
    if ".py" in suffixes:
        if (workspace / "tests").is_dir():
            commands.append("python -m pytest")
        else:
            commands.append("python -m compileall .")
    if (workspace / "go.mod").is_file() and suffixes & {".go"}:
        commands.append("go test ./...")
    if (workspace / "Cargo.toml").is_file() and suffixes & {".rs"}:
        commands.append("cargo check")
    shell_paths = [path for path in changed_paths if Path(path).suffix.casefold() in {".sh", ".bash"}]
    if shell_paths:
        commands.append("shellcheck " + " ".join(shell_paths))
    yaml_paths = [path for path in changed_paths if Path(path).suffix.casefold() in {".yaml", ".yml"}]
    workflow_paths = [path for path in yaml_paths if Path(path).parts[:2] == (".github", "workflows")]
    if workflow_paths:
        commands.append("actionlint " + " ".join(workflow_paths))
    elif yaml_paths:
        commands.append("yamllint " + " ".join(yaml_paths))
    return commands


def _command_lane(command: str) -> str:
    executable = command.split(maxsplit=1)[0]
    executable_name = Path(executable).name
    if executable_name in {"npm", "npx", "pnpm", "yarn", "bun", "tsc", "biome", "eslint"}:
        return "node"
    if executable in {"python", "pytest", "ruff", "mypy", "pyright"}:
        return "python"
    if executable in {"shellcheck", "bash", "sh"}:
        return "shell"
    if executable in {"actionlint", "yamllint"}:
        return "yaml"
    if executable == "go":
        return "go"
    if executable == "cargo":
        return "rust"
    return ""


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
    required: list[str] = []
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
            command = _node_verification(workspace, manager, package)
            if command:
                required.append(command)

    required.extend(_non_node_verifications(workspace, changed_paths))
    covered = {_command_lane(command) for command in checks}
    for command in required:
        lane = _command_lane(command)
        if lane and lane not in covered and len(checks) < 3:
            checks.append(command)
            covered.add(lane)
            inferred = True
    if any(Path(path).suffix.casefold() == ".py" for path in changed_paths):
        if not setup and (workspace / "pyproject.toml").is_file():
            setup = ["python -m pip install -e ."]
            inferred = True

    if not checks:
        raise VerificationPlanError("no safe verification command was returned or inferred")
    return outcome.model_copy(update={"setup_commands": setup, "verification_commands": checks}), inferred
