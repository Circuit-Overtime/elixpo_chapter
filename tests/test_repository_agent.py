from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from agents.repository_agent.core import (
    PUBLIC_MARKER,
    RepositoryAgentRejected,
    bounded_context,
    enforce_subject_rate_limit,
    plan_action,
)


class Router:
    def __init__(self, action):
        self.action = action

    async def call(self, role, messages, **kwargs):
        call = SimpleNamespace(function=SimpleNamespace(arguments=json.dumps(self.action)))
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=[call]))])


async def test_issue_implementation_routes_to_oreoflow():
    action = await plan_action(
        Router({"action": "oreoflow", "body": "Queued for bounded verification."}),
        scope="issue",
        request="Please implement this",
        context=bounded_context({"title": "Bug"}, []),
    )
    assert action.action == "oreoflow"


async def test_pull_request_cannot_bypass_vet_as_implementation():
    action = await plan_action(
        Router({"action": "oreoflow", "body": "I will edit this."}),
        scope="pull_request",
        request="Please implement this",
        context=bounded_context({"title": "Patch"}, [], "diff"),
    )
    assert action.action == "reply"
    assert "focused issue" in action.body


def test_context_and_subject_rate_are_bounded():
    context = bounded_context(
        {"title": "x" * 500, "body": "y" * 7000},
        [{"body": "z" * 2000, "user": {"login": "u"}} for _ in range(20)],
        "d" * 20_000,
    )
    assert len(context["subject"]["title"]) == 300
    assert len(context["recent_comments"]) == 10
    assert len(context["pull_request_diff"]) == 12_000

    now = datetime(2026, 8, 10, tzinfo=timezone.utc)
    comments = [
        {
            "body": PUBLIC_MARKER,
            "user": {"login": "elixpoo"},
            "created_at": (now - timedelta(hours=index)).isoformat(),
        }
        for index in range(3)
    ]
    with pytest.raises(RepositoryAgentRejected, match="rate limit"):
        enforce_subject_rate_limit(comments, "elixpoo", now=now)
