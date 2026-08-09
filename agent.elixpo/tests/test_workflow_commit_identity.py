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


def test_repository_agent_uses_same_human_account_identity():
    workflow = Path(".github/workflows/elixpo-agent.yml").read_text(encoding="utf-8")
    assert "GIT_AUTHOR_NAME: elixpoo" in workflow
    assert "GIT_AUTHOR_EMAIL: elixpoo@gmail.com" in workflow
    assert "GIT_COMMITTER_NAME: elixpoo" in workflow
    assert "GIT_COMMITTER_EMAIL: elixpoo@gmail.com" in workflow
