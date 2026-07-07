"""Model-extracted issue signals — the fuzzy half of §4 scoring + a rationale.

One cheap `triage`-role call per shortlisted issue. Asks for strict JSON so the
result is machine-usable; a tolerant parser shrugs off stray prose. The rationale
becomes part of Pick's justification (why this issue is a good, tractable target).
"""

from __future__ import annotations

import json

from rtk.models import Message
from rtk.truncate import truncate_text

_SYSTEM = (
    "You triage open-source issues for an autonomous contributor. Judge only from "
    "the text. Reply with ONE JSON object, no prose, with exactly these keys:\n"
    '{"has_repro_steps": bool, "has_acceptance_criterion": bool, '
    '"someone_claimed_recently": bool, "maintainer_claimed": bool, '
    '"touches_internal_paths": bool, "tractable": bool, "rationale": string}\n'
    "tractable = a lone external contributor could plausibly finish it in one PR. "
    "rationale = one sentence on why (or why not)."
)


def _parse(text: str) -> dict:
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
    """Return the fuzzy signal dict (+ tractable/rationale). Empty-ish on parse failure."""
    messages = [
        Message(role="system", content=_SYSTEM),
        Message(role="user", content=_prompt(issue, comments)),
    ]
    resp = await router.call("triage", messages)
    content = resp.choices[0].message.content or ""
    return _parse(content)
