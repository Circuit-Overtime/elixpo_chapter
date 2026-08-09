"""Validated, idempotent cleanup for Doctor-authorized resources."""

from __future__ import annotations

import os
import shutil
import signal
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from pydantic import ValidationError

from agents.janitor.models import CleanupResult, JanitorReceipt


class JanitorRejected(RuntimeError):
    pass


def _stamp(now: datetime | None = None) -> str:
    return (now or datetime.now(timezone.utc)).isoformat()


def _validated_child(locator: str, safe_root: str, allowed_root: Path, *, prefix: str = "") -> Path:
    declared_root = Path(safe_root).resolve()
    required_root = allowed_root.resolve()
    if declared_root != required_root:
        raise JanitorRejected(f"cleanup safe root is not allowed: {declared_root}")
    raw = Path(locator)
    if not raw.is_absolute() or raw.is_symlink() or ".." in raw.parts:
        raise JanitorRejected(f"cleanup locator is not an absolute non-symlink path: {locator}")
    resolved = raw.resolve(strict=False)
    if resolved == required_root or resolved.parent != required_root:
        raise JanitorRejected(f"cleanup locator is not a direct child of {required_root}: {locator}")
    if prefix and not resolved.name.startswith(prefix):
        raise JanitorRejected(f"cleanup locator lacks required prefix {prefix!r}: {locator}")
    return resolved


def _group_is_isolated_ccr(process_group: int, proc_root: Path = Path("/proc")) -> bool:
    if os.name != "posix" or process_group <= 1 or process_group == os.getpgrp():
        return False
    found = False
    for entry in proc_root.iterdir():
        if not entry.name.isdigit():
            continue
        try:
            if entry.stat().st_uid != os.getuid():
                continue
            fields = (entry / "stat").read_text(encoding="utf-8").split()
            if int(fields[4]) != process_group:
                continue
            command = (entry / "cmdline").read_bytes().replace(b"\0", b" ").decode(errors="replace")
            environment = (entry / "environ").read_bytes().split(b"\0")
            home = next((item[5:] for item in environment if item.startswith(b"HOME=")), b"")
            if "claude-code-router" in command and Path(home.decode(errors="replace")).name.startswith(
                "elixpoo-ccr-"
            ):
                found = True
        except (FileNotFoundError, PermissionError, ProcessLookupError, ValueError):
            continue
    return found


def _terminate_group(process_group: int) -> None:
    os.killpg(process_group, signal.SIGTERM)
    time.sleep(0.25)
    try:
        os.killpg(process_group, 0)
        os.killpg(process_group, signal.SIGKILL)
    except ProcessLookupError:
        pass


def _validate_resources(resources: list[dict[str, Any]], workspace_root: Path) -> list[tuple[str, Any, dict]]:
    if len(resources) > 20:
        raise JanitorRejected("cleanup manifest exceeds 20 resources")
    planned: list[tuple[str, Any, dict]] = []
    for raw in resources:
        kind = str(raw.get("kind") or "")
        disposition = str(raw.get("disposition") or "")
        locator = str(raw.get("locator") or "")
        if kind == "fork" and disposition == "preserve_shared_resource":
            planned.append((kind, locator, raw))
        elif kind == "workspace" and disposition == "remove_after_terminal_decision":
            planned.append((kind, _validated_child(locator, str(raw.get("safe_root") or ""), workspace_root), raw))
        elif kind == "process_group" and disposition == "terminate_after_terminal_decision":
            try:
                process_group = int(locator)
            except ValueError as exc:
                raise JanitorRejected(f"invalid process group locator: {locator}") from exc
            if not _group_is_isolated_ccr(process_group):
                raise JanitorRejected(f"process group is not a verified isolated CCR group: {locator}")
            planned.append((kind, process_group, raw))
        else:
            raise JanitorRejected(f"unsupported cleanup resource: {kind}/{disposition}")
    return planned


def clean_and_record(
    store,
    *,
    workspace_root: Path,
    now: datetime | None = None,
    remove_tree: Callable[[Path], None] = shutil.rmtree,
    terminate_group: Callable[[int], None] = _terminate_group,
) -> JanitorReceipt:
    solve = store.read_json("solve.json", {}) or {}
    doctor = store.read_json("doctor.json", {}) or {}
    current = doctor.get("current") or {}
    fingerprint = str(current.get("failure_fingerprint") or "")
    solve_doctor = solve.get("doctor") or {}
    cleanup = solve.get("cleanup") or {}
    if not fingerprint or solve_doctor.get("fingerprint") != fingerprint:
        raise JanitorRejected("Doctor and Solve receipts do not identify the same failure")

    existing = store.read_json("janitor.json", {}) or {}
    if existing.get("doctor_fingerprint") == fingerprint and existing.get("status") in {"complete", "preserved"}:
        try:
            return JanitorReceipt.model_validate(existing)
        except ValidationError as exc:
            raise JanitorRejected(f"state/janitor.json violates schema: {exc}") from exc

    action = str(current.get("action") or "")
    if action == "preserve" and cleanup.get("status") == "preserved_for_inspection":
        receipt = JanitorReceipt(
            status="preserved",
            run_id=str(solve.get("run_id") or ""),
            key=str(solve.get("key") or ""),
            doctor_fingerprint=fingerprint,
            results=[],
            cleaned_at=_stamp(now),
        )
        store.write_json("janitor.json", receipt.model_dump(mode="json"))
        return receipt
    if not bool(current.get("cleanup_authorized")) or cleanup.get("status") != "authorized":
        raise JanitorRejected("Doctor has not authorized cleanup")

    planned = _validate_resources(list(cleanup.get("resources") or []), workspace_root)
    results: list[CleanupResult] = []
    failed = False
    for kind, target, raw in planned:
        locator = str(raw.get("locator") or "")
        try:
            if kind == "fork":
                results.append(CleanupResult(kind=kind, locator=locator, outcome="preserved"))
            elif kind == "workspace":
                path = Path(target)
                if not path.exists():
                    results.append(CleanupResult(kind=kind, locator=locator, outcome="missing"))
                else:
                    remove_tree(path)
                    results.append(CleanupResult(kind=kind, locator=locator, outcome="removed"))
            elif kind == "process_group":
                terminate_group(int(target))
                results.append(CleanupResult(kind=kind, locator=locator, outcome="terminated"))
        except Exception as exc:  # deterministic receipt boundary; continue remaining validated resources
            failed = True
            results.append(CleanupResult(kind=kind, locator=locator, outcome="failed", detail=str(exc)[:500]))

    receipt = JanitorReceipt(
        status="partial" if failed else "complete",
        run_id=str(solve.get("run_id") or ""),
        key=str(solve.get("key") or ""),
        doctor_fingerprint=fingerprint,
        results=results,
        cleaned_at=_stamp(now),
    )
    cleanup["status"] = "partial" if failed else "complete"
    cleanup["cleaned_at"] = receipt.cleaned_at
    solve["cleanup"] = cleanup
    store.write_json("janitor.json", receipt.model_dump(mode="json"))
    store.write_json("solve.json", solve)
    return receipt
