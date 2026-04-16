#!/usr/bin/env python3
"""
merge_gist.py — Runs on PR merge.
  1. Creates/updates a Gist changelog entry (via Pollinations LLM).
  2. Closes issues linked to the merged PR.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ── Config import ──────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ci_config import *  # noqa: F401, F403

# ── Environment ────────────────────────────────────────
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
GIST_TOKEN = os.environ["GIST_TOKEN"]
POLLINATIONS_KEY = os.environ["POLLINATIONS_KEY"]
PR_NUMBER = os.environ["PR_NUMBER"]
REPO = os.environ.get("REPO", globals().get("REPO", ""))

GITHUB_API = "https://api.github.com"


# ── Helpers ────────────────────────────────────────────
def api_request(url, method="GET", data=None, token=GITHUB_TOKEN, accept="application/vnd.github+json"):
    """Make a GitHub/Gist API request via urllib."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": accept,
        "User-Agent": "elixpo-ci",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode() if exc.fp else ""
        print(f"[ERROR] {method} {url} -> {exc.code}: {detail}", file=sys.stderr)
        raise


def llm_summarize(title, body, files):
    """Call Pollinations LLM for a changelog summary. Returns plain text."""
    user_content = (
        f"PR Title: {title}\n\n"
        f"PR Body:\n{body or '(no description)'}\n\n"
        f"Changed files:\n{chr(10).join(files)}"
    )
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a changelog writer. Write a 2-3 sentence summary "
                    "of this PR for a public changelog. Be concise and factual. "
                    "No markdown formatting."
                ),
            },
            {"role": "user", "content": user_content},
        ],
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {POLLINATIONS_KEY}",
        "User-Agent": "elixpo-ci",
    }
    req = urllib.request.Request(
        LLM_API_URL,
        data=json.dumps(payload).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
        return result["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        print(f"[WARN] LLM call failed ({exc}), falling back to PR title", file=sys.stderr)
        return title


# ── Part 1: Gist Digest ──────────────────────────────
def run_gist_digest():
    """Fetch PR data, generate summary, create/update gist, comment on PR."""
    pr_url = f"{GITHUB_API}/repos/{REPO}/pulls/{PR_NUMBER}"
    pr = api_request(pr_url)

    title = pr["title"]
    body = pr.get("body") or ""
    merged_by = pr.get("merged_by", {}).get("login", "unknown")

    # Fetch changed files
    files_url = f"{pr_url}/files?per_page=100"
    files_data = api_request(files_url)
    filenames = [f["filename"] for f in files_data]

    # LLM summary
    summary = llm_summarize(title, body, filenames)

    # Format entry
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key_files = ", ".join(filenames[:10])
    if len(filenames) > 10:
        key_files += f" (+{len(filenames) - 10} more)"

    entry = (
        f"## PR #{PR_NUMBER} — {title} ({date_str})\n"
        f"Merged by: @{merged_by}\n"
        f"{summary}\n"
        f"Files: {key_files}\n"
        f"\n---\n\n"
    )

    gist_id = globals().get("GIST_ID", "")
    gist_filename = f"{PROJECT_NAME}-changelog.md"
    gist_url = ""

    if gist_id:
        # Update existing gist — prepend new entry
        gist_data = api_request(f"{GITHUB_API}/gists/{gist_id}", token=GIST_TOKEN)
        existing = gist_data["files"].get(gist_filename, {}).get("content", "")
        new_content = entry + existing
        api_request(
            f"{GITHUB_API}/gists/{gist_id}",
            method="PATCH",
            data={"files": {gist_filename: {"content": new_content}}},
            token=GIST_TOKEN,
        )
        gist_url = gist_data["html_url"]
        print(f"Gist updated: {gist_url}")
    else:
        # Create new public gist
        gist_payload = {
            "description": f"{PROJECT_NAME} — Change Log",
            "public": True,
            "files": {gist_filename: {"content": entry}},
        }
        created = api_request(
            f"{GITHUB_API}/gists",
            method="POST",
            data=gist_payload,
            token=GIST_TOKEN,
        )
        gist_url = created["html_url"]
        new_gist_id = created["id"]
        print(f"GIST_ID={new_gist_id}")
        print(f"Gist created: {gist_url}")

    # Comment on the merged PR
    comment_url = f"{GITHUB_API}/repos/{REPO}/issues/{PR_NUMBER}/comments"
    api_request(
        comment_url,
        method="POST",
        data={"body": f"\U0001f4cb Changelog updated: {gist_url}"},
    )
    print(f"Commented on PR #{PR_NUMBER}")


# ── Part 2: Close Linked Issues ──────────────────────
def find_linked_issues():
    """Scan PR title, body, branch, and commits for linked issue numbers."""
    pr_url = f"{GITHUB_API}/repos/{REPO}/pulls/{PR_NUMBER}"
    pr = api_request(pr_url)

    sources = [
        pr.get("title") or "",
        pr.get("body") or "",
        pr.get("head", {}).get("ref") or "",
    ]

    # Fetch commit messages
    commits_url = f"{pr_url}/commits?per_page=100"
    try:
        commits = api_request(commits_url)
        for c in commits:
            msg = c.get("commit", {}).get("message", "")
            sources.append(msg)
    except Exception as exc:
        print(f"[WARN] Could not fetch commits: {exc}", file=sys.stderr)

    issue_numbers = set()

    # Pattern: Closes/Fixes/Resolves #N
    keyword_pattern = re.compile(r"(?:closes|fixes|resolves)\s+#(\d+)", re.IGNORECASE)
    for text in sources:
        for match in keyword_pattern.finditer(text):
            issue_numbers.add(int(match.group(1)))

    # Pattern: branch name matching */issue-N
    branch = pr.get("head", {}).get("ref") or ""
    branch_pattern = re.compile(r"issue-(\d+)")
    for match in branch_pattern.finditer(branch):
        issue_numbers.add(int(match.group(1)))

    return issue_numbers


def close_linked_issues():
    """Close each linked issue with a comment."""
    issue_numbers = find_linked_issues()
    if not issue_numbers:
        print("No linked issues found.")
        return

    for num in sorted(issue_numbers):
        issue_url = f"{GITHUB_API}/repos/{REPO}/issues/{num}"
        try:
            issue = api_request(issue_url)
        except Exception as exc:
            print(f"[WARN] Could not fetch issue #{num}: {exc}", file=sys.stderr)
            continue

        # Skip if already closed or if it's a pull request
        if issue.get("state") != "open":
            print(f"Issue #{num} is not open (state={issue.get('state')}), skipping.")
            continue
        if issue.get("pull_request"):
            print(f"#{num} is a pull request, skipping.")
            continue

        # Close the issue
        try:
            api_request(
                issue_url,
                method="PATCH",
                data={"state": "closed", "state_reason": "completed"},
            )
            print(f"Closed issue #{num}")
        except Exception as exc:
            print(f"[ERROR] Failed to close issue #{num}: {exc}", file=sys.stderr)
            continue

        # Post comment
        try:
            api_request(
                f"{issue_url}/comments",
                method="POST",
                data={"body": f"Closed by PR #{PR_NUMBER}"},
            )
        except Exception as exc:
            print(f"[WARN] Failed to comment on issue #{num}: {exc}", file=sys.stderr)


# ── Main ──────────────────────────────────────────────
def main():
    print(f"=== merge_gist.py — PR #{PR_NUMBER} in {REPO} ===")

    print("\n--- Part 1: Gist Digest ---")
    try:
        run_gist_digest()
    except Exception as exc:
        print(f"[ERROR] Gist digest failed: {exc}", file=sys.stderr)

    print("\n--- Part 2: Close Linked Issues ---")
    try:
        close_linked_issues()
    except Exception as exc:
        print(f"[ERROR] Issue closing failed: {exc}", file=sys.stderr)

    print("\nDone.")


if __name__ == "__main__":
    main()
