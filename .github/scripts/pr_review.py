"""
pr_review.py — Handle @elixpo mentions on GitHub pull requests.

Env vars: AGENT_TOKEN, POLLINATIONS_KEY, PR_NUMBER, COMMENT_BODY,
          COMMENT_AUTHOR, REPO
"""

import os
import sys
import json
import urllib.request
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ci_config import *


def github_api(endpoint, method="GET", data=None, headers=None, raw=False):
    """Make a GitHub API request. If raw=True, return the response body as text."""
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
        content = resp.read().decode()
        if raw:
            return content
        return json.loads(content) if resp.status != 204 else None


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
    with urllib.request.urlopen(req, timeout=90) as resp:
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
    pr_number = os.environ["PR_NUMBER"]
    comment_author = os.environ.get("COMMENT_AUTHOR", "unknown")

    # Fetch PR metadata
    pr = github_api(f"/repos/{repo}/pulls/{pr_number}")
    pr_title = pr.get("title", "")
    pr_body = pr.get("body", "") or ""

    # Fetch the diff (raw text, limited to 10000 chars)
    diff = github_api(
        f"/repos/{repo}/pulls/{pr_number}",
        headers={"Accept": "application/vnd.github.v3.diff"},
        raw=True,
    )
    if len(diff) > 10000:
        diff = diff[:10000] + "\n\n... [diff truncated at 10000 chars] ..."

    # Fetch list of changed files
    files_data = github_api(f"/repos/{repo}/pulls/{pr_number}/files")
    changed_files = [f.get("filename", "") for f in files_data]

    # Fetch review comments on the PR
    review_comments = github_api(f"/repos/{repo}/pulls/{pr_number}/comments")
    review_history = ""
    for rc in review_comments:
        author = rc.get("user", {}).get("login", "unknown")
        body = rc.get("body", "")
        path = rc.get("path", "")
        line = rc.get("original_line", "")
        review_history += f"\n---\n**{author}** on `{path}` L{line}:\n{body}\n"

    # Build context for the LLM
    system_prompt = (
        f"You are elixpo, a senior code reviewer for {PROJECT_NAME} "
        f"({PROJECT_DESCRIPTION}).\n"
        "Review this pull request thoroughly. Check for:\n"
        "- Security issues (XSS, injection, auth bypasses, secrets exposure)\n"
        "- Logic errors and edge cases\n"
        "- Code quality and readability\n"
        "- Missing error handling\n"
        "- Performance concerns\n\n"
        "Structure your review as:\n"
        "**Security**: (any issues or \"Looks good\")\n"
        "**Logic**: (any issues or \"Looks good\")\n"
        "**Quality**: (suggestions if any)\n"
        "**Verdict**: Approve / Request Changes / Needs Discussion\n\n"
        "Be direct and specific. Reference line numbers when possible.\n"
        "Do not use emojis. Keep it under 500 words."
    )

    files_list = "\n".join(f"- {f}" for f in changed_files)

    user_message = (
        f"## PR #{pr_number}: {pr_title}\n\n"
        f"**Description:**\n{pr_body}\n\n"
        f"**Changed files:**\n{files_list}\n\n"
        f"**Diff:**\n```diff\n{diff}\n```\n\n"
    )
    if review_history:
        user_message += f"**Previous review comments:**\n{review_history}\n\n"
    user_message += (
        f"---\n**Review requested by @{comment_author}:**\n{comment_body}"
    )

    # Call LLM
    try:
        response = call_llm(system_prompt, user_message)
    except Exception as e:
        print(f"LLM call failed: {e}")
        response = "I couldn't complete the review. Please try again."

    # Post review as a comment on the PR
    github_api(
        f"/repos/{repo}/issues/{pr_number}/comments",
        method="POST",
        data={"body": response},
    )
    print(f"Posted review comment on PR #{pr_number}")

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
