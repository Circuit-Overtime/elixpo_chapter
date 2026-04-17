"""
issue_description.py — Auto-generate a structured description for issues
opened with no body (or a very thin body).

Env vars: AGENT_TOKEN, POLLINATIONS_KEY, ISSUE_NUMBER, ISSUE_AUTHOR, REPO
Optional: CONTEXT_PATH (path to downloaded repo-context artifact's context.md)
"""

import os
import sys
import json
import urllib.request
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ci_config import *


MIN_BODY_CHARS = 30
CONTEXT_MAX_CHARS = 6000


def github_api(endpoint, method="GET", data=None, headers=None):
    """Make a GitHub API request."""
    url = f"https://api.github.com{endpoint}"
    hdrs = {
        "Authorization": f"Bearer {os.environ['AGENT_TOKEN']}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "elixpo-ci",
    }
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode()) if resp.status != 204 else None


def call_llm(system_prompt, user_message):
    """Call the Pollinations LLM endpoint."""
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.3,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.environ['POLLINATIONS_KEY'].strip()}",
        "User-Agent": "elixpo-ci/1.0",
    }
    req = urllib.request.Request(
        LLM_API_URL,
        data=json.dumps(payload).encode(),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())
    return result["choices"][0]["message"]["content"]


def needs_generating(body):
    """Return True if the issue body is missing or too thin."""
    if body is None:
        return True
    stripped = body.strip()
    if len(stripped) < MIN_BODY_CHARS:
        return True
    return False


def load_context():
    """Read the repo context from CONTEXT_PATH if available, else ''."""
    ctx_path = os.environ.get("CONTEXT_PATH", "").strip()
    if not ctx_path:
        print("No CONTEXT_PATH set; proceeding with empty context.")
        return ""
    if not os.path.isfile(ctx_path):
        print(f"Context file not found at {ctx_path}; proceeding with empty context.")
        return ""
    try:
        with open(ctx_path, "r", encoding="utf-8") as f:
            ctx = f.read()
        print(f"Loaded {len(ctx)} chars of repo context from {ctx_path}")
        if len(ctx) > CONTEXT_MAX_CHARS:
            print(f"Truncating context to {CONTEXT_MAX_CHARS} chars")
            ctx = ctx[:CONTEXT_MAX_CHARS]
        return ctx
    except Exception as e:
        print(f"Failed to read context file: {e}")
        return ""


def fallback_body(title, author="reporter"):
    """Basic template used when the LLM response is malformed."""
    return (
        "## Problem Statement\n"
        f"{title}\n\n"
        f"## Questions for @{author}\n"
        "- What is the exact scope of this change?\n"
        "- Which files or components should be affected?\n"
        "- What is the expected behavior after the change?\n\n"
        f"> @{author} — please reply in this issue and tag **@elixpoo** in your response so I can pick it up.\n\n"
        "## Todo's\n"
        f"- Scope to be defined once @{author} answers questions above.\n\n"
        "## Checklist\n"
        f"- [ ] @{author}'s questions answered\n"
        "- [ ] Implementation complete\n"
        "- [ ] Tests pass\n"
        "- [ ] Documentation updated if behavior changes\n"
    )


def looks_valid(body):
    """Check that the generated body contains the expected section headers."""
    if not body:
        return False
    required = [
        "## Problem Statement",
        "## Questions for",  # allows "Questions for @username"
        "## Todo's",
        "## Checklist",
    ]
    return all(marker in body for marker in required)


def main():
    repo = os.environ.get("REPO", REPO)
    issue_number = os.environ["ISSUE_NUMBER"]
    author = os.environ.get("ISSUE_AUTHOR", "").strip() or "reporter"

    print(f"Checking issue #{issue_number} in {repo} (author: @{author})")

    # 1. Fetch the issue
    issue = github_api(f"/repos/{repo}/issues/{issue_number}")
    title = issue.get("title", "") or ""
    body = issue.get("body", "") or ""

    # 2. Skip if already well-formed
    if "## Problem Statement" in body:
        print("Body already contains a Problem Statement section; skipping.")
        return

    # 3. Skip if body already looks good
    if not needs_generating(body):
        print("Body looks good, skipping.")
        return

    print(f"Body is empty or thin ({len(body.strip())} chars); generating description.")

    # 4. Load repo context (optional)
    context = load_context()

    # 5. Call the LLM
    system_prompt = (
        f"You are structuring a GitHub issue for {PROJECT_NAME} ({PROJECT_DESCRIPTION}).\n"
        f"The reporter (@{author}) left only a title. Your job is to produce a structured "
        "skeleton — NOT to invent requirements.\n\n"
        "STRICT RULES:\n"
        "1. ONLY reference files, directories, functions, or components that appear VERBATIM "
        "in the 'Repo context' section below. Never invent file paths. If you cannot find a "
        "relevant file in the context, describe the component generically (e.g., 'the auth module') "
        "without a path.\n"
        "2. Do NOT assume scope, fix approach, or implementation details the reporter did not state. "
        "If the title is ambiguous, ASK the reporter — do not guess.\n"
        "3. Be factual and concise. No hedging, no filler, no marketing language.\n"
        f"4. Use the 'Questions for @{author}' section whenever the title leaves something unclear. "
        "This is the PRIMARY mechanism for moving the issue forward when you don't have enough info.\n\n"
        "Output EXACTLY this markdown (no preamble, no closing text):\n\n"
        "## Problem Statement\n"
        f"<1-3 sentences restating what the title conveys. If the title is vague, say so plainly "
        f"(e.g., '@{author} asks for X, but the specific scope is not stated.'). Do not pad.>\n\n"
        f"## Questions for @{author}\n"
        "- <concrete question that must be answered before work starts>\n"
        "- <2-5 questions if needed; if the title is fully self-explanatory, write 'None — title is clear.'>\n\n"
        f"> @{author} — please reply in this issue and tag **@elixpoo** in your response so I can pick it up.\n\n"
        "## Todo's\n"
        "- <only list tasks that are OBVIOUSLY required given the title + context. Reference real files "
        "from the context when they are unambiguously relevant. Otherwise use generic language.>\n"
        f"- <If the scope is unclear, write a single bullet: '- Scope to be defined once @{author} answers questions above.'>\n\n"
        "## Checklist\n"
        f"- [ ] @{author}'s questions answered\n"
        "- [ ] <other verification items that are objectively required, e.g., 'Change reviewed', 'Tests pass', 'Docs updated if behavior changes'. Keep to 3-5 items.>"
    )

    user_message = f"Issue title: {title}\nReporter: @{author}\n\nRepo context:\n{context}"

    generated = ""
    try:
        generated = call_llm(system_prompt, user_message)
        print(f"LLM returned {len(generated)} chars")
    except Exception as e:
        print(f"LLM call failed: {e}")

    # 6. Validate; fall back if malformed
    if not looks_valid(generated):
        print("LLM response malformed or missing; using fallback template.")
        generated = fallback_body(title, author)

    # 7. Update the issue body
    try:
        github_api(
            f"/repos/{repo}/issues/{issue_number}",
            method="PATCH",
            data={"body": generated},
        )
        print(f"Updated body of issue #{issue_number}")
    except Exception as e:
        print(f"Failed to update issue body: {e}")


if __name__ == "__main__":
    main()
