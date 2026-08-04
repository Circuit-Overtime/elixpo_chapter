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
        edited = set(state.get("edited_paths") or [])
        if edited:
            reviewed = set(state.get("review_reads") or [])
            if not edited.issubset(reviewed):
                blocks = int(state.get("post_edit_review_blocks") or 0)
                if blocks < 2:
                    state["post_edit_review_blocks"] = blocks + 1
                    return (
                        2,
                        None,
                        "Do not stop after editing. Re-read every changed file, compare visible values and "
                        "behavior with the issue, and correct any incomplete implementation.",
                    )
                return 0, None, None
            blocks = int(state.get("post_edit_structured_blocks") or 0)
            if blocks < 1:
                state["post_edit_structured_blocks"] = blocks + 1
                return 2, None, "Post-edit review is complete. Call StructuredOutput with the checks and summary."
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
                state["review_reads"] = [
                    path for path in (state.get("review_reads") or []) if path != relative
                ]
                state["post_edit_review_blocks"] = 0
                state["post_edit_structured_blocks"] = 0
        return 0, None, None

    if event_name != "PreToolUse":
        return 0, None, None
    tool = str(event.get("tool_name") or "")
    tool_input = dict(event.get("tool_input") or {})
    cwd = Path(str(event.get("cwd") or ".")).resolve()

    if tool == "StructuredOutput":
        edited = set(state.get("edited_paths") or [])
        reviewed = set(state.get("review_reads") or [])
        if edited and not edited.issubset(reviewed):
            return 2, None, "Re-read every changed file and correct incomplete behavior before StructuredOutput."
        state["structured_output"] = True
        return 0, None, None

    if tool in {"Glob", "Grep"}:
        if tool == "Glob":
            pattern = str(tool_input.get("pattern") or "")
            pattern_path = Path(pattern)
            if pattern_path.is_absolute() or ".." in pattern_path.parts:
                return 2, None, "Glob only inside the current repository with a relative pattern."
        raw_path = str(tool_input.get("path") or ".")
        if raw_path == ".":
            relative = "."
        else:
            relative = _relative_path(cwd, raw_path)
            if relative is None:
                return 2, None, "Search only inside the current repository with a relative path."
        state["discovery_calls"] = int(state.get("discovery_calls") or 0) + 1
        if relative != raw_path:
            tool_input["path"] = relative
            return 0, {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "allow",
                    "permissionDecisionReason": "Normalized to the supervised repository root.",
                    "updatedInput": tool_input,
                }
            }, None
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
                return 2, None, "The evidence brief is already present in the task; inspect source files instead."
            edited = set(state.get("edited_paths") or [])
            key = "review_reads" if relative in edited else "source_reads"
            reads = list(state.get(key) or [])
            if relative not in reads:
                reads.append(relative)
            state[key] = reads
            if key == "source_reads":
                counts = dict(state.get("source_read_counts") or {})
                windows = list((state.get("read_windows") or {}).get(relative) or [])
                count = int(counts.get(relative) or 0)
                counts[relative] = count + 1
                state["source_read_counts"] = counts
                offset = int(windows[count % len(windows)] if windows else 0)
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
            if relative not in reads:
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
        if words[:2] == ["rtk", "grep"]:
            if any(word.startswith("/") or word == ".." or "../" in word for word in words[2:]):
                return 2, None, "Search only inside the current repository with relative RTK arguments."
            state["discovery_calls"] = int(state.get("discovery_calls") or 0) + 1
            return 0, None, None
        return 2, None, "Raw shell commands are blocked. Use built-in tools or relative `rtk grep`/`rtk read`."

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
