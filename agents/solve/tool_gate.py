"""Deterministic Claude Code hook for Solve's bounded repository tool loop."""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
import shlex
import sys
from pathlib import Path
from typing import Any

_SHELL_CONTROL = {";", "&&", "||", "|", ">", ">>", "<", "`"}
_READ_ONLY_COMMANDS = {
    "rg": set(),
    "grep": set(),
    "ls": set(),
    "head": set(),
    "tail": set(),
    "wc": set(),
    "sed": {"-i", "--in-place"},
    "find": {"-delete", "-exec", "-execdir", "-ok", "-okdir"},
}
_READ_ONLY_GIT = {"diff", "status", "show", "grep", "ls-files"}
_READ_ONLY_RTK = {"read", "grep", "find", "smart"}
_GIT_DENIED = {"--output", "--ext-diff", "--textconv", "--open-files-in-pager"}


def _live_loop_guard(tool: str, tool_input: dict[str, Any], state: dict[str, Any]) -> str | None:
    """Steer repeated tool chains while allowing novel, productive work."""
    if tool == "StructuredOutput":
        return None
    material = json.dumps(tool_input, sort_keys=True, separators=(",", ":"), default=str)
    signature = hashlib.sha256(f"{tool}|{material}".encode()).hexdigest()[:16]
    history = list(state.get("live_tool_history") or [])
    history.append(signature)
    history = history[-8:]
    state["live_tool_history"] = history
    state["live_tool_calls"] = int(state.get("live_tool_calls") or 0) + 1

    exact_calls = max(2, min(int(state.get("live_repeat_exact_calls") or 3), 8))
    cycle_calls = max(4, min(int(state.get("live_repeat_cycle_calls") or 6), 8))
    if cycle_calls % 2:
        cycle_calls += 1
    exact = len(history) >= exact_calls and len(set(history[-exact_calls:])) == 1
    cycle = history[-cycle_calls:]
    alternating = (
        len(cycle) == cycle_calls
        and len(set(cycle[::2])) == 1
        and len(set(cycle[1::2])) == 1
    )
    if not exact and not alternating:
        if state.get("live_discovery_restricted") and tool in {"Read", "Glob", "Grep", "Bash", "WebSearch"}:
            return (
                "Live Doctor paused further discovery after repeated loops. Use the evidence already gathered "
                "to Edit/Write, or call StructuredOutput with a concrete terminal result."
            )
        return None

    strikes = int(state.get("live_loop_strikes") or 0) + 1
    state["live_loop_strikes"] = strikes
    state["live_last_loop_kind"] = "exact" if exact else "alternating"
    pause_after = max(1, min(int(state.get("live_loop_strikes_before_pause") or 3), 8))
    if strikes >= pause_after:
        state["live_discovery_restricted"] = True
    return (
        "Live Doctor detected a repeated tool chain. Do not repeat the same command or read. "
        "Use the result already returned, choose one genuinely different targeted action, edit the grounded file, "
        "or call StructuredOutput."
    )


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


def _is_checkout_absolute(cwd: Path, raw: str) -> bool:
    """Return whether an absolute tool path is the client's canonical cwd path."""
    candidate = Path(raw)
    if not candidate.is_absolute():
        return False
    try:
        candidate.resolve().relative_to(cwd.resolve())
    except (OSError, RuntimeError, ValueError):
        return False
    return True


