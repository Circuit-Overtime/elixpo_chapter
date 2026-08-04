"""Pure Solve boundary tests; live fork/model execution is a manual test."""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.error
from io import BytesIO
from pathlib import Path

import httpx
import pytest
from agents.solve.branch import build_work_branch
from agents.solve.core import SolveRejected, ensure_fork, resolve_target, validate_plan
from agents.solve.edit import EditRejected, apply_edit_batch
from agents.solve.failure import classify_failure, cleanup_manifest, failure_handoff
from agents.solve.git import CommandRejected, assert_workspace_identity, run_verification, validate_command
from agents.solve.harness import (
    _CCR_PACKAGE,
    _HARNESS_PACKAGE,
    HarnessError,
    _candidate_read_offsets,
    _candidate_read_windows,
    _compact_harness_context,
    _deterministic_outcome,
    _harness_command,
    _harness_env,
    _is_empty_connection_failure,
    _parse_cli_result,
    _prepare_context_bundle,
    _prompt,
    _redact,
    _render_harness_event,
    _router_ready,
    _stop_stale_isolated_routers,
)
from agents.solve.models import HarnessOutcome, PlanStep, ReplaceFileEdit, Replacement, SolvePlan, StepImplementation
from agents.solve.tool_gate import _decision
from agents.solve.verification_plan import complete_verification_plan
from lib.solve_policy import load_solve_policy, solve_hard_token_limit, solve_token_limit
from lib.state.store import StateStore
from rtk.shell import CmdResult


def _policy():
    return {
        "max_minutes": 15,
        "max_files": 5,
        "max_commit_steps": 2,
        "max_search_calls": 1,
        "allowed_command_prefixes": ["pytest", "npm run lint"],
    }


def _plan(**changes):
    data = {
        "solvable": True,
        "estimated_minutes": 10,
        "rationale": "one local copy-handler correction",
        "needs_search": False,
        "search_query": "",
        "context_files": [],
        "steps": [
            PlanStep(
                purpose="copy the complete text",
                files=["app/page.tsx"],
                setup_commands=[],
                verification_commands=["npm run lint"],
                commit_message="fix: copy complete llm text",
            )
        ],
    }
    data.update(changes)
    return SolvePlan(**data)


def test_plan_is_bounded_by_time_files_and_checks():
    validate_plan(_plan(), _policy(), {"app/page.tsx"})
    try:
        validate_plan(_plan(estimated_minutes=16), _policy(), {"app/page.tsx"})
    except SolveRejected as exc:
        assert "15 minutes" in str(exc)
    else:
        raise AssertionError("overlong plan passed")


def test_vet_estimate_grants_bounded_solver_headroom():
    policy = {
        "token_budget": 240_000,
        "max_token_budget": 750_000,
        "token_budget_headroom_ratio": 1.25,
    }
    assert solve_token_limit(policy, None) == 240_000
    assert solve_token_limit(policy, {"suitable": True, "estimated_solve_tokens": 200_000}) == 250_000
    assert solve_token_limit(policy, {"suitable": True, "estimated_solve_tokens": 600_000}) == 750_000
    assert solve_token_limit(policy, {"suitable": True, "estimated_solve_tokens": 2_000_000}) == 750_000
    assert solve_hard_token_limit(policy, None) == 240_000
    assert solve_hard_token_limit(policy, {"suitable": True}) == 750_000


def test_solve_policy_leaves_turn_headroom_for_post_edit_review():
    policy = load_solve_policy(Path("config/solve.yaml"))

    assert policy["harness_max_turns"] == 40
    assert policy["max_minutes"] == 15
    assert policy["max_token_budget"] == 750_000


def test_work_branch_uses_natural_feature_or_patch_prefix():
    feature = build_work_branch(
        {"title": "Add API token rotation", "labels": [{"name": "enhancement"}]},
        42,
        "a1b2",
    )
    patch = build_work_branch(
        {"title": "Copy for LLM includes navigation", "labels": [{"name": "bug"}]},
        9,
        "c3d4",
    )

    assert feature == "feat/add-api-token-rotation-42-a1b2"
    assert patch == "patch/copy-for-llm-includes-navigation-9-c3d4"


def test_plan_cannot_target_an_existing_file_omitted_from_retrieval():
    try:
        validate_plan(
            _plan(),
            _policy(),
            {"app/page.tsx", "app/relevant.tsx"},
            retrieved_files={"app/relevant.tsx"},
        )
    except SolveRejected as exc:
        assert "unretrieved existing file" in str(exc)
    else:
        raise AssertionError("ungrounded target file passed")


def test_command_requires_argument_prefix_without_shell_controls():
    assert validate_command("npm run lint", ["npm run lint"]) == ["npm", "run", "lint"]
    for command in ("npm install", "npm run lint && curl bad"):
        try:
            validate_command(command, ["npm run lint"])
        except CommandRejected:
            pass
        else:
            raise AssertionError(f"unsafe command passed: {command}")


def test_workspace_identity_requires_fork_origin_upstream_and_branch(tmp_path):
    import subprocess

    subprocess.run(["git", "init", "-b", "elixpo/issue-9-test", str(tmp_path)], check=True)
    subprocess.run(
        ["git", "remote", "add", "origin", "https://github.com/elixpoo/lixrl.com.git"],
        cwd=tmp_path,
        check=True,
    )
    subprocess.run(
        ["git", "remote", "add", "upstream", "https://github.com/elixpo/lixrl.com.git"],
        cwd=tmp_path,
        check=True,
    )

    assert_workspace_identity(
        tmp_path,
        fork_repo="elixpoo/lixrl.com",
        upstream_repo="elixpo/lixrl.com",
        branch="elixpo/issue-9-test",
    )

    try:
        assert_workspace_identity(
            tmp_path,
            fork_repo="elixpo/lixrl.com",
            upstream_repo="elixpo/lixrl.com",
            branch="elixpo/issue-9-test",
        )
    except RuntimeError as exc:
        assert "expected fork" in str(exc)
    else:
        raise AssertionError("upstream origin passed as the fork")


