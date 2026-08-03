"""Submit rendering and publication guard tests."""

from agents.submit.__main__ import SubmitRejected, build_pr_body, build_pr_title, validate_solve_state


def _state():
    return {
        "title": "[BUG]:- copy full llm text",
        "issue_number": 9,
        "issue_url": "https://github.com/elixpo/lixrl.com/issues/9",
        "upstream_repo": "elixpo/lixrl.com",
        "fork_repo": "Circuit-Overtime/lixrl.com",
        "branch": "elixpo/issue-9-a1b2c3",
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
    body = build_pr_body(_state())
    assert title == "[ELIXPO] copy full llm text"
    assert "`app/docs/api/page.tsx`" in body
    assert "✅ `npm run lint`" in body
    assert "autonomous contributor" in body
    assert body.endswith("Fixes #9")


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
