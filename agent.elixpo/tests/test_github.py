"""Tests for GitHub webhook verification and utilities."""

import hashlib
import hmac

import pytest

from elixpo.github.webhooks import (
    extract_task_from_mention,
    is_bot_mentioned,
    verify_signature,
    WebhookDispatcher,
)


def test_verify_signature_valid():
    secret = "test-secret"
    payload = b'{"action": "created"}'
    sig = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    assert verify_signature(payload, sig, secret) is True


def test_verify_signature_invalid():
    assert verify_signature(b"payload", "sha256=invalid", "secret") is False


def test_verify_signature_wrong_prefix():
    assert verify_signature(b"payload", "md5=abc", "secret") is False


def test_is_bot_mentioned():
    assert is_bot_mentioned("Hey @elixpoo fix this", "elixpoo") is True
    assert is_bot_mentioned("Hey @someone fix this", "elixpoo") is False
    assert is_bot_mentioned("@elixpoo", "elixpoo") is True


def test_extract_task():
    assert extract_task_from_mention(
        "@elixpoo fix the login bug", "elixpoo"
    ) == "fix the login bug"

    assert extract_task_from_mention(
        "Hey @elixpoo can you review this PR?", "elixpoo"
    ) == "can you review this PR?"

    assert extract_task_from_mention(
        "no mention here", "elixpoo"
    ) == "no mention here"


@pytest.mark.asyncio
async def test_webhook_dispatcher():
    dispatcher = WebhookDispatcher()
    results = []

    @dispatcher.on("issue_comment", "created")
    async def handle(payload):
        results.append(payload["action"])
        return "handled"

    await dispatcher.dispatch("issue_comment", "created", {"action": "created"})
    assert results == ["created"]

    # Unhandled event returns empty
    out = await dispatcher.dispatch("push", "pushed", {})
    assert out == []