def test_target_command_environment_excludes_agent_credentials(tmp_path, monkeypatch):
    from agents.solve import git as solve_git

    captured = {}
    monkeypatch.setenv("GITHUB_TOKEN", "must-not-leak")
    monkeypatch.setenv("ELIXPO_POLLINATIONS_API_KEY", "must-not-leak")

    def fake_run(args, cwd, timeout, env):
        captured.update(env)
        return CmdResult(code=0, output="ok", compressed=True)

    monkeypatch.setattr(solve_git, "rtk_run", fake_run)
    run_verification(tmp_path, "pytest", allowed_prefixes=["pytest"], timeout=10)
    assert "GITHUB_TOKEN" not in captured
    assert "ELIXPO_POLLINATIONS_API_KEY" not in captured
    assert captured["NODE_OPTIONS"] == "--max-old-space-size=512"
    assert captured["npm_config_maxsockets"] == "4"
    assert captured["npm_config_audit"] == "false"
    assert captured["npm_config_fund"] == "false"


def test_harness_environment_excludes_agent_credentials(tmp_path, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "must-not-leak")
    monkeypatch.setenv("AGENT_GITHUB_SOLVER_TOKEN", "must-not-leak")
    monkeypatch.setenv("ELIXPO_POLLINATIONS_API_KEY", "must-not-leak")

    config_dir = tmp_path / "claude-config"
    env = _harness_env(
        "qwen-coder",
        router_url="http://127.0.0.1:4567",
        config_dir=config_dir,
        client_model="pollinations-code,qwen-coder",
        gate_state={"read_offsets": {"app/pricing/page.tsx": 287}},
    )

    assert "GITHUB_TOKEN" not in env
    assert "AGENT_GITHUB_SOLVER_TOKEN" not in env
    assert "ELIXPO_POLLINATIONS_API_KEY" not in env
    assert env["ANTHROPIC_API_KEY"] == "ccr-pollinations"
    assert env["ANTHROPIC_BASE_URL"] == "http://127.0.0.1:4567"
    assert env["ANTHROPIC_MODEL"] == "pollinations-code,qwen-coder"
    assert env["ANTHROPIC_CUSTOM_MODEL_OPTION"] == "pollinations-code,qwen-coder"
    assert env["ANTHROPIC_CUSTOM_MODEL_OPTION_NAME"] == "qwen-coder"
    assert "ANTHROPIC_AUTH_TOKEN" not in env
    assert env["RTK_TELEMETRY_DISABLED"] == "1"
    assert env["CLAUDE_CODE_DISABLE_AUTO_MEMORY"] == "1"
    assert env["CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS"] == "1800"
    assert env["CLAUDE_CODE_MAX_RETRIES"] == "2"
    assert env["CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY"] == "3"
    assert env["NODE_OPTIONS"] == "--max-old-space-size=512"
    assert env["ELIXPO_HARNESS_STREAM_QUEUE_LINES"] == "32"
    assert env["CLAUDE_CONFIG_DIR"] == str(config_dir)
    assert env["CLAUDE_CODE_TMPDIR"] == str(config_dir / "tmp")
    assert env["ELIXPO_TOOL_GATE_STATE"] == str(config_dir / "tmp/tool-gate.json")
    assert env["DISABLE_UPDATES"] == "1"
    gate_state = json.loads((config_dir / "tmp/tool-gate.json").read_text())
    assert gate_state["read_offsets"]["app/pricing/page.tsx"] == 287
    hook_settings = json.loads((config_dir / "settings.json").read_text())
    assert hook_settings["hooks"]["PreToolUse"][0]["matcher"] == (
        "Read|Glob|Grep|Edit|Write|Bash|StructuredOutput"
    )
    assert hook_settings["hooks"]["PostToolUse"][0]["matcher"] == "Edit|Write"
    assert hook_settings["hooks"]["Stop"]


def test_tool_gate_rejects_absolute_paths_and_allows_relative_recovery_reads(tmp_path):
    target = tmp_path / "app/pricing/page.tsx"
    target.parent.mkdir(parents=True)
    target.write_text("export default function Pricing() {}")
    state = {
        "read_offsets": {"app/pricing/page.tsx": 287},
        "read_windows": {
            "app/pricing/page.tsx": [287, 338],
            "app/components/Footer.tsx": [77, 146],
        },
    }
    event = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Read",
        "cwd": str(tmp_path),
        "tool_input": {"file_path": "/home/user/elixpourl/app/pricing/page.tsx"},
    }

    code, output, reason = _decision(event, state)

    assert code == 2 and output is None
    assert "repository-relative file_path `app/pricing/page.tsx`" in reason
    assert "source_reads" not in state

    canonical = {**event, "tool_input": {"file_path": str(target)}}
    code, output, reason = _decision(canonical, state)
    assert code == 0 and reason is None
    assert output["hookSpecificOutput"]["updatedInput"]["file_path"] == "app/pricing/page.tsx"
    assert output["hookSpecificOutput"]["updatedInput"]["offset"] == 287
    assert state["source_reads"] == ["app/pricing/page.tsx"]

    repeated = {**event, "tool_input": {"file_path": "app/pricing/page.tsx"}}
    code, output, reason = _decision(repeated, state)
    assert code == 0 and reason is None
    assert output is None
    code, output, reason = _decision(repeated, state)
    assert code == 0 and reason is None
    assert output is None

    footer = tmp_path / "app/components/Footer.tsx"
    footer.parent.mkdir(parents=True, exist_ok=True)
    footer.write_text("copy")
    second = {**event, "tool_input": {"file_path": "app/components/Footer.tsx"}}
    code, output, reason = _decision(second, state)
    assert code == 0 and reason is None
    assert output["hookSpecificOutput"]["updatedInput"]["offset"] == 77
    code, output, reason = _decision(second, state)
    assert code == 0 and reason is None
    assert output is None
    third = {**event, "tool_input": {"file_path": "app/components/Navbar.tsx"}}
    navbar = tmp_path / "app/components/Navbar.tsx"
    navbar.write_text("nav")
    code, output, reason = _decision(third, state)
    assert code == 0 and output is None and reason is None
    assert state["source_reads"] == [
        "app/pricing/page.tsx",
        "app/components/Footer.tsx",
        "app/components/Navbar.tsx",
    ]


