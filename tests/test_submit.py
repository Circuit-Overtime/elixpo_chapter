"""Submit rendering and publication guard tests."""

from agents.submit.__main__ import build_pr_body, build_pr_title


def _state():
    return {
        "title": "[BUG]: copy full llm text",
        "issue_number": 9,
        "summary": "Copy the complete documentation abstraction.",
        "target_files": ["app/docs/api/page.tsx"],
        "checks": [{"command": "npm run lint", "exit_code": 0}],
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
