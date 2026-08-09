"""Validated, idempotent cleanup for Doctor-authorized resources."""

from __future__ import annotations

import os
import shutil
import signal
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from pydantic import ValidationError

from agents.janitor.models import CleanupResult, DoctorAuthorization, JanitorReceipt


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


def _validate_resources(
    resources: list[dict[str, Any]],
    workspace_root: Path,
    temporary_root: Path,
) -> list[tuple[str, Any, dict]]:
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
        elif kind == "temporary_directory" and disposition == "remove_after_terminal_decision":
            planned.append(
                (
                    kind,
                    _validated_child(
                        locator,
                        str(raw.get("safe_root") or ""),
                        temporary_root,
                        prefix="elixpoo-ccr-",
                    ),
                    raw,
                )
            )
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
    temporary_root: Path = Path("/tmp"),
    now: datetime | None = None,
    remove_tree: Callable[[Path], None] = shutil.rmtree,
    terminate_group: Callable[[int], None] = _terminate_group,
    allow_partial: bool = False,
) -> JanitorReceipt:
    solve = store.read_json("solve.json", {}) or {}
    doctor = store.read_json("doctor.json", {}) or {}
    cleanup = solve.get("cleanup") or {}
    if cleanup.get("schema_version") != 1 or cleanup.get("owner") != "janitor":
        raise JanitorRejected("Solve cleanup manifest violates its ownership or schema contract")

    submit = store.read_json("submit.json", {}) or {}
    submitted_head = str(solve.get("head_sha") or "")
    submitted = (
        solve.get("status") == "submitted"
        and submit.get("status") == "submitted"
        and bool(submitted_head)
        and cleanup.get("status") in {"authorized_after_submit", "partial"}
        and cleanup.get("authorized_by") == "submit"
        and str(submit.get("key") or "") == str(solve.get("key") or "")
        and str(submit.get("head_sha") or "") == submitted_head
        and str(cleanup.get("submission_head_sha") or "") == submitted_head
    )
    current: DoctorAuthorization | None = None
    if submitted:
        fingerprint = f"submit:{str(solve.get('head_sha') or '')[:20]}"
        run_id = str(solve.get("run_id") or "")
        authorization_source = "submit"
    else:
        try:
            current = DoctorAuthorization.model_validate(doctor.get("current"))
        except ValidationError as exc:
            raise JanitorRejected(f"Doctor authorization violates schema: {exc}") from exc
        fingerprint = current.failure_fingerprint
        run_id = current.run_id
        authorization_source = "doctor"
        solve_doctor = solve.get("doctor") or {}
        if not fingerprint or solve_doctor.get("fingerprint") != fingerprint:
            raise JanitorRejected("Doctor and Solve receipts do not identify the same failure")

    if str(cleanup.get("run_id") or "") != run_id or str(solve.get("run_id") or "") != run_id:
        raise JanitorRejected("authorization and cleanup receipts do not identify the same run")

    existing = store.read_json("janitor.json", {}) or {}
    existing_authorization = existing.get("authorization_id") or existing.get("doctor_fingerprint")
    if (
        existing_authorization == fingerprint
        and existing.get("run_id") == run_id
        and existing.get("status") in {"complete", "preserved"}
    ):
        try:
            return JanitorReceipt.model_validate(existing)
        except ValidationError as exc:
            raise JanitorRejected(f"state/janitor.json violates schema: {exc}") from exc

    action = current.action if current is not None else "submitted"
    if current is not None and action == "preserve" and cleanup.get("status") == "preserved_for_inspection":
        receipt = JanitorReceipt(
            status="preserved",
            run_id=str(solve.get("run_id") or ""),
            key=str(solve.get("key") or ""),
            authorization_source="doctor",
            authorization_id=fingerprint,
            doctor_fingerprint=fingerprint,
            results=[],
            cleaned_at=_stamp(now),
        )
        store.write_json("janitor.json", receipt.model_dump(mode="json"))
        return receipt
    if submitted:
        allowed_statuses = {"authorized_after_submit", "partial"} if allow_partial else {"authorized_after_submit"}
        authorized = cleanup.get("status") in allowed_statuses
    else:
        allowed_statuses = {"authorized", "partial"} if allow_partial else {"authorized"}
        authorized = bool(current and current.cleanup_authorized and cleanup.get("status") in allowed_statuses)
    if not authorized:
        raise JanitorRejected("neither Doctor nor a matching successful Submit authorized cleanup")

    planned = _validate_resources(list(cleanup.get("resources") or []), workspace_root, temporary_root)
    results: list[CleanupResult] = []
    failed = False
    for kind, target, raw in planned:
        locator = str(raw.get("locator") or "")
        try:
            if kind == "fork":
                results.append(CleanupResult(kind=kind, locator=locator, outcome="preserved"))
            elif kind in {"workspace", "temporary_directory"}:
                path = _validated_child(
                    locator,
                    str(raw.get("safe_root") or ""),
                    workspace_root if kind == "workspace" else temporary_root,
                    prefix="" if kind == "workspace" else "elixpoo-ccr-",
                )
                if not path.exists():
                    results.append(CleanupResult(kind=kind, locator=locator, outcome="missing"))
                else:
                    remove_tree(path)
                    results.append(CleanupResult(kind=kind, locator=locator, outcome="removed"))
            elif kind == "process_group":
                if not _group_is_isolated_ccr(int(target)):
                    raise JanitorRejected(f"process group identity changed before termination: {target}")
                terminate_group(int(target))
                results.append(CleanupResult(kind=kind, locator=locator, outcome="terminated"))
        except Exception as exc:  # deterministic receipt boundary; continue remaining validated resources
            failed = True
            results.append(CleanupResult(kind=kind, locator=locator, outcome="failed", detail=str(exc)[:500]))

    receipt = JanitorReceipt(
        status="partial" if failed else "complete",
        run_id=str(solve.get("run_id") or ""),
        key=str(solve.get("key") or ""),
        authorization_source=authorization_source,
        authorization_id=fingerprint,
        doctor_fingerprint=fingerprint if authorization_source == "doctor" else "",
        results=results,
        cleaned_at=_stamp(now),
    )
    cleanup["status"] = "partial" if failed else "complete"
    cleanup["cleaned_at"] = receipt.cleaned_at
    solve["cleanup"] = cleanup
    store.write_json("janitor.json", receipt.model_dump(mode="json"))
    store.write_json("solve.json", solve)
    return receipt


def audit_partial_cleanup(
    store,
    *,
    workspace_root: Path,
    ttl_hours: int = 24,
    now: datetime | None = None,
    remove_tree: Callable[[Path], None] = shutil.rmtree,
) -> JanitorReceipt | None:
    """Retry only an expired, previously authorized partial cleanup receipt."""
    current_time = now or datetime.now(timezone.utc)
    previous = store.read_json("janitor.json", {}) or {}
    if previous.get("status") != "partial":
        return None
    try:
        cleaned_at = datetime.fromisoformat(str(previous.get("cleaned_at") or "").replace("Z", "+00:00"))
    except ValueError as exc:
        raise JanitorRejected("partial Janitor receipt has an invalid timestamp") from exc
    bounded_ttl = max(1, min(int(ttl_hours), 168))
    if cleaned_at > current_time - timedelta(hours=bounded_ttl):
        return None
    return clean_and_record(
        store,
        workspace_root=workspace_root,
        now=current_time,
        remove_tree=remove_tree,
        allow_partial=True,
    )
