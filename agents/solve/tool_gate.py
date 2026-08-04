"""Deterministic Claude Code hook for Solve's bounded repository tool loop."""

from __future__ import annotations

import fcntl
import json
import os
import shlex
import sys
from pathlib import Path
from typing import Any


def _deny(reason: str) -> int:
    print(reason, file=sys.stderr)
    return 2


def _relative_path(cwd: Path, raw: str) -> str | None:
    candidate = Path(raw)
    if not candidate.is_absolute():
        if not raw or ".." in candidate.parts or candidate.parts[0] == ".git":
            return None
        return candidate.as_posix().removeprefix("./")

    # Models occasionally prepend a remembered checkout root. Recover only a
    # suffix that actually exists under this supervised cwd; never guess a new
    # or ambiguous target outside it.
    matches: list[str] = []
    parts = candidate.parts[1:]
    for index in range(len(parts)):
        suffix = Path(*parts[index:])
        if suffix.parts and suffix.parts[0] != ".git" and (cwd / suffix).exists():
            matches.append(suffix.as_posix())
    return min(matches, key=lambda value: len(Path(value).parts)) if matches else None


def _decision(event: dict[str, Any], state: dict[str, Any]) -> tuple[int, dict[str, Any] | None, str | None]:
    event_name = str(event.get("hook_event_name") or "")
    if event_name == "Stop":
        if state.get("structured_output"):
            return 0, None, None
        if state.get("edited_paths"):
            # A successful edit can use the supervisor's deterministic metadata
            # fallback; do not spend more turns forcing schema compliance.
            return 0, None, None
        blocks = int(state.get("stop_blocks") or 0)
        if blocks >= 2:
            return 0, None, None
        state["stop_blocks"] = blocks + 1
        if state.get("edited_paths"):
            reason = "Do not stop with prose. Call StructuredOutput now with the completed edit and checks."
        else:
            reason = (
                "Do not stop with prose. Edit the confirmed target now, or call StructuredOutput with "
                "solvable=false if the bounded evidence is insufficient."
            )
        return 2, None, reason

    if event_name == "PostToolUse":
        tool = str(event.get("tool_name") or "")
        if tool in {"Edit", "Write"}:
            cwd = Path(str(event.get("cwd") or ".")).resolve()
            raw = str((event.get("tool_input") or {}).get("file_path") or "")
            relative = _relative_path(cwd, raw)
            if relative is not None:
                edited = list(state.get("edited_paths") or [])
                if relative not in edited:
                    edited.append(relative)
                state["edited_paths"] = edited
        return 0, None, None

    if event_name != "PreToolUse":
        return 0, None, None
    tool = str(event.get("tool_name") or "")
    tool_input = dict(event.get("tool_input") or {})
    cwd = Path(str(event.get("cwd") or ".")).resolve()

    if tool == "StructuredOutput":
        if (
            tool_input.get("solvable") is False
            and not state.get("edited_paths")
            and state.get("source_reads")
            and int(state.get("decline_blocks") or 0) < 1
        ):
            state["decline_blocks"] = 1
            return (
                2,
                None,
                "Re-evaluate once: ambiguity alone is not a rejection. If the behavior is already satisfied or "
                "unsafe, return solvable=false again with concrete evidence; otherwise make the smallest "
                "grounded Edit.",
            )
        state["structured_output"] = True
        return 0, None, None

    if tool in {"Read", "Edit", "Write"}:
        raw = str(tool_input.get("file_path") or "")
        repaired_path = False
        if tool == "Edit" and not raw:
            reads = list(state.get("source_reads") or [])
            if len(reads) == 1:
                raw = reads[0]
                tool_input["file_path"] = raw
                repaired_path = True
        relative = _relative_path(cwd, raw)
        if relative is None:
            return (
                2,
                None,
                "Use an existing repository-relative path from the context bundle; never use an absolute root.",
            )
        updated = tool_input if repaired_path else None
        if relative != raw:
            tool_input["file_path"] = relative
            updated = tool_input

        if tool == "Read":
            if relative == ".elixpo-context/context.md":
                return 2, None, "The context bundle must be read once through `rtk read`, not built-in Read."
            edited = set(state.get("edited_paths") or [])
            key = "review_reads" if relative in edited else "source_reads"
            reads = list(state.get(key) or [])
            if key == "review_reads":
                if relative in reads:
                    return 2, None, "This changed path was already reviewed. Call StructuredOutput now."
                if len(reads) >= max(1, len(edited)):
                    return 2, None, "The bounded review-read budget is exhausted. Call StructuredOutput now."
                reads.append(relative)
                state[key] = reads
            else:
                counts = dict(state.get("source_read_counts") or {})
                windows = list((state.get("read_windows") or {}).get(relative) or [])
                count = int(counts.get(relative) or 0)
                per_path_limit = min(2, max(1, len(windows)))
                total_calls = sum(int(value or 0) for value in counts.values())
                if relative not in reads and len(reads) >= 2:
                    return 2, None, "Two candidate files are already grounded. Edit now or call StructuredOutput."
                if count >= per_path_limit:
                    return 2, None, "All seeded windows for this path were read. Edit now or call StructuredOutput."
                if total_calls >= 4:
                    return (
                        2,
                        None,
                        "The four-window source-read budget is exhausted. Edit now or call StructuredOutput.",
                    )
                if relative not in reads:
                    reads.append(relative)
                counts[relative] = count + 1
                state[key] = reads
                state["source_read_counts"] = counts
                offset = int(windows[count] if count < len(windows) else 0)
                if offset <= 0 and count == 0:
                    offset = int((state.get("read_offsets") or {}).get(relative) or 0)
                if offset > 0 and not tool_input.get("offset"):
                    tool_input["offset"] = offset
                    updated = tool_input
        if updated is not None:
            return 0, {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "allow",
                    "permissionDecisionReason": "Normalized to the supervised repository root.",
                    "updatedInput": updated,
                }
            }, None
        return 0, None, None

    if tool == "Bash":
        command = str(tool_input.get("command") or "").strip()
        try:
            words = shlex.split(command)
        except ValueError:
            return 2, None, "Only one simple `rtk read` or scoped `rtk grep` command is allowed."
        if words[:2] == ["rtk", "read"] and len(words) == 3:
            relative = _relative_path(cwd, words[2])
            if relative is None:
                return 2, None, "Use `rtk read` with one repository-relative tracked path."
            reads = list(state.get("rtk_reads") or [])
            if relative in reads:
                return 2, None, "That RTK path was already read. Edit now or call StructuredOutput."
            if len(reads) >= 2:
                return 2, None, "The RTK read budget is exhausted. Edit now or call StructuredOutput."
            reads.append(relative)
            state["rtk_reads"] = reads
            if relative != words[2]:
                tool_input["command"] = f"rtk read {shlex.quote(relative)}"
                return 0, {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "allow",
                        "updatedInput": tool_input,
                    }
                }, None
            return 0, None, None
        if words[:2] == ["rtk", "grep"] and state.get("source_reads"):
            return (
                2,
                None,
                "Candidate reads already grounded the code. Do not search again; Edit or call StructuredOutput.",
            )
        if words[:2] == ["rtk", "grep"] and not state.get("grep_used"):
            state["grep_used"] = True
            return 0, None, None
        return 2, None, "Raw shell discovery is blocked. Use only one scoped `rtk grep` or a relative `rtk read`."

    return 0, None, None


def main() -> int:
    state_path = Path(os.environ["ELIXPO_TOOL_GATE_STATE"])
    state_path.parent.mkdir(parents=True, exist_ok=True)
    event = json.load(sys.stdin)
    with state_path.open("a+", encoding="utf-8") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        handle.seek(0)
        try:
            state = json.load(handle)
        except json.JSONDecodeError:
            state = {}
        code, output, reason = _decision(event, state)
        if code == 2:
            state["denied_calls"] = int(state.get("denied_calls") or 0) + 1
            if reason:
                state["last_denial"] = reason[:240]
        handle.seek(0)
        handle.truncate()
        json.dump(state, handle, separators=(",", ":"))
        handle.flush()
        fcntl.flock(handle, fcntl.LOCK_UN)
    if output is not None:
        print(json.dumps(output, separators=(",", ":")))
    if reason:
        print(reason, file=sys.stderr)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