def test_tool_gate_repairs_pathless_edit_from_single_grounded_read(tmp_path):
    target = tmp_path / "app/pricing/page.tsx"
    target.parent.mkdir(parents=True)
    target.write_text("old")
    state = {"source_reads": ["app/pricing/page.tsx"]}
    event = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Edit",
        "cwd": str(tmp_path),
        "tool_input": {"old_string": "old", "new_string": "new"},
    }

    code, output, reason = _decision(event, state)

    assert code == 0 and reason is None
    assert output["hookSpecificOutput"]["updatedInput"]["file_path"] == "app/pricing/page.tsx"


def test_tool_gate_recovers_complete_unparsed_multiline_edit(tmp_path):
    target = tmp_path / "app/pricing/page.tsx"
    target.parent.mkdir(parents=True)
    target.write_text("before\nafter")
    raw = (
        '{"file_path":"app/pricing/page.tsx","old_string":"before\nafter",'
        '"new_string":"before\nchip\nafter","replace_all":false}'
    )
    state = {"source_reads": ["app/pricing/page.tsx", "app/components/Footer.tsx"]}
    event = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Edit",
        "cwd": str(tmp_path),
        "tool_input": {"__unparsedToolInput": raw},
    }

    code, output, reason = _decision(event, state)

    assert code == 0 and reason is None
    repaired = output["hookSpecificOutput"]["updatedInput"]
    assert repaired == {
        "file_path": "app/pricing/page.tsx",
        "old_string": "before\nafter",
        "new_string": "before\nchip\nafter",
        "replace_all": False,
    }
    assert state["unparsed_tool_inputs"] == 1
    assert state["unparsed_recoveries"] == 1

    post = {**event, "hook_event_name": "PostToolUse"}
    assert _decision(post, state)[0] == 0
    assert state["edited_paths"] == ["app/pricing/page.tsx"]


def test_tool_gate_rejects_incomplete_unparsed_edit(tmp_path):
    state = {"source_reads": ["app/pricing/page.tsx"]}
    event = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Edit",
        "cwd": str(tmp_path),
        "tool_input": {"__unparsedToolInput": '{"file_path":"app/pricing/page.tsx"'},
    }

    code, output, reason = _decision(event, state)

    assert code == 2 and output is None
    assert "arguments were malformed" in reason
    assert state["unparsed_repair_failures"] == 1


def test_tool_gate_blocks_raw_shell_and_enforces_structured_completion(tmp_path):
    state = {}
    raw = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "cwd": str(tmp_path),
        "tool_input": {"command": "find . -name '*.tsx'"},
    }
    assert _decision(raw, state)[0] == 2

    state["source_reads"] = ["app/page.tsx"]
    scoped_grep = {
        **raw,
        "tool_input": {"command": "rtk grep 'copy|email' app -n -C 3"},
    }
    code, _, reason = _decision(scoped_grep, state)
    assert code == 0 and reason is None
    assert state["discovery_calls"] == 1

    outside_grep = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Grep",
        "cwd": str(tmp_path),
        "tool_input": {"pattern": "secret", "path": "/etc"},
    }
    assert _decision(outside_grep, state)[0] == 2
    outside_glob = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Glob",
        "cwd": str(tmp_path),
        "tool_input": {"pattern": "/etc/*"},
    }
    assert _decision(outside_glob, state)[0] == 2

    stop = {"hook_event_name": "Stop"}
    code, _, reason = _decision(stop, state)
    assert code == 2
    assert "Repository reads already succeeded for `app/page.tsx`" in reason
    assert "Edit/Write now" in reason
    assert _decision(stop, state)[0] == 2
    assert _decision(stop, state)[0] == 2
    state["structured_output"] = True
    assert _decision(stop, state)[0] == 0


def test_tool_gate_records_only_successful_edits_and_allows_stop(tmp_path):
    target = tmp_path / "app/pricing/page.tsx"
    target.parent.mkdir(parents=True)
    target.write_text("changed")
    state = {}
    pre = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Edit",
        "cwd": str(tmp_path),
        "tool_input": {"file_path": "app/pricing/page.tsx", "old_string": "a", "new_string": "b"},
    }
    assert _decision(pre, state)[0] == 0
    assert "edited_paths" not in state

    post = {**pre, "hook_event_name": "PostToolUse"}
    assert _decision(post, state)[0] == 0
    assert state["edited_paths"] == ["app/pricing/page.tsx"]
    assert _decision({"hook_event_name": "Stop"}, state)[0] == 2
    premature = {
        "hook_event_name": "PreToolUse",
        "tool_name": "StructuredOutput",
        "tool_input": {"solvable": True},
    }
    assert _decision(premature, state)[0] == 2
    review = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Read",
        "cwd": str(tmp_path),
        "tool_input": {"file_path": "app/pricing/page.tsx"},
    }
    assert _decision(review, state)[0] == 0
    assert state["review_reads"] == ["app/pricing/page.tsx"]
    assert _decision({"hook_event_name": "Stop"}, state)[0] == 2
    assert _decision({"hook_event_name": "Stop"}, state)[0] == 0
    assert _decision(premature, state)[0] == 0