def _shell_words(command: str) -> list[str]:
    lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|<>()`")
    lexer.whitespace_split = True
    return list(lexer)


def _contains_denied(words: list[str], denied: set[str]) -> bool:
    return any(
        word in denied
        or any(word.startswith(f"{flag}=") for flag in denied)
        or any(flag.startswith("-") and not flag.startswith("--") and word.startswith(flag) for flag in denied)
        for word in words
    )


def _read_only_shell(words: list[str]) -> bool:
    """Recognize discovery commands that cannot intentionally modify the checkout."""
    if not words or any(word in _SHELL_CONTROL for word in words):
        return False
    if any(
        word.startswith(("/", "~")) or word == ".." or "../" in word or "$" in word
        for word in words[1:]
    ):
        return False
    command = words[0]
    if command == "rtk":
        if len(words) < 2 or words[1] not in _READ_ONLY_RTK:
            return False
        if words[1] == "find" and _contains_denied(words[2:], _READ_ONLY_COMMANDS["find"]):
            return False
        return words[1] != "smart" or "--force-download" not in words[2:]
    if command == "git":
        return len(words) >= 2 and words[1] in _READ_ONLY_GIT and not _contains_denied(words[2:], _GIT_DENIED)
    denied = _READ_ONLY_COMMANDS.get(command)
    if command == "rg" and any(word == "--pre" or word.startswith("--pre=") for word in words[1:]):
        return False
    return denied is not None and not _contains_denied(words[1:], denied)


def _recover_unparsed_file_input(tool: str, value: Any) -> dict[str, Any] | None:
    """Recover complete, schema-shaped Edit/Write JSON rejected by the client parser."""
    if not isinstance(value, str) or not value.strip() or len(value) > 128_000:
        return None
    text = value.strip()
    candidates = [text]
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3 and lines[-1].strip() == "```":
            candidates.append("\n".join(lines[1:-1]).strip())
    start, end = text.find("{"), text.rfind("}")
    if 0 <= start < end:
        candidates.append(text[start : end + 1])

    required = {
        "Edit": ("file_path", "old_string", "new_string"),
        "Write": ("file_path", "content"),
    }[tool]
    allowed = {*required, "replace_all"} if tool == "Edit" else set(required)
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        decoded: Any = candidate
        for _ in range(2):
            if not isinstance(decoded, str):
                break
            try:
                # Some compatible providers emit literal newlines inside Edit
                # strings. They are unambiguous but rejected by strict JSON.
                decoded = json.loads(decoded, strict=False)
            except (json.JSONDecodeError, TypeError):
                decoded = None
                break
        if not isinstance(decoded, dict):
            continue
        if not all(isinstance(decoded.get(key), str) for key in required):
            continue
        repaired = {key: decoded[key] for key in allowed if key in decoded}
        if "replace_all" in repaired and not isinstance(repaired["replace_all"], bool):
            repaired.pop("replace_all")
        return repaired
    return None


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
                if blocks >= 1:
                    # Compatible providers occasionally ignore a Stop denial and
                    # emit more prose instead of the requested Read. End that
                    # token loop; the Python supervisor will only recover this
                    # handoff when every real changed path was grounded by a
                    # successful pre-edit read and the deterministic diff gates
                    # still pass.
                    state["deterministic_review_requested"] = True
                    return 0, None, None
                state["post_edit_review_blocks"] = blocks + 1
                return (
                    2,
                    None,
                    "Do not stop after editing. Re-read every changed file, compare visible values and "
                    "behavior with the issue, and correct any incomplete implementation.",
                )
            blocks = int(state.get("post_edit_structured_blocks") or 0)
            if blocks < 1:
                state["post_edit_structured_blocks"] = blocks + 1
                return 2, None, "Post-edit review is complete. Call StructuredOutput with the checks and summary."
            return 0, None, None
        grounded = list(state.get("source_reads") or [])
        if grounded:
            paths = ", ".join(f"`{path}`" for path in grounded[:5])
            return (
                2,
                None,
                f"Repository reads already succeeded for {paths}. Do not answer with another plan. "
                "Use that evidence to call Edit/Write now, make one genuinely different targeted tool call, "
                "or call StructuredOutput with concrete evidence.",
            )
        return (
            2,
            None,
            "Do not stop with progress prose. Call a repository tool directly, or call StructuredOutput "
            "with concrete evidence if the issue cannot be completed.",
        )

    if event_name == "PostToolUse":
        tool = str(event.get("tool_name") or "")
        if tool in {"Edit", "Write"}:
            cwd = Path(str(event.get("cwd") or ".")).resolve()
            post_input = dict(event.get("tool_input") or {})
            if "__unparsedToolInput" in post_input:
                post_input = _recover_unparsed_file_input(tool, post_input.get("__unparsedToolInput")) or {}
            raw = str(post_input.get("file_path") or "")
            relative = _relative_path(cwd, raw)
            if relative is not None:
                edited = list(state.get("edited_paths") or [])
                if relative not in edited:
                    edited.append(relative)
                state["edited_paths"] = edited
                state["review_reads"] = [
                    path for path in (state.get("review_reads") or []) if path != relative
                ]
                state["post_edit_structured_blocks"] = 0
                state["post_edit_review_blocks"] = 0
                state["deterministic_review_requested"] = False
                state["live_tool_history"] = []
                state["live_discovery_restricted"] = False
        return 0, None, None

    if event_name != "PreToolUse":
        return 0, None, None
    tool = str(event.get("tool_name") or "")
    tool_input = dict(event.get("tool_input") or {})
    cwd = Path(str(event.get("cwd") or ".")).resolve()
    recovered_unparsed = False
    if tool in {"Edit", "Write"} and "__unparsedToolInput" in tool_input:
        state["unparsed_tool_inputs"] = int(state.get("unparsed_tool_inputs") or 0) + 1
        repaired = _recover_unparsed_file_input(tool, tool_input.get("__unparsedToolInput"))
        if repaired is None:
            state["unparsed_repair_failures"] = int(state.get("unparsed_repair_failures") or 0) + 1
            return (
                2,
                None,
                f"The {tool} arguments were malformed. Retry {tool} with separate schema fields "
                "instead of embedded JSON; keep the change smaller if a multiline value was truncated.",
            )
        tool_input = repaired
        recovered_unparsed = True
        state["unparsed_recoveries"] = int(state.get("unparsed_recoveries") or 0) + 1

    loop_reason = _live_loop_guard(tool, tool_input, state)
    if loop_reason:
        return 2, None, loop_reason

    if tool == "StructuredOutput":
        edited = set(state.get("edited_paths") or [])
        reviewed = set(state.get("review_reads") or [])
        if edited and not edited.issubset(reviewed):
            return 2, None, "Re-read every changed file and correct incomplete behavior before StructuredOutput."
        state["structured_output"] = True
        return 0, None, None

    if tool == "WebSearch":
        query = str(tool_input.get("query") or "").strip()
        limit = max(0, int(state.get("max_web_search_calls") or 0))
        used = int(state.get("web_search_calls") or 0)
        if not query or len(query) > 300:
            return 2, None, "Use one narrow WebSearch query of at most 300 characters."
        if used >= limit:
            return 2, None, "The bounded WebSearch allowance is exhausted; continue from repository evidence."
        state["web_search_calls"] = used + 1
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
            if Path(raw_path).is_absolute() and not _is_checkout_absolute(cwd, raw_path):
                return 2, None, f"Retry this search with the repository-relative path `{relative}`."
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
        if Path(raw).is_absolute() and not _is_checkout_absolute(cwd, raw):
            return 2, None, f"Retry the same {tool} now with repository-relative file_path `{relative}`."
        updated = tool_input if repaired_path or recovered_unparsed else None
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
                offset = int(windows[0] if windows else 0)
                if offset <= 0:
                    offset = int((state.get("read_offsets") or {}).get(relative) or 0)
                if count == 0 and offset > 0 and not tool_input.get("offset"):
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
            words = _shell_words(command)
        except ValueError:
            return 2, None, "Use one parsed repository discovery command without shell composition."
        if words[:2] == ["rtk", "read"] and len(words) == 3:
            relative = _relative_path(cwd, words[2])
            if relative is None:
                return 2, None, "Use `rtk read` with one repository-relative tracked path."
            if Path(words[2]).is_absolute() and not _is_checkout_absolute(cwd, words[2]):
                return 2, None, f"Retry with `rtk read {shlex.quote(relative)}`."
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
        if _read_only_shell(words):
            state["discovery_calls"] = int(state.get("discovery_calls") or 0) + 1
            return 0, None, None
        return (
            2,
            None,
            "This coding session permits only repository-relative read-only discovery commands. "
            "Use Read/Edit/Write for source changes and return setup or verification commands in StructuredOutput; "
            "the supervisor runs them without a shell afterward.",
        )

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
        if code == 0 and output is None and str(event.get("hook_event_name") or "") == "PreToolUse":
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "allow",
                    "permissionDecisionReason": "Accepted by the supervised Solve capability broker.",
                }
            }
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
