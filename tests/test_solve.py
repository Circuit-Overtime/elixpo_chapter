"""Pure Solve boundary tests; live fork/model execution is a manual test."""

from __future__ import annotations

import asyncio

import httpx

from agents.solve.core import SolveRejected, ensure_fork, resolve_target, validate_plan
from agents.solve.edit import EditRejected, apply_edit_batch
from agents.solve.failure import classify_failure, cleanup_manifest, failure_handoff
from agents.solve.git import CommandRejected, run_verification, validate_command
from agents.solve.models import PlanStep, ReplaceFileEdit, Replacement, SolvePlan, StepImplementation
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
