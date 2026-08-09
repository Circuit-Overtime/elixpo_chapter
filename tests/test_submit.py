"""Submit rendering and publication guard tests."""

from types import SimpleNamespace

import pytest
from agents.submit import __main__ as submit_module
from agents.submit.__main__ import (
    SubmitRejected,
    build_pr_body,
    build_pr_title,
    validate_solve_state,
    validate_verification_record,
    write_punch_line,
)
from lib.state.store import StateStore


def _state():
    return {
        "title": "[BUG]:- copy full llm text",
        "issue_number": 9,
        "issue_url": "https://github.com/elixpo/lixrl.com/issues/9",
        "upstream_repo": "elixpo/lixrl.com",
        "fork_repo": "Circuit-Overtime/lixrl.com",
        "branch": "patch/copy-full-llm-text-9-a1b2",
        "status": "ready_to_submit",
        "review": {
            "approved": True,
            "findings": [],
            "source": "independent_semantic_diff_review",
        },
        "head_sha": "a" * 40,
        "summary": "Copy the complete documentation abstraction.",
        "harness": {"commit_message": "fix(docs): preserve leaf content in LLM copy payload"},
        "target_files": ["app/docs/api/page.tsx"],
        "checks": [{"kind": "verification", "command": "npm run lint", "exit_code": 0}],
        "plan": {"steps": [{"purpose": "Use the complete llm_text value."}]},
    }


def test_pr_markdown_is_disclosed_verified_and_closing():
    title = build_pr_title(_state())
    body = build_pr_body(_state(), "Small patch, full signal")
    assert title == "[BUG]:- Preserve leaf content in LLM copy payload"
    assert "Changed `app/docs/api/page.tsx`." in body
    assert "Verified with `npm run lint`." in body
    assert "autonomous contributor" in body
    assert "Fixes #9" in body
    assert "##" not in body
    assert "✅" not in body
    assert body.endswith("<sub>“Small patch, full signal” — @elixpoo</sub>")


def test_pr_body_discloses_bounded_verification_exceptions():
    state = {
        **_state(),
        "checks": [{"kind": "verification", "command": "npx biome check .", "exit_code": 1}],
        "verification_exceptions": [
            {"kind": "verification", "command": "npx biome check .", "exit_code": 1, "detail": "ignored"}
        ],
    }

    body = build_pr_body(state, None)

    assert "Verification exceptions: `npx biome check .` exited 1." in body
    assert "ignored" not in body
    validate_verification_record(state)


def test_submit_rejects_undisclosed_verification_failure():
    state = {
        **_state(),
        "checks": [{"kind": "verification", "command": "npm run lint", "exit_code": 1}],
    }

    with pytest.raises(SubmitRejected, match="undisclosed"):
        validate_verification_record(state)


def test_submit_rejects_disclosed_missing_verification_tool():
    state = {
        **_state(),
        "checks": [
            {
                "kind": "verification",
                "command": "npx tsc --noEmit",
                "exit_code": 1,
                "output": "bwrap: execvp npx: No such file or directory",
            }
        ],
        "verification_exceptions": [
            {"kind": "verification", "command": "npx tsc --noEmit", "exit_code": 1}
        ],
    }

    with pytest.raises(SubmitRejected, match="tool was unavailable"):
        validate_verification_record(state)


def test_successful_setup_fallback_resolves_initial_setup_failure():
    state = {
        **_state(),
        "checks": [
            {"kind": "setup", "command": "npm ci --ignore-scripts", "exit_code": 1},
            {"kind": "setup_fallback", "command": "npm install --ignore-scripts", "exit_code": 0},
            {"kind": "verification", "command": "npm run lint", "exit_code": 0},
        ],
    }

    validate_verification_record(state)


def test_pr_title_derives_type_from_commit_when_issue_has_no_tag():
    state = {
        **_state(),
        "title": "Add an enterprise contact chip",
        "harness": {"commit_message": "feat(pricing): add enterprise contact chip"},
    }
    assert build_pr_title(state) == "[FEAT]:- Add enterprise contact chip"


@pytest.mark.asyncio
async def test_punch_line_uses_prose_role_and_removes_duplicate_attribution():
    class Router:
        async def call(self, role, messages, **kwargs):
            assert role == "prose"
            assert kwargs == {"effort": "low", "max_tokens": 40}
            assert "copy full llm text" in messages[1].content
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="Ship the whole signal — @elixpoo"))]
            )

    assert await write_punch_line(Router(), _state()) == "Ship the whole signal"


