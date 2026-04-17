"""
issue_comment.py — Handle @elixpo mentions in GitHub issue comments.

Env vars: AGENT_TOKEN, POLLINATIONS_KEY, ISSUE_NUMBER, COMMENT_BODY,
          COMMENT_AUTHOR, REPO
"""

import os
import sys
import json
import urllib.request
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ci_config import *


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


def get_comment_id():
    """Extract the triggering comment ID from GITHUB_EVENT_PATH or env."""
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if event_path and os.path.isfile(event_path):
        with open(event_path, "r") as f:
            event = json.load(f)
        comment = event.get("comment", {})
        return comment.get("id")
    return os.environ.get("COMMENT_ID")


def main():
    comment_body = os.environ.get("COMMENT_BODY", "")
    if AGENT_TRIGGER not in comment_body:
        print("No agent trigger found in comment. Exiting.")
        return

    repo = os.environ.get("REPO", REPO)
    issue_number = os.environ["ISSUE_NUMBER"]
    comment_author = os.environ.get("COMMENT_AUTHOR", "unknown")

    owner, name = repo.split("/")

    # Fetch issue details
    issue = github_api(f"/repos/{repo}/issues/{issue_number}")
    issue_title = issue.get("title", "")
    issue_body = issue.get("body", "") or ""

    # Fetch all comments on the issue
    comments = github_api(f"/repos/{repo}/issues/{issue_number}/comments")
    comment_history = ""
    for c in comments:
        author = c.get("user", {}).get("login", "unknown")
        body = c.get("body", "")
        comment_history += f"\n---\n**{author}**:\n{body}\n"

    # Build context for the LLM
    system_prompt = (
        f"You are elixpo, a helpful AI assistant for the {PROJECT_NAME} project "
        f"({PROJECT_DESCRIPTION}).\n"
        "You are responding to a question or request on a GitHub issue.\n"
        "Be concise, helpful, and technical. Reference specific files or code when relevant.\n"
        "If you don't know something, say so honestly.\n"
        "Do not use emojis. Keep responses under 300 words."
    )

    user_message = (
        f"## Issue #{issue_number}: {issue_title}\n\n"
        f"**Description:**\n{issue_body}\n\n"
        f"**Comment history:**\n{comment_history}\n\n"
        f"---\n**New comment from @{comment_author}:**\n{comment_body}"
    )

    # Call LLM
    try:
        response = call_llm(system_prompt, user_message)
    except Exception as e:
        print(f"LLM call failed: {e}")
        response = "I couldn't complete the analysis. Please try again."

    # Post reply as a comment
    github_api(
        f"/repos/{repo}/issues/{issue_number}/comments",
        method="POST",
        data={"body": response},
    )
    print(f"Posted comment on issue #{issue_number}")

    # React with eyes to the triggering comment
    comment_id = get_comment_id()
    if comment_id:
        try:
            github_api(
                f"/repos/{repo}/issues/comments/{comment_id}/reactions",
                method="POST",
                data={"content": "eyes"},
            )
            print(f"Added eyes reaction to comment {comment_id}")
        except Exception as e:
            print(f"Failed to add reaction: {e}")
    else:
        print("No comment ID available; skipping reaction.")


if __name__ == "__main__":
    main()
