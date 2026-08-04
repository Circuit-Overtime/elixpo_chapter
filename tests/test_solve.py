"""Pure Solve boundary tests; live fork/model execution is a manual test."""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
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
    _harness_command,
    _harness_env,
    _parse_cli_result,
    _prepare_context_bundle,
    _prompt,
    _redact,
    _render_harness_event,
)
from agents.solve.models import HarnessOutcome, PlanStep, ReplaceFileEdit, Replacement, SolvePlan, StepImplementation
from agents.solve.verification_plan import complete_verification_plan
from lib.solve_policy import solve_token_limit
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


def test_harness_environment_excludes_agent_credentials(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "must-not-leak")
    monkeypatch.setenv("AGENT_GITHUB_SOLVER_TOKEN", "must-not-leak")
    monkeypatch.setenv("ELIXPO_POLLINATIONS_API_KEY", "must-not-leak")

    env = _harness_env("qwen-coder", router_url="http://127.0.0.1:4567")

    assert "GITHUB_TOKEN" not in env
    assert "AGENT_GITHUB_SOLVER_TOKEN" not in env
    assert "ELIXPO_POLLINATIONS_API_KEY" not in env
    assert env["ANTHROPIC_API_KEY"] == "ccr-pollinations"
    assert env["ANTHROPIC_BASE_URL"] == "http://127.0.0.1:4567"
    assert "ANTHROPIC_AUTH_TOKEN" not in env
    assert env["RTK_TELEMETRY_DISABLED"] == "1"
    assert env["CLAUDE_CODE_DISABLE_AUTO_MEMORY"] == "1"
    assert env["CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS"] == "1800"
    assert env["CLAUDE_CODE_MAX_RETRIES"] == "2"
    assert env["CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY"] == "3"
    assert env["NODE_OPTIONS"] == "--max-old-space-size=512"
    assert env["ELIXPO_HARNESS_STREAM_QUEUE_LINES"] == "32"


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
    )

    assert "--system-prompt-file" in command
    assert command[0] == _HARNESS_PACKAGE
    assert _CCR_PACKAGE == "@musistudio/claude-code-router@2.0.0"
    assert "--append-system-prompt-file" not in command
    assert "--bare" not in command
    assert "--setting-sources" not in command
    assert command[command.index("--max-turns") + 1] == "10"


def test_harness_confines_rtk_shell_discovery(monkeypatch):
    monkeypatch.setattr(
        "agents.solve.harness._node_command",
        lambda package, *args: [package, *args],
    )

    command = _harness_command("qwen-coder", {}, rtk_available=True)
    tools = command[command.index("--tools") + 1]
    allowed = command[command.index("--allowedTools") + 1]
    denied = command[command.index("--disallowedTools") + 1]

    assert tools == "Read,Edit,Write,Bash"
    assert "Read" in allowed
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


def test_prompt_keeps_ranked_candidates_advisory():
    rendered = _prompt(
        {"title": "copy behavior", "body": "reported in app/page.tsx"},
        {"max_minutes": 15, "max_files": 5, "max_test_commands": 3},
        rtk_available=True,
        candidate_hints=["app/docs/layout.tsx", "app/page.tsx"],
    )

    assert "1. app/docs/layout.tsx" in rendered
    assert "2. app/page.tsx" in rendered
    assert "rank one or the issue-mentioned path" in rendered
    assert "Two source reads after the bundle is the total pre-edit limit" in rendered
    assert "Edit requires this exact pre-read" in rendered
    assert "with file_path only and no pages argument" in rendered
    assert "Repository evidence" in rendered
    assert "do not decline merely because" in rendered
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