def test_successful_reedit_invalidates_prior_review(tmp_path):
    target = tmp_path / "app/page.tsx"
    target.parent.mkdir(parents=True)
    target.write_text("changed")
    state = {"edited_paths": ["app/page.tsx"], "review_reads": ["app/page.tsx"]}
    event = {
        "hook_event_name": "PostToolUse",
        "tool_name": "Edit",
        "cwd": str(tmp_path),
        "tool_input": {"file_path": "app/page.tsx", "old_string": "a", "new_string": "b"},
    }

    assert _decision(event, state)[0] == 0
    assert state["review_reads"] == []
    assert _decision({"hook_event_name": "Stop"}, state)[0] == 2
    assert _decision({"hook_event_name": "Stop"}, state)[0] == 2


def test_tool_gate_leaves_decline_judgment_to_model():
    state = {"source_reads": ["app/page.tsx"]}
    decline = {
        "hook_event_name": "PreToolUse",
        "tool_name": "StructuredOutput",
        "tool_input": {"solvable": False, "rationale": "uncertain"},
    }

    code, _, reason = _decision(decline, state)
    assert code == 0 and reason is None
    assert state["structured_output"] is True


def test_ccr_setup_registers_custom_governor_options_once(tmp_path):
    env = os.environ.copy()
    env.update(
        {
            "HOME": str(tmp_path),
            "ELIXPO_POLLINATIONS_API_KEY": "test-key",
            "ELIXPO_CCR_AGENT_MODEL": "nova-fast",
            "ELIXPO_CCR_CODE_MODEL": "qwen-coder",
            "ELIXPO_CCR_THINK_MODEL": "qwen-coder",
            "ELIXPO_CCR_SEARCH_MODEL": "perplexity-fast",
            "ELIXPO_CCR_AGENT_TOKENS": "10",
            "ELIXPO_CCR_CODE_TOKENS": "20",
            "ELIXPO_CCR_THINK_TOKENS": "30",
            "ELIXPO_CCR_SEARCH_TOKENS": "40",
        }
    )
    result = subprocess.run(
        ["bash", str(Path(".github/scripts/setup_ccr.sh").resolve()), str(Path.cwd())],
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    config = json.loads((tmp_path / ".claude-code-router/config.json").read_text())
    governor = next(item for item in config["transformers"] if item["path"].endswith("rtk-context-governor.js"))
    assert governor["options"]["max_context_chars"] == 48000
    for provider in config["Providers"]:
        assert "rtk-context-governor" in provider["transformer"]["use"]
        assert not any(
            isinstance(item, list) and item[0] == "rtk-context-governor"
            for item in provider["transformer"]["use"]
        )


def test_router_readiness_waits_for_messages_route(monkeypatch):
    seen = []

    def fail_with(status, body):
        def urlopen(request, timeout):
            seen.append((request.full_url, request.get_method(), request.data, timeout))
            response = BytesIO(body)
            raise urllib.error.HTTPError(request.full_url, status, "probe", {}, response)

        return urlopen

    monkeypatch.setattr("agents.solve.harness.urllib.request.urlopen", fail_with(404, b"not found"))
    assert _router_ready("http://127.0.0.1:4567") is False
    monkeypatch.setattr(
        "agents.solve.harness.urllib.request.urlopen",
        fail_with(400, b'{"error":"Missing model in request body"}'),
    )
    assert _router_ready("http://127.0.0.1:4567") is True
    assert seen[-1] == ("http://127.0.0.1:4567/v1/messages", "POST", b"{}", 1)


def test_stale_router_cleanup_targets_only_isolated_ccr_groups(tmp_path, monkeypatch):
    proc = tmp_path / "123"
    proc.mkdir()
    (proc / "cmdline").write_bytes(b"node\0claude-code-router\0start\0")
    (proc / "environ").write_bytes(b"HOME=/tmp/elixpoo-ccr-old\0")
    (proc / "stat").write_text("123 (node) S 1 456 456 0", encoding="utf-8")
    regular = tmp_path / "124"
    regular.mkdir()
    (regular / "cmdline").write_bytes(b"node\0claude-code-router\0start\0")
    (regular / "environ").write_bytes(b"HOME=/home/user\0")
    (regular / "stat").write_text("124 (node) S 1 789 789 0", encoding="utf-8")
    signals = []
    monkeypatch.setattr(os, "getuid", lambda: proc.stat().st_uid)
    monkeypatch.setattr(os, "getpgrp", lambda: 999)
    monkeypatch.setattr(os, "killpg", lambda group, sig: signals.append((group, sig)))
    monkeypatch.setattr(time, "sleep", lambda _: None)

    assert _stop_stale_isolated_routers(tmp_path) == 1
    assert [group for group, _ in signals] == [456, 456, 456]


def test_harness_result_parses_structured_output_and_usage():
    envelope = {
        "subtype": "success",
        "structured_output": {
            "solvable": True,
            "estimated_minutes": 8,
            "rationale": "localized copy behavior",
            "summary": "Copy the complete response text.",
            "setup_commands": [],
            "verification_commands": ["npm run lint"],
            "commit_message": "fix: copy complete response text",
        },
        "usage": {
            "input_tokens": 1000,
            "cache_read_input_tokens": 400,
            "output_tokens": 200,
        },
        "num_turns": 6,
        "duration_ms": 12000,
        "session_id": "session-1",
    }

    outcome, usage, metadata = _parse_cli_result(json.dumps(envelope))

    assert outcome.solvable is True
    assert usage.total_tokens == 1600
    assert usage.cached_tokens == 400
    assert metadata == {
        "session_id": "session-1",
        "turns": 6,
        "duration_ms": 12000,
        "terminal_subtype": "success",
    }


def test_harness_replaces_generic_system_prompt(monkeypatch):
    monkeypatch.setattr(
        "agents.solve.harness._node_command",
        lambda package, *args: [package, *args],
    )

    command = _harness_command(
        "qwen-coder",
        {"harness_max_turns": 10},
        rtk_available=False,
        settings_file=Path("/tmp/isolated/settings.json"),
    )

    assert "--system-prompt-file" in command
    assert command[0] == _HARNESS_PACKAGE
    assert _CCR_PACKAGE == "@musistudio/claude-code-router@2.0.0"
    assert "--append-system-prompt-file" not in command
    assert "--bare" not in command
    assert "--safe-mode" not in command
    assert "--setting-sources" not in command
    assert command[command.index("--max-turns") + 1] == "10"
    assert command[command.index("--settings") + 1] == "/tmp/isolated/settings.json"


def test_harness_confines_rtk_shell_discovery(monkeypatch):
    monkeypatch.setattr(
        "agents.solve.harness._node_command",
        lambda package, *args: [package, *args],
    )

    command = _harness_command("qwen-coder", {}, rtk_available=True)
    tools = command[command.index("--tools") + 1]
    allowed = command[command.index("--allowedTools") + 1]
    denied = command[command.index("--disallowedTools") + 1]

    assert tools == "Read,Glob,Grep,Edit,Write,Bash"
    assert "Read" in allowed
    assert "Glob" in allowed
    assert "Grep" in allowed
    assert "Bash(rtk read *)" in allowed
    assert "Bash(rtk grep *)" in allowed
    assert "Bash(rtk find *)" not in allowed
    assert "Bash(rtk smart *)" not in allowed
    assert "Bash(rtk *)" not in allowed
    assert "Bash(rtk ls *)" not in allowed
    assert "Bash(curl *)" in denied
    assert "Bash(git *)" in denied


def test_context_bundle_is_injected_and_git_ignored(tmp_path, monkeypatch):
    git_dir = tmp_path / ".git" / "info"
    git_dir.mkdir(parents=True)

    class Bundle:
        guidance = {"AGENTS.md": "repository guidance"}
        candidates = {"app/docs/layout.tsx": "handler excerpt"}

        @staticmethod
        def render(max_tokens):
            return "CANDIDATE app/docs/layout.tsx:\nhandler excerpt"

    monkeypatch.setattr("agents.solve.harness.build_context_bundle", lambda *args, **kwargs: Bundle())

    hints, path = _prepare_context_bundle(
        tmp_path,
        {"title": "copy behavior", "body": ""},
        {"guidance_names": ["AGENTS.md"], "max_context_tokens": 1000, "max_file_tokens": 500},
    )

    assert hints == ["app/docs/layout.tsx"]
    assert path == ".elixpo-context/context.md"
    assert "handler excerpt" in (tmp_path / path).read_text()
    assert ".elixpo-context/" in (git_dir / "exclude").read_text().splitlines()


def test_compact_context_keeps_every_ranked_candidate_inside_result_cap():
    class Bundle:
        guidance = {"AGENTS.md": "instructions"}
        candidates = {
            "app/pricing/page.tsx": (
                "// lines 1-10\nimports\n\n// ...\n\n"
                "// lines 280-300\nEnterprise card\n\n// ...\n\n"
                "// lines 330-350\nhello@example.com contact"
            ),
            "app/components/Footer.tsx": (
                "// lines 1-10\nconst EMAIL = 'hello@example.com'\n\n// ...\n\n"
                "// lines 70-90\nhandleCopyEmail writes to navigator.clipboard\n\n// ...\n\n"
                "// lines 140-160\ncopy email button onClick"
            ),
            "package.json": "// lines 1-25\nmanifest-start\n" + ("m" * 1800) + "\nmanifest-end",
        }

    issue = {"title": "Show copy email in enterprise card", "body": "hello@example.com"}
    rendered = _compact_harness_context(Bundle(), issue=issue, max_chars=3200)

    assert len(rendered) <= 3200
    assert "CANDIDATE app/pricing/page.tsx:" in rendered
    assert "Enterprise card" in rendered and "hello@example.com contact" in rendered
    assert "CANDIDATE app/components/Footer.tsx:" in rendered
    assert "handleCopyEmail" in rendered and "copy email button" in rendered
    assert "CANDIDATE package.json:" in rendered
    assert "manifest-start" in rendered and "manifest-end" in rendered
    assert _candidate_read_offsets(rendered, issue, list(Bundle.candidates)) == {
        "app/pricing/page.tsx": 280,
        "app/components/Footer.tsx": 70,
        "package.json": 1,
    }


def test_candidate_read_offset_selects_strongest_issue_excerpt():
    rendered = """CANDIDATE app/pricing/page.tsx:
// lines 10-20
import type SellableTier from './types';

// ...

// lines 287-350
Enterprise contact button copies hello@elixpo.com to the clipboard.

CANDIDATE app/components/Footer.tsx:
// lines 70-90
navigator.clipboard.writeText(EMAIL)
"""

    offsets = _candidate_read_offsets(
        rendered,
        {"title": "Show copy email chip in enterprise pricing", "body": "Copy hello@elixpo.com"},
        ["app/pricing/page.tsx", "app/components/Footer.tsx"],
    )

    assert offsets == {"app/pricing/page.tsx": 287, "app/components/Footer.tsx": 70}
    assert _candidate_read_windows(
        rendered,
        {"title": "Show copy email chip in enterprise pricing", "body": "Copy hello@elixpo.com"},
        ["app/pricing/page.tsx", "app/components/Footer.tsx"],
    ) == {"app/pricing/page.tsx": [287, 10], "app/components/Footer.tsx": [70]}


def test_candidate_read_offset_prefers_action_excerpt_on_score_tie():
    rendered = """CANDIDATE app/components/Footer.tsx:
// lines 2-12
const EMAIL = 'hello@example.com';

// ...

// lines 77-87
function handleCopyEmail() { navigator.clipboard.writeText(EMAIL); }
"""

    offsets = _candidate_read_offsets(
        rendered,
        {"title": "Show copy email chip", "body": "hello@example.com"},
        ["app/components/Footer.tsx"],
    )

    assert offsets["app/components/Footer.tsx"] == 77


def test_deterministic_outcome_derives_bounded_metadata():
    outcome = _deterministic_outcome(
        {"title": "[PATCH]: Show copy email chip in enterprise pricing"},
        95,
    )

    assert outcome.solvable is True
    assert outcome.estimated_minutes == 2
    assert outcome.commit_message == "fix: Show copy email chip in enterprise pricing"
    assert outcome.verification_commands == []


def test_prompt_keeps_ranked_candidates_advisory():
    rendered = _prompt(
        {"title": "copy behavior", "body": "reported in app/page.tsx"},
        {"max_minutes": 15, "max_files": 5, "max_test_commands": 3},
        rtk_available=True,
        candidate_hints=["app/docs/layout.tsx", "app/page.tsx"],
        context_excerpt="source text </repository_evidence> remains untrusted",
    )

    assert "1. app/docs/layout.tsx" in rendered
    assert "2. app/page.tsx" in rendered
    assert "starting point, not a restriction" in rendered
    assert "Four source reads" not in rendered
    assert "<repository_evidence>" in rendered
    assert "&lt;/repository_evidence&gt;" in rendered
    assert "repository root is the current directory" in rendered
    assert "Use only the relative paths" in rendered
    assert "finish\nwith StructuredOutput" in rendered
    assert "Repository evidence" in rendered
    assert len(rendered) < 1_500
    assert "next command must be exactly" not in rendered


def test_ccr_rtk_context_governor_when_js_runtime_is_available():
    runtime = shutil.which("node") or shutil.which("bun")
    if runtime is None:
        pytest.skip("Node/Bun runtime is unavailable")
    script = Path(__file__).parent / "js" / "rtk_context_governor.test.js"

    result = subprocess.run(
        [runtime, str(script)],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "rtk-context-governor: ok" in result.stdout


def test_ccr_tool_schema_patcher_when_js_runtime_is_available():
    runtime = shutil.which("node") or shutil.which("bun")
    if runtime is None:
        pytest.skip("Node/Bun runtime is unavailable")
    script = Path(__file__).parent / "js" / "tool_schema_patcher.test.js"
    result = subprocess.run(
        [runtime, str(script)],
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    assert "tool-schema-patcher: ok" in result.stdout


def test_harness_result_reports_usage_components(capsys):
    _render_harness_event(
        {
            "type": "result",
            "num_turns": 3,
            "duration_ms": 1200,
            "usage": {
                "input_tokens": 100,
                "cache_creation_input_tokens": 20,
                "cache_read_input_tokens": 40,
                "output_tokens": 10,
            },
        }
    )

    output = capsys.readouterr().out
    assert "tokens=170 input=120 cached=40 output=10" in output


def test_declined_harness_outcome_needs_no_commands():
    outcome = HarnessOutcome(
        solvable=False,
        estimated_minutes=0,
        rationale="scope exceeds the bounded run",
        summary="Declined without edits.",
    )
    assert outcome.verification_commands == []


def test_node_verification_is_inferred_from_lockfile_and_tsconfig(tmp_path):
    (tmp_path / "package.json").write_text('{"scripts":{"build":"next build"}}')
    (tmp_path / "package-lock.json").write_text("{}")
    (tmp_path / "tsconfig.json").write_text("{}")
    outcome = HarnessOutcome(
        solvable=True,
        estimated_minutes=8,
        rationale="localized docs copy fix",
        summary="Limit copied content to the article.",
        commit_message="fix: limit copied docs content",
    )

    completed, inferred = complete_verification_plan(tmp_path, outcome, ["app/docs/layout.tsx"])

    assert inferred is True
    assert completed.setup_commands == ["npm ci --ignore-scripts"]
    assert completed.verification_commands == ["npx tsc --noEmit"]


def test_unsafe_model_verification_is_replaced_by_manifest_plan(tmp_path):
    (tmp_path / "package.json").write_text('{"scripts":{"build":"next build"}}')
    (tmp_path / "package-lock.json").write_text("{}")
    (tmp_path / "tsconfig.json").write_text("{}")
    outcome = HarnessOutcome(
        solvable=True,
        estimated_minutes=8,
        rationale="localized pricing fix",
        summary="Show a copyable enterprise contact address.",
        verification_commands=['grep -n "hello@example.com" app/pricing/page.tsx'],
        commit_message="fix: show enterprise contact email",
    )

    completed, inferred = complete_verification_plan(
        tmp_path,
        outcome,
        ["app/pricing/page.tsx"],
        allowed_setup_prefixes=["npm ci --ignore-scripts"],
        allowed_command_prefixes=["npx tsc"],
    )

    assert inferred is True
    assert completed.setup_commands == ["npm ci --ignore-scripts"]
    assert completed.verification_commands == ["npx tsc --noEmit"]


def test_safe_model_verification_is_preserved(tmp_path):
    outcome = HarnessOutcome(
        solvable=True,
        estimated_minutes=4,
        rationale="localized Python fix",
        summary="Correct the parser.",
        verification_commands=["pytest tests/test_parser.py"],
        commit_message="fix: correct parser",
    )

    completed, inferred = complete_verification_plan(
        tmp_path,
        outcome,
        ["parser.py"],
        allowed_setup_prefixes=[],
        allowed_command_prefixes=["pytest"],
    )

    assert inferred is False
    assert completed.verification_commands == ["pytest tests/test_parser.py"]


def test_invalid_harness_output_preserves_usage_for_accounting():
    envelope = {
        "type": "result",
        "subtype": "success",
        "is_error": False,
        "structured_output": {
            "solvable": True,
            "estimated_minutes": 8,
            "rationale": "localized fix",
            "summary": "Changed one file.",
            "commit_message": "",
        },
        "usage": {"input_tokens": 700, "output_tokens": 100},
        "num_turns": 4,
    }
    try:
        _parse_cli_result(json.dumps(envelope))
    except HarnessError as exc:
        assert exc.usage is not None
        assert exc.usage.total_tokens == 800
        assert exc.metadata["turns"] == 4
    else:
        raise AssertionError("invalid harness output passed")


def test_harness_auth_error_is_concise_and_classified():
    envelope = {
        "type": "result",
        "subtype": "success",
        "is_error": True,
        "api_error_status": 401,
        "result": "Failed to authenticate. API Error: 401 Invalid API key.",
    }
    try:
        _parse_cli_result(json.dumps(envelope))
    except HarnessError as exc:
        assert str(exc) == ("coding harness API error 401: Failed to authenticate. API Error: 401 Invalid API key.")
        assert classify_failure(exc, "harness")["category"] == "credentials"
    else:
        raise AssertionError("harness authentication error passed")


@pytest.mark.parametrize(
    "message",
    [
        "coding harness failed: API Error: Unable to connect to API (ConnectionRefused)",
        "CCR became unavailable before the coding harness request",
        "local CCR remained healthy, but its upstream model route refused 3 zero-token requests",
    ],
)
def test_harness_loopback_failure_is_retryable(message):
    failure = classify_failure(HarnessError(message), "harness")

    assert failure["category"] == "provider_transient"
    assert failure["retryable"] is True
    assert failure["candidate_action"] == "retry_later"


def test_only_empty_first_turn_connection_failure_can_retry():
    empty_failure = {
        "type": "result",
        "is_error": True,
        "result": "API Error: Unable to connect to API (ConnectionRefused)",
        "num_turns": 1,
        "usage": {"input_tokens": 0, "output_tokens": 0},
    }

    assert _is_empty_connection_failure(empty_failure) is True
    assert _is_empty_connection_failure({**empty_failure, "num_turns": 2}) is False
    assert _is_empty_connection_failure(
        {**empty_failure, "usage": {"input_tokens": 1, "output_tokens": 0}}
    ) is False
    assert _is_empty_connection_failure(
        {**empty_failure, "result": "Failed to authenticate. API Error: 401"}
    ) is False


def test_missing_harness_runtime_remains_a_workspace_failure():
    missing = classify_failure(HarnessError("Node coding harness unavailable"), "harness")
    unreachable = classify_failure(
        HarnessError("coding harness could not reach CCR after an empty connection failure"),
        "harness",
    )

    assert missing["category"] == "workspace"
    assert missing["candidate_action"] == "repair_environment_then_retry"
    assert unreachable["category"] == "workspace"


def test_harness_turn_limit_is_actionable_and_preserves_usage():
    envelope = {
        "type": "result",
        "subtype": "error_max_turns",
        "is_error": True,
        "result": "coding harness failed",
        "num_turns": 13,
        "usage": {"input_tokens": 1000, "output_tokens": 200},
    }

    with pytest.raises(HarnessError) as caught:
        _parse_cli_result(json.dumps(envelope))

    error = caught.value
    assert str(error) == "coding harness reached its 13-turn limit before self-review"
    assert error.usage is not None and error.usage.total_tokens == 1200
    assert error.metadata["terminal_subtype"] == "error_max_turns"
    failure = classify_failure(error, "harness")
    assert failure["category"] == "turn_limit"
    assert failure["candidate_action"] == "reduce_discovery_then_retry_once"


def test_unstructured_harness_result_preserves_usage_for_doctor():
    envelope = {
        "type": "result",
        "subtype": "success",
        "is_error": False,
        "result": "Let me inspect another file.",
        "num_turns": 10,
        "usage": {"input_tokens": 73069, "output_tokens": 1918},
    }

    with pytest.raises(HarnessError) as caught:
        _parse_cli_result(json.dumps(envelope))

    error = caught.value
    assert error.usage is not None and error.usage.total_tokens == 74987
    assert error.metadata["turns"] == 10


def test_exhausted_evidence_budget_requests_context_refresh():
    failure = classify_failure(
        SolveRejected(
            "coding harness declined issue: bounded evidence did not expose the target; "
            "source-read budget is exhausted, so an edit would be ungrounded"
        ),
        "harness",
    )
    assert failure["category"] == "insufficient_context"
    assert failure["retryable"] is True
    assert failure["candidate_action"] == "refresh_context_once"


def test_hallucinated_workspace_decline_requests_context_retry():
    failure = classify_failure(
        SolveRejected(
            "coding harness declined issue: permission restrictions prevent locating "
            "the implementation files"
        ),
        "harness",
    )

    assert failure["category"] == "insufficient_context"
    assert failure["retryable"] is True
    assert failure["candidate_action"] == "refresh_context_once"


def test_harness_events_render_progress_without_tool_output(capsys):
    _render_harness_event(
        {
            "type": "assistant",
            "message": {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "Read",
                        "input": {"file_path": "app/page.tsx"},
                    }
                ]
            },
        }
    )
    _render_harness_event(
        {
            "type": "user",
            "message": {"content": [{"type": "tool_result", "content": "sensitive source contents"}]},
        }
    )

    output = capsys.readouterr().out
    assert "tool=Read target=app/page.tsx" in output
    assert "tool_result count=1" in output
    assert "sensitive source contents" not in output


def test_ccr_web_token_is_redacted():
    line = "CCR service at http://127.0.0.1:3459/?ccr_web_token=temporary-secret (pid 42)"

    cleaned = _redact(line)

    assert "temporary-secret" not in cleaned
    assert "ccr_web_token=***" in cleaned


def test_edit_batch_is_exact_and_plan_confined(tmp_path):
    target = tmp_path / "app" / "page.tsx"
    target.parent.mkdir()
    target.write_text("const value = shortText;\n")
    edits = [
        ReplaceFileEdit(
            path="app/page.tsx",
            operation="replace",
            replacements=[Replacement(old="shortText", new="llmText")],
        )
    ]
    assert apply_edit_batch(tmp_path, edits, {"app/page.tsx"}) == ["app/page.tsx"]
    assert "llmText" in target.read_text()
    try:
        apply_edit_batch(tmp_path, edits, {"another.ts"})
    except EditRejected:
        pass
    else:
        raise AssertionError("unplanned edit passed")


def test_replacement_schema_rejects_whole_file_payloads():
    try:
        Replacement(old="x" * 4001, new="small")
    except ValueError as exc:
        assert "4000" in str(exc)
    else:
        raise AssertionError("oversized replacement passed")


def test_edit_schema_rejects_replace_content_combination():
    try:
        StepImplementation.model_validate(
            {
                "summary": "small edit",
                "edits": [
                    {
                        "path": "app/page.tsx",
                        "operation": "replace",
                        "replacements": [{"old": "before", "new": "after"}],
                        "content": "forbidden whole-file content",
                    }
                ],
            }
        )
    except ValueError as exc:
        assert "content" in str(exc)
    else:
        raise AssertionError("replace edit with content passed")


def test_owned_target_requires_matching_test_vet(tmp_path, monkeypatch):
    from agents.solve import core

    store = StateStore(tmp_path)
    url = "https://github.com/elixpo/lixrl.com/issues/9"
    monkeypatch.setattr(core, "is_test_repository", lambda repo: repo == "elixpo/lixrl.com")
    store.write_json(
        "vet.json",
        {"url": url, "suitable": True, "test_mode": True, "issue_updated_at": "2026-08-02T16:41:07Z"},
    )
    assert resolve_target(store, url, True) == url


def test_fork_403_explains_fine_grained_permissions():
    class API:
        async def get_repo(self, owner, repo):
            request = httpx.Request("GET", f"https://api.github.com/repos/{owner}/{repo}")
            response = httpx.Response(404, request=request)
            raise httpx.HTTPStatusError("missing", request=request, response=response)

        async def _request(self, method, path, **kwargs):
            if path == "/user":
                return {"login": "elixpoo"}
            request = httpx.Request(method, f"https://api.github.com{path}")
            response = httpx.Response(
                403,
                request=request,
                json={"message": "Resource not accessible by personal access token"},
                headers={"X-Accepted-GitHub-Permissions": "administration=write; contents=read"},
            )
            raise httpx.HTTPStatusError("forbidden", request=request, response=response)

    try:
        asyncio.run(ensure_fork(API(), "elixpo", "lixrl.com", "elixpoo"))
    except SolveRejected as exc:
        message = str(exc)
        assert "Administration: read/write" in message
        assert "Resource not accessible by personal access token" in message
    else:
        raise AssertionError("fork permission failure was not translated")


def test_fork_owner_cannot_be_another_personal_account():
    class API:
        async def get_repo(self, owner, repo):
            request = httpx.Request("GET", f"https://api.github.com/repos/{owner}/{repo}")
            response = httpx.Response(404, request=request)
            raise httpx.HTTPStatusError("missing", request=request, response=response)

        async def _request(self, method, path, **kwargs):
            if path == "/user":
                return {"login": "elixpoo"}
            if path == "/users/someone-else":
                return {"login": "someone-else", "type": "User"}
            raise AssertionError("fork request must not be attempted")

    try:
        asyncio.run(ensure_fork(API(), "elixpo", "lixrl.com", "someone-else"))
    except SolveRejected as exc:
        assert "not the authenticated user" in str(exc)
    else:
        raise AssertionError("foreign personal fork owner passed")


def test_structured_output_failure_waits_for_doctor_and_janitor(tmp_path):
    failure = classify_failure(
        ValueError("invalid structured model output: EOF while parsing a string"),
        "implementing",
    )
    cleanup = cleanup_manifest(
        {"workspace": str(tmp_path / "run-1"), "fork_repo": "bot/project"},
        tmp_path,
    )

    assert failure["category"] == "model_output"
    assert failure["retryable"] is True
    assert failure["candidate_action"] == "retry_once_with_stricter_output"
    assert cleanup["status"] == "blocked_on_doctor"
    assert cleanup["resources"][0]["safe_root"] == str(tmp_path.resolve())
    assert cleanup["resources"][1]["disposition"] == "preserve_shared_resource"

    handoff = failure_handoff(
        {"stage": "implementing", "workspace": str(tmp_path / "run-1")},
        ValueError("invalid structured model output: truncated JSON"),
        workspace_base=tmp_path,
        token_spent=15709,
        token_limit=24000,
        elapsed_seconds=84.7,
    )
    assert handoff["status"] == "doctor_pending"
    assert handoff["doctor"] == {"status": "pending", "decision": None}
    assert handoff["token_spent"] == 15709
