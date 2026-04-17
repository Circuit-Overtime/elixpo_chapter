"""
issue_description.py — Auto-generate a structured description for issues
opened with no body (or a very thin body).

Env vars: AGENT_TOKEN, POLLINATIONS_KEY, ISSUE_NUMBER, REPO
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
        "Authorization": f"Bearer {os.environ['POLLINATIONS_KEY']}",
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


def fallback_body(title):
    """Basic template used when the LLM response is malformed."""
    return (
        "## Problem Statement\n"
        f"{title}\n\n"
        "## Todo's\n"
        "- Scope the change\n"
        "- Identify affected files\n"
        "- Implement\n"
        "- Add tests\n\n"
        "## Checklist\n"
        "- [ ] Implementation complete\n"
        "- [ ] Tests pass\n"
        "- [ ] Documentation updated\n"
    )


def looks_valid(body):
    """Check that the generated body contains the expected section headers."""
    if not body:
        return False
    required = ["## Problem Statement", "## Todo's", "## Checklist"]
    return all(marker in body for marker in required)


def main():
    repo = os.environ.get("REPO", REPO)
    issue_number = os.environ["ISSUE_NUMBER"]

    print(f"Checking issue #{issue_number} in {repo}")

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
        f"You are writing an issue description for {PROJECT_NAME} ({PROJECT_DESCRIPTION}).\n"
        "The reporter left only a title. Infer the concrete problem and write a decisive, "
        "technical description — no hedging, no filler, no phrases like 'likely wants' or "
        "'needs to be clarified'. State the problem as a fact. Reference real files, "
        "components, or paths from the repo context when possible.\n\n"
        "Output EXACTLY this markdown structure (no preamble, no closing text):\n\n"
        "## Problem Statement\n"
        "<2-3 sentences stating the concrete problem or goal. Direct, technical, factual.>\n\n"
        "## Todo's\n"
        "- <specific actionable task referencing real files/components>\n"
        "- <3-5 tasks total, concrete and decisive>\n\n"
        "## Checklist\n"
        "- [ ] <verification item>\n"
        "- [ ] <3-5 items — what must be true before closing>"
    )

    user_message = f"Issue title: {title}\n\nRepo context:\n{context}"

    generated = ""
    try:
        generated = call_llm(system_prompt, user_message)
        print(f"LLM returned {len(generated)} chars")
    except Exception as e:
        print(f"LLM call failed: {e}")

    # 6. Validate; fall back if malformed
    if not looks_valid(generated):
        print("LLM response malformed or missing; using fallback template.")
        generated = fallback_body(title)

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
