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
        "target_files": ["app/docs/api/page.tsx"],
        "checks": [{"kind": "verification", "command": "npm run lint", "exit_code": 0}],
        "plan": {"steps": [{"purpose": "Use the complete llm_text value."}]},
    }


def test_pr_markdown_is_disclosed_verified_and_closing():
    title = build_pr_title(_state())
    body = build_pr_body(_state(), "Small patch, full signal")
    assert title == "[ELIXPO] copy full llm text"
    assert "`app/docs/api/page.tsx`" in body
    assert "✅ `npm run lint`" in body
    assert "autonomous contributor" in body
    assert "Fixes #9" in body
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


@pytest.mark.parametrize(
    "line",
    [
        "Read more at https://example.com",
        "Thanks @maintainer",
        "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen",
    ],
)
@pytest.mark.asyncio
async def test_punch_line_rejects_links_mentions_and_overlong_copy(line):
    class Router:
        async def call(self, role, messages, **kwargs):
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=line))]
            )

    with pytest.raises(SubmitRejected):
        await write_punch_line(Router(), _state())


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
