"""GitHub webhook receiver — signature verification and event dispatch."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import structlog
from fastapi import HTTPException, Request

from elixpo.config import settings

log = structlog.get_logger()


def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature.

    GitHub sends the signature as 'sha256=<hex_digest>'.
    """
    if not signature.startswith("sha256="):
        return False

    expected = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(f"sha256={expected}", signature)


async def parse_webhook(request: Request) -> dict[str, Any]:
    """Parse and verify an incoming GitHub webhook request.

    Returns a dict with:
      - event: the event type (e.g., 'issue_comment')
      - action: the action (e.g., 'created')
      - delivery_id: unique webhook delivery ID
      - payload: the full parsed JSON payload
    """
    body = await request.body()

    # Verify signature
    signature = request.headers.get("X-Hub-Signature-256", "")
    if not verify_signature(body, signature, settings.github.webhook_secret):
        log.warning("webhook.signature_invalid")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event", "")
    delivery_id = request.headers.get("X-GitHub-Delivery", "")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    action = payload.get("action", "")

    log.info(
        "webhook.received",
        event=event,
        action=action,
        delivery_id=delivery_id,
    )

    return {
        "event": event,
        "action": action,
        "delivery_id": delivery_id,
        "payload": payload,
    }


def is_bot_mentioned(text: str, bot_username: str | None = None) -> bool:
    """Check if the bot is @mentioned in a comment or body."""
    username = bot_username or settings.github.bot_username
    return f"@{username}" in text


def extract_task_from_mention(text: str, bot_username: str | None = None) -> str:
    """Extract the task/instruction from a comment that mentions the bot.

    E.g., '@elixpoo fix the login bug' -> 'fix the login bug'
    """
    username = bot_username or settings.github.bot_username
    mention = f"@{username}"

    # Find the mention and take everything after it
    idx = text.find(mention)
    if idx == -1:
        return text.strip()

    after = text[idx + len(mention):].strip()
    return after if after else text.strip()


class WebhookDispatcher:
    """Routes webhook events to appropriate handlers."""

    def __init__(self):
        self._handlers: dict[str, list] = {}

    def on(self, event: str, action: str | None = None):
        """Decorator to register a webhook handler.

        Usage:
            @dispatcher.on("issue_comment", "created")
            async def handle_issue_comment(payload):
                ...
        """
        key = f"{event}.{action}" if action else event

        def decorator(func):
            self._handlers.setdefault(key, []).append(func)
            return func

        return decorator

    async def dispatch(self, event: str, action: str, payload: dict) -> list[Any]:
        """Dispatch a webhook event to all matching handlers."""
        results = []

        # Try specific event.action first
        key = f"{event}.{action}"
        for handler in self._handlers.get(key, []):
            result = await handler(payload)
            results.append(result)

        # Also try generic event handlers
        for handler in self._handlers.get(event, []):
            result = await handler(payload)
            results.append(result)

        if not results:
            log.debug("webhook.no_handler", gh_event=event, gh_action=action)

        return results