@pytest.mark.asyncio
async def test_invalid_punch_line_falls_back_to_grounded_summary():
    class Router:
        async def call(self, role, messages, **kwargs):
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="Thanks @maintainer"))])

    assert await write_punch_line(Router(), _state()) == "Copy the complete documentation abstraction."


@pytest.mark.asyncio
async def test_grounded_fallback_sanitizes_email_without_blocking_submit():
    class Router:
        async def call(self, role, messages, **kwargs):
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="Thanks @maintainer"))])

    state = {
        **_state(),
        "summary": "Show the copy chip with hello@elixpo.com in the enterprise card.",
    }
    assert await write_punch_line(Router(), state) == (
        "Show the copy chip with the contact address in the enterprise card."
    )


@pytest.mark.asyncio
async def test_optional_prose_failure_uses_grounded_fallback():
    class Router:
        async def call(self, role, messages, **kwargs):
            raise RuntimeError("provider unavailable")

    assert await write_punch_line(Router(), _state()) == "Copy the complete documentation abstraction."


@pytest.mark.asyncio
async def test_overlong_punch_line_is_bounded_without_retry():
    class Router:
        async def call(self, role, messages, **kwargs):
            return SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(
                            content=(
                                "one two three four five six seven eight nine ten "
                                "eleven twelve thirteen fourteen fifteen"
                            )
                        )
                    )
                ]
            )

    assert await write_punch_line(Router(), _state()) == (
        "one two three four five six seven eight nine ten eleven twelve thirteen fourteen"
    )


def test_submit_state_workspace_and_identity_must_match(tmp_path):
    workspace_base = tmp_path / "workspaces"
    workspace = workspace_base / "session"
    workspace.mkdir(parents=True)
    state = {**_state(), "workspace": str(workspace)}
    assert validate_solve_state(state, workspace_base) == workspace.resolve()
    state["branch"] = "main"
    try:
        validate_solve_state(state, workspace_base)
    except SubmitRejected:
        pass
    else:
        raise AssertionError("unsafe branch passed")


def test_submit_rejects_unreviewed_structured_fallback(tmp_path):
    workspace_base = tmp_path / "workspaces"
    workspace = workspace_base / "session"
    workspace.mkdir(parents=True)
    state = {
        **_state(),
        "workspace": str(workspace),
        "harness": {**_state()["harness"], "structured_fallback": True},
    }

    with pytest.raises(SubmitRejected, match="post-edit review evidence"):
        validate_solve_state(state, workspace_base)

    state["harness"]["reviewed_paths"] = ["app/docs/api/page.tsx"]
    assert validate_solve_state(state, workspace_base) == workspace.resolve()


def test_pr_body_omits_only_missing_optional_footer():
    body = build_pr_body(_state(), None)
    assert body.endswith("Fixes #9")
    assert "@elixpoo</sub>" not in body


@pytest.mark.asyncio
async def test_successful_submit_authorizes_exact_workspace_cleanup(tmp_path, monkeypatch):
    workspace_base = tmp_path / "workspaces"
    workspace = workspace_base / "session"
    workspace.mkdir(parents=True)
    state = {
        **_state(),
        "run_id": "run-1",
        "key": "elixpo/lixrl.com#9",
        "workspace": str(workspace),
        "base_branch": "main",
        "test_mode": True,
        "cleanup": {
            "schema_version": 1,
            "run_id": "run-1",
            "owner": "janitor",
            "status": "active",
            "resources": [],
        },
    }
    store = StateStore(tmp_path / "state")

    class API:
        async def _token(self):
            return "token"

        async def _request(self, method, path, params=None):
            assert method == "GET" and path.endswith("/pulls") and params
            return [{"html_url": "https://github.com/elixpo/lixrl.com/pull/10", "number": 10}]

    class Router:
        pass

    async def punch_line(router, solve_state):
        return None

    async def safe(router, title, body):
        return None

    monkeypatch.setattr(submit_module, "write_punch_line", punch_line)
    monkeypatch.setattr(submit_module, "safety_check", safe)
    monkeypatch.setattr(submit_module, "push_branch", lambda *args, **kwargs: None)

    await submit_module.submit(API(), Router(), store, state, workspace_base)

    solved = store.read_json("solve.json")
    assert solved["status"] == "submitted"
    assert solved["cleanup"]["status"] == "authorized_after_submit"
    assert solved["cleanup"]["submission_head_sha"] == state["head_sha"]
