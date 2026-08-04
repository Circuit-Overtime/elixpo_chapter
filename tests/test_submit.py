"""Submit rendering and publication guard tests."""

from types import SimpleNamespace

import pytest
from agents.submit.__main__ import (
    SubmitRejected,
    build_pr_body,
    build_pr_title,
    validate_solve_state,
    write_punch_line,
)


def _state():
    return {
        "title": "[BUG]:- copy full llm text",
        "issue_number": 9,
        "issue_url": "https://github.com/elixpo/lixrl.com/issues/9",
        "upstream_repo": "elixpo/lixrl.com",
        "fork_repo": "Circuit-Overtime/lixrl.com",
        "branch": "patch/copy-full-llm-text-9-a1b2",
        "status": "ready_to_submit",
        "review": {"approved": True, "findings": []},
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
    assert title == "[ELIXPO] Preserve leaf content in LLM copy payload"
    assert "Changed `app/docs/api/page.tsx`." in body
    assert "Verified with `npm run lint`." in body
    assert "autonomous contributor" in body
    assert "Fixes #9" in body
    assert "##" not in body
    assert "✅" not in body
    assert body.endswith("<sub>“Small patch, full signal” — @elixpoo</sub>")


@pytest.mark.asyncio
async def test_punch_line_uses_prose_role_and_removes_duplicate_attribution():
    class Router:
        async def call(self, role, messages, **kwargs):
            assert role == "prose"
            assert kwargs == {"effort": "medium", "max_tokens": 40}
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
