"""Discussions squad tests — model and GitHub calls are fully injected."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from agents.discussions.__main__ import (
    _handle_pulse,
    _labels_for,
    _poll_mentions,
    _recent_moods,
    _repo_name,
    _source_repo_name,
)
from agents.discussions.core import (
    UnsafeDraft,
    contains_mention,
    emoji_title,
    merge_draft,
    public_body,
    render_activity,
    safety_check,
)
from agents.discussions.mood import Genre, Mood, assess_mood
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


def test_public_metadata_is_deterministic():
    posted = public_body("Useful discussion", "<!-- marker -->")
    assert "autonomous contributor" in posted
    assert posted.endswith("<!-- marker -->")


def test_target_repository_and_labels_are_deterministic(monkeypatch):
    monkeypatch.delenv("ELIXPO_DISCUSSIONS_REPOSITORY", raising=False)
    assert _repo_name({"repository": {"full_name": "elixpo/agent.elixpo"}}) == "elixpo/elixpo"
    assert _source_repo_name({"repository": {"full_name": "elixpo/agent.elixpo"}}) == "elixpo/agent.elixpo"
    assert list(_labels_for("qna", "kubernetes")) == ["qna", "kubernetes", "elixpoo-generated"]
    assert list(_labels_for("announcement", "general")) == ["announcement", "elixpoo-generated"]


def test_mood_heuristics_select_genres_without_model_calls():
    announcement = assess_mood(
        [{"title": "feat: deployment view", "body": "Shipped", "labels": []}],
        [{"filename": "CHANGELOG.md", "changes": 40, "patch": "+ Deployment view"}],
    )
    assert announcement.genre is Genre.ANNOUNCEMENT
    assert announcement.mood is Mood.ENERGIZED
    assert announcement.emoji == "🚀"

    poll = assess_mood(
        [{"title": "docs: deployment RFC", "body": "Compare options and tradeoffs", "labels": []}],
        [{"filename": "config/deployments.yaml", "changes": 30, "patch": "+ option: canary"}],
    )
    assert poll.genre is Genre.POLL
    assert poll.mood is Mood.CURIOUS

    qna = assess_mood(
        [{"title": "docs: kubernetes rollout guide", "body": "", "labels": []}],
        [{"filename": "docs/kubernetes/rollouts.md", "changes": 80, "patch": "+ helm rollback"}],
    )
    assert qna.genre is Genre.QNA
    assert qna.mood is Mood.MENTORING

    quiet = assess_mood(
        [{"title": "test: expand coverage", "body": "", "labels": []}],
        [{"filename": "tests/test_router.py", "changes": 10, "patch": "+ test"}],
    )
    assert quiet.genre is Genre.SKIP
    assert quiet.mood is Mood.RESTING


def _ambiguous_activity(identity: int, recent_moods=()):
    return assess_mood(
        [
            {
                "node_id": f"PR_{identity}",
                "title": "feat: kubernetes deployment options",
                "body": "RFC feedback on alternatives and tradeoffs",
                "labels": [],
            }
        ],
        [
            {
                "filename": "docs/kubernetes/config/options.md",
                "changes": 250,
                "patch": "+ Compare deployment options and follow-up work",
            }
        ],
        recent_moods=recent_moods,
    )


def test_mood_variance_is_relevant_and_retry_stable():
    decisions = [_ambiguous_activity(identity) for identity in range(30)]
    assert {decision.genre for decision in decisions} == {
        Genre.ANNOUNCEMENT,
        Genre.POLL,
        Genre.QNA,
    }
    assert _ambiguous_activity(12) == _ambiguous_activity(12)
    assert all(decision.genre is not Genre.SKIP for decision in decisions)


def test_recent_moods_reduce_repetition_without_overriding_evidence():
    baseline = [_ambiguous_activity(identity) for identity in range(100)]
    after_polls = [
        _ambiguous_activity(identity, recent_moods=("curious", "curious", "curious"))
        for identity in range(100)
    ]
    baseline_polls = sum(decision.mood is Mood.CURIOUS for decision in baseline)
    repeated_polls = sum(decision.mood is Mood.CURIOUS for decision in after_polls)
    assert repeated_polls < baseline_polls / 2
    assert all(decision.genre is not Genre.SKIP for decision in after_polls)


def test_recent_mood_labels_are_read_newest_first():
    recent = [
        {"labels": {"nodes": [{"name": "poll"}, {"name": "mood-curious"}]}},
        {"labels": {"nodes": [{"name": "mood-energized"}]}},
        {"labels": {"nodes": [{"name": "unrelated"}]}},
        {"labels": [{"name": "mood-mentoring"}]},
    ]
    assert _recent_moods(recent) == ("curious", "energized", "mentoring")


def test_critical_activity_always_uses_alert_announcement():
    decision = assess_mood(
        [
            {
                "node_id": "critical-change",
                "title": "feat: kubernetes configuration RFC",
                "body": "Breaking migration with options and tradeoffs",
                "labels": [],
            }
        ],
        [{"filename": "docs/kubernetes/config/migration.md", "changes": 300, "patch": "+ breaking"}],
        recent_moods=("alert", "alert", "alert"),
    )
    assert decision.genre is Genre.ANNOUNCEMENT
    assert decision.mood is Mood.ALERT


def test_markdown_and_emoji_are_rendered_deterministically():
    draft = {
        "title": "New deployment view",
        "summary": "The deployment view is now available.",
        "highlights": ["Shows rollout health", "Links failed revisions"],
        "impact": "Operators can find failed rollouts faster.",
        "prompt": "Try it and report missing signals.",
        "options": [],
        "topic": "gitops",
    }
    assert emoji_title("🚨 New deployment view", "🚀") == "🚀 New deployment view"
    body = render_activity(
        Genre.ANNOUNCEMENT,
        draft,
        [{"number": 12, "title": "Deployment view", "html_url": "https://github.test/pull/12"}],
    )
    assert "## What changed" in body
    assert "## Why it matters" in body
    assert "- Shows rollout health" in body
    assert "[#12: Deployment view](https://github.test/pull/12)" in body

    poll_draft = {**draft, "options": ["Canary", "Blue/green"]}
    poll_body = render_activity(Genre.POLL, poll_draft)
    assert "## Options" in poll_body
    assert "1. **Canary**" in poll_body


@pytest.mark.asyncio
async def test_merge_generation_uses_discussions_role_and_forced_schema():
    draft = {
        "title": "New deployment view",
        "summary": "A deployment view was added.",
        "highlights": ["Shows rollout state"],
        "impact": "Operators can diagnose rollouts.",
        "prompt": "Try the view.",
        "options": [],
        "topic": "general",
    }
    router = FakeRouter(response(tool="submit_merge_decision", arguments=draft))
    decision = assess_mood(
        [{"title": "feat: deployment view", "body": "Release note", "labels": []}],
        [{"filename": "CHANGELOG.md", "changes": 20, "patch": "+ Added deployment view"}],
    )
    result = await merge_draft(
        router,
        [{"number": 12, "title": "feat: deployment view", "body": "Release note", "labels": []}],
        [
            {"filename": "src/large.py", "status": "modified", "patch": "+ internal\n" * 10_000},
            {"filename": "CHANGELOG.md", "status": "modified", "patch": "+ Added deployment view"},
        ],
        decision,
    )
    assert result == draft
    role, messages, kwargs = router.calls[0]
    assert role == "discussions"
    assert kwargs["effort"] == "low"
    assert kwargs["tool_choice"]["function"]["name"] == "submit_merge_decision"
    assert "Do not select, change, or second-guess" in messages[0].content
    assert "CHANGELOG.md" in messages[1].content
    assert '"genre": "announcement"' in messages[1].content
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


class FakeLabelsAPI:
    def __init__(self):
        self.calls = []

    async def graphql(self, query, variables):
        self.calls.append((query, variables))
        if "discussionCategories" in query:
            return {"repository": {"id": "repo-id", "discussionCategories": {"nodes": []}}}
        if "labels(first: 100" in query:
            return {
                "repository": {
                    "labels": {
                        "nodes": [
                            {"id": "q-id", "name": "qna"},
                            {"id": "bot-id", "name": "elixpoo-generated"},
                        ],
                        "pageInfo": {"hasNextPage": False, "endCursor": None},
                    }
                }
            }
        if "createLabel" in query:
            return {"createLabel": {"label": {"id": "k8s-id", "name": variables["name"]}}}
        if "addLabelsToLabelable" in query:
            return {"addLabelsToLabelable": {"labelable": {"labels": {"nodes": []}}}}
        raise AssertionError("unexpected query")


@pytest.mark.asyncio
async def test_ensure_and_apply_discussion_labels():
    api = FakeLabelsAPI()
    discussions = GitHubDiscussions(api, "elixpo", "elixpo")
    labels = await discussions.ensure_labels(
        {
            "qna": {"color": "0e8a16", "description": "Q&A"},
            "kubernetes": {"color": "326ce5", "description": "Kubernetes"},
            "elixpoo-generated": {"color": "6f42c1", "description": "Generated"},
        }
    )
    assert [label.name for label in labels] == ["qna", "kubernetes", "elixpoo-generated"]
    create_call = next(variables for query, variables in api.calls if "createLabel" in query)
    assert create_call["name"] == "kubernetes"
    assert create_call["color"] == "326ce5"

    await discussions.add_labels("discussion-id", [label.id for label in labels])
    add_call = next(variables for query, variables in api.calls if "addLabelsToLabelable" in query)
    assert add_call == {"discussionId": "discussion-id", "labelIds": ["q-id", "k8s-id", "bot-id"]}


class FakeMentionDiscussions:
    def __init__(self):
        now = datetime.now(timezone.utc).isoformat()
        self.comment = {
            "id": "comment-id",
            "body": "@elixpoo which rollout signal should we use?",
            "createdAt": now,
            "author": {"login": "contributor"},
            "replies": {"nodes": []},
        }
        self.thread = {
            "id": "discussion-id",
            "number": 7,
            "title": "Canary rollout",
            "body": "Compare rollout signals.",
            "url": "https://github.test/discussions/7",
            "createdAt": now,
            "author": {"login": "author"},
            "comments": {"nodes": [self.comment]},
        }
        self.added = []

    async def recent_threads(self):
        return [self.thread]

    async def comments(self, number):
        assert number == 7
        return [self.comment]

    async def add_comment(self, discussion_id, body, reply_to_id=None):
        self.added.append((discussion_id, body, reply_to_id))
        return {"id": "reply-id", "url": "https://github.test/discussions/7#reply"}


@pytest.mark.asyncio
async def test_mention_poll_replies_to_recent_exact_mention():
    discussions = FakeMentionDiscussions()
    router = FakeRouter(
        response(tool="submit_reply", arguments={"body": "Use error-rate and latency guardrails."}),
        response("SAFE"),
    )
    handled = await _poll_mentions(discussions, router, "elixpoo")
    assert handled == 1
    assert discussions.added[0][0] == "discussion-id"
    assert discussions.added[0][2] == "comment-id"
    assert "elixpoo-discussions:reply:comment-id" in discussions.added[0][1]


class FakePulseAPI:
    def __init__(self, pull, files):
        self.pull = pull
        self.files = files
        self.requested_repo = None

    async def list_pulls(self, owner, repo, **kwargs):
        self.requested_repo = f"{owner}/{repo}"
        return [self.pull]

    async def get_pull_files(self, owner, repo, number):
        assert number == self.pull["number"]
        return self.files


class FakePulseDiscussions:
    def __init__(self, recent=None):
        self._recent = recent or []

    async def recent(self, limit=50):
        return self._recent


@pytest.mark.asyncio
async def test_pulse_updates_resting_mood_without_model_call():
    now = datetime.now(timezone.utc).isoformat()
    pull = {
        "number": 3,
        "node_id": "PR_node_3",
        "title": "test: add coverage",
        "body": "",
        "labels": [],
        "merged_at": now,
    }
    api = FakePulseAPI(pull, [{"filename": "tests/test_more.py", "changes": 10, "patch": "+ test"}])
    result = await _handle_pulse(
        api,
        FakePulseDiscussions(),
        FakeRouter(),
        {"repository": {"full_name": "elixpo/agent.elixpo"}},
    )
    assert result is None
    assert api.requested_repo == "elixpo/agent.elixpo"
