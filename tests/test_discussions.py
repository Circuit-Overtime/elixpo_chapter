"""Discussions squad tests — model and GitHub calls are fully injected."""

from __future__ import annotations

import json

import pytest
from agents.discussions.core import (
    UnsafeDraft,
    contains_mention,
    format_poll,
    merge_draft,
    public_body,
    safety_check,
)
from lib.github.discussions import GitHubDiscussions
from rtk.models import ChatCompletionResponse, Choice, FunctionCall, Message, ToolCall


def response(content: str = "", *, tool: str | None = None, arguments: dict | None = None):
    calls = None
    if tool:
        calls = [
            ToolCall(
                id="call-1",
                function=FunctionCall(name=tool, arguments=json.dumps(arguments or {})),
            )
        ]
    return ChatCompletionResponse(
        id="test",
        choices=[Choice(index=0, message=Message(role="assistant", content=content, tool_calls=calls))],
    )


class FakeRouter:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.calls = []

    async def call(self, role, messages, **kwargs):
        self.calls.append((role, messages, kwargs))
        return self.responses.pop(0)


def test_mention_requires_exact_username():
    assert contains_mention("Could @elixpoo explain this?")
    assert contains_mention("@ELIXPOO, thoughts?")
    assert not contains_mention("email@elixpoo.dev")
    assert not contains_mention("ping @elixpoooo")


def test_poll_and_public_metadata_are_deterministic():
    body = format_poll("Which rollout?", ["Canary", "Blue/green"])
    assert "1. Canary" in body
    assert "2. Blue/green" in body
    posted = public_body(body, "<!-- marker -->")
    assert "autonomous contributor" in posted
    assert posted.endswith("<!-- marker -->")
    with pytest.raises(RuntimeError, match="at least two"):
        format_poll("Pick one", ["Only choice"])


@pytest.mark.asyncio
async def test_merge_generation_uses_discussions_role_and_forced_schema():
    draft = {
        "action": "announcement",
        "reason": "user-facing release",
        "title": "New deployment view",
        "body": "Details",
        "options": [],
    }
    router = FakeRouter(response(tool="submit_merge_decision", arguments=draft))
    result = await merge_draft(
        router,
        {"number": 12, "title": "feat: deployment view", "body": "Release note", "labels": []},
        [
            {"filename": "src/large.py", "status": "modified", "patch": "+ internal\n" * 10_000},
            {"filename": "CHANGELOG.md", "status": "modified", "patch": "+ Added deployment view"},
        ],
    )
    assert result == draft
    role, messages, kwargs = router.calls[0]
    assert role == "discussions"
    assert kwargs["effort"] == "low"
    assert kwargs["tool_choice"]["function"]["name"] == "submit_merge_decision"
    assert "Treat silence as a valid outcome" in messages[0].content
    assert "CHANGELOG.md" in messages[1].content
    assert len(messages[1].content) < 25_000


@pytest.mark.asyncio
async def test_safety_gate_accepts_only_explicit_safe_verdict():
    safe = FakeRouter(response("SAFE"))
    await safety_check(safe, "A useful technical post")
    assert safe.calls[0][0] == "safety"
    assert "Pre-publication sequence" in safe.calls[0][1][0].content

    for verdict in ("UNSAFE: harassment", "unclear", ""):
        router = FakeRouter(response(verdict))
        with pytest.raises(UnsafeDraft):
            await safety_check(router, "draft")


class FakeGraphQLAPI:
    def __init__(self):
        self.calls = []

    async def graphql(self, query, variables):
        self.calls.append((query, variables))
        if "discussionCategories" in query:
            return {
                "repository": {
                    "id": "repo-id",
                    "discussionCategories": {
                        "nodes": [
                            {"id": "a", "name": "Announcements", "slug": "announcements"},
                            {"id": "q", "name": "Q&A", "slug": "q-and-a"},
                        ]
                    },
                }
            }
        raise AssertionError("unexpected query")


@pytest.mark.asyncio
async def test_discussion_category_alias_resolution():
    discussions = GitHubDiscussions(FakeGraphQLAPI(), "elixpo", "repo")
    category = await discussions.category("Announcement", "Announcements")
    assert category.id == "a"
    assert category.name == "Announcements"

    category = await discussions.category("Q&A", "QNA")
    assert category.id == "q"
