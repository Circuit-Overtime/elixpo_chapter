"""Model-extracted issue signals — the fuzzy half of §4 scoring + a rationale.

Uses STRUCTURED OUTPUT: the model is forced to call `record_issue_signals` with
a fixed schema, so we read typed arguments instead of parsing free text (robust
under concurrency, where reasoning models otherwise wrap JSON in prose). Falls
back to tolerant text parsing if a model returns content instead of a tool call.
"""

from __future__ import annotations

import json

from rtk.models import FunctionDef, Message, ToolDef
from rtk.truncate import truncate_text

_SYSTEM = (
    "You triage open-source issues for an autonomous contributor. Judge only from "
    "the text, then call record_issue_signals with your verdict."
)

_SIGNALS_TOOL = ToolDef(
    function=FunctionDef(
        name="record_issue_signals",
        description="Record triage signals for one issue.",
        parameters={
            "type": "object",
            "properties": {
                "has_repro_steps": {"type": "boolean"},
                "has_acceptance_criterion": {"type": "boolean"},
                "someone_claimed_recently": {"type": "boolean", "description": "comment claims it <14d ago"},
                "maintainer_claimed": {"type": "boolean", "description": "a maintainer claimed/assigned it"},
                "touches_internal_paths": {"type": "boolean", "description": "internal/ or private/ code"},
                "tractable": {"type": "boolean", "description": "one external contributor, one PR"},
                "rationale": {"type": "string", "description": "one sentence on why (or why not)"},
            },
            "required": ["tractable", "rationale"],
        },
    )
)
_FORCE = {"type": "function", "function": {"name": "record_issue_signals"}}


def _parse_text(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return {}
    try:
        obj = json.loads(text[start : end + 1])
        return obj if isinstance(obj, dict) else {}
    except json.JSONDecodeError:
        return {}


def _prompt(issue: dict, comments: list[dict] | None) -> str:
    parts = [f"TITLE: {issue.get('title', '')}", f"BODY:\n{issue.get('body') or '(empty)'}"]
    if comments:
        joined = "\n".join(
            f"- @{c.get('user', {}).get('login', '?')} ({c.get('author_association', '')}): "
            f"{(c.get('body') or '')[:300]}"
            for c in comments[:10]
        )
        parts.append(f"COMMENTS:\n{joined}")
    return truncate_text("\n\n".join(parts), max_tokens=3000)


async def extract_issue_signals(router, issue: dict, comments: list[dict] | None = None) -> dict:
    """Return the fuzzy signal dict (+ tractable/rationale). Empty-ish on failure."""
    messages = [
        Message(role="system", content=_SYSTEM),
        Message(role="user", content=_prompt(issue, comments)),
    ]
    resp = await router.call("triage", messages, tools=[_SIGNALS_TOOL], tool_choice=_FORCE)
    msg = resp.choices[0].message
    if msg.tool_calls:
        try:
            return json.loads(msg.tool_calls[0].function.arguments)
        except (json.JSONDecodeError, IndexError):
            pass
    return _parse_text(msg.content or "")
