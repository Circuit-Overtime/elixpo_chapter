"""Zero-cost deterministic routing for obvious user intents."""

from __future__ import annotations

import re

_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("pdf-maker", re.compile(r"\b(pdf|export|download)\b.*\b(pdf|document|report)?\b", re.I)),
    ("image-maker", re.compile(r"\b(create|generate|draw|render|make)\b.{0,40}\b(image|picture|illustration|logo|poster|art)\b", re.I)),
    ("coding", re.compile(r"\b(code|coding|program|function|class|api|bug|debug|refactor|test|python|javascript|typescript|react|sql|dockerfile)\b", re.I)),
    ("memory", re.compile(r"\b(earlier|previous|last time|we discussed|recap|conversation history|remember)\b", re.I)),
    ("media", re.compile(r"\b(youtube|video|transcrib|audio|this image|image url|what.*image)\b", re.I)),
    ("web-search", re.compile(r"\b(latest|current|today|news|price|score|weather|search the web|look up|find online|sources?)\b", re.I)),
    ("writing", re.compile(r"\b(write|rewrite|draft|edit|summarize|article|email|essay|story|documentation|copy)\b", re.I)),
)


def route_request(prompt: str) -> str:
    """Return a specialist for obvious intent, otherwise the cheap decision agent."""
    normalized = " ".join(prompt.split())
    for agent, pattern in _RULES:
        if pattern.search(normalized):
            return agent
    return "decision"
