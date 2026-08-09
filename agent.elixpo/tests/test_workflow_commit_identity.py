"""State-writing workflows must attribute commits to the elixpoo user."""

from __future__ import annotations

from pathlib import Path

STATE_WRITERS = (
    "scout.yml",
    "triage.yml",
    "pick.yml",
    "vet.yml",
    "solve.yml",
    "steward-intake.yml",
    "janitor-audit.yml",
)


def test_state_workflows_use_elixpoo_commit_identity_and_pat():
    root = Path(".github/workflows")
    for name in STATE_WRITERS:
        workflow = (root / name).read_text(encoding="utf-8")
        assert 'git config user.name "elixpoo"' in workflow
        assert 'git config user.email "elixpoo@gmail.com"' in workflow
        assert "elixpoo[bot]" not in workflow
        assert "ELIXPOO_GITHUB_AGENTIC_TOKEN" in workflow


def test_repository_agent_cannot_create_repository_commits():
    workflow = Path(".github/workflows/elixpo-agent.yml").read_text(encoding="utf-8")
    assert "contents: read" in workflow
    assert "contents: write" not in workflow
    assert "claude-code-action" not in workflow
    assert "python -m agents.repository_agent" in workflow
