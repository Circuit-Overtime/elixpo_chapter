"""
pr_assign.py — Assign PRs when opened.

Always assigns the PR author. For external contributors (not in ORG_MEMBERS),
uses the LLM to pick the best maintainer as a reviewer based on changed files,
title, and body. The chosen maintainer is also added as an assignee.

Env vars: AGENT_TOKEN, POLLINATIONS_KEY, PR_NUMBER, PR_TITLE, PR_BODY,
          PR_AUTHOR, REPO
"""

import os
import sys
import json
import urllib.request
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ci_config import *


DEFAULT_REVIEWER = "Circuit-Overtime"


def github_api(endpoint, method="GET", data=None, headers=None):
    """Make a GitHub API request. Returns parsed JSON or None on 204."""
    url = f"https://api.github.com{endpoint}"
    hdrs = {
        "Authorization": f"Bearer {os.environ['AGENT_TOKEN']}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "elixpo-ci",
    }
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode()
        if resp.status == 204 or not content:
            return None
        return json.loads(content)


def safe_api(endpoint, method="GET", data=None, headers=None, description=""):
    """Call github_api and swallow errors (print + continue)."""
    try:
        return github_api(endpoint, method=method, data=data, headers=headers)
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode()
        except Exception:
            pass
        print(f"API error ({description or endpoint}): {e.code} {e.reason} — {err_body}")
    except Exception as e:
        print(f"API error ({description or endpoint}): {e}")
    return None


def call_llm(system_prompt, user_message):
    """Call the Pollinations LLM endpoint with JSON response format."""
    payload = {
        "model": LLM_MODEL_CHAT,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
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


def pick_reviewer(pr_title, pr_body, changed_files):
    """Ask the LLM which maintainer should review. Falls back to DEFAULT_REVIEWER."""
    maintainer_lines = []
    for name, info in MAINTAINERS.items():
        skills = ", ".join(info.get("skills", []))
        role = info.get("role", "")
        maintainer_lines.append(f"- {name}: {role} (skills: {skills})")
    maintainers_block = "\n".join(maintainer_lines)

    system_prompt = (
        "You are a PR router. Pick the BEST maintainer to review this PR based on its content.\n\n"
        f"Available maintainers:\n{maintainers_block}\n\n"
        "Pick exactly ONE username. Consider:\n"
        "- File paths changed (frontend/backend/docs?)\n"
        "- PR title and description\n"
        "- Nature of the change (feature/bug/docs/infra?)\n\n"
        "Respond in JSON only: {\"reviewer\": \"username\", \"reason\": \"one sentence why\"}"
    )

    files_for_prompt = changed_files[:30]
    files_list = "\n".join(f"- {f}" for f in files_for_prompt) if files_for_prompt else "(none)"
    user_message = (
        f"Title: {pr_title}\n\n"
        f"Body: {pr_body}\n\n"
        f"Changed files:\n{files_list}"
    )

    try:
        raw = call_llm(system_prompt, user_message)
        parsed = json.loads(raw)
        reviewer = parsed.get("reviewer", "").strip()
        reason = parsed.get("reason", "").strip() or "selected by router"
        if reviewer not in MAINTAINERS:
            print(f"LLM returned invalid reviewer '{reviewer}'; falling back to {DEFAULT_REVIEWER}")
            return DEFAULT_REVIEWER, "default reviewer (LLM returned invalid maintainer)"
        return reviewer, reason
    except Exception as e:
        print(f"LLM call failed: {e}; falling back to {DEFAULT_REVIEWER}")
        return DEFAULT_REVIEWER, "default reviewer (LLM unavailable)"


def main():
    repo = os.environ.get("REPO", REPO)
    pr_number = os.environ["PR_NUMBER"]
    pr_author = os.environ.get("PR_AUTHOR", "").strip()
    pr_title = os.environ.get("PR_TITLE", "") or ""
    pr_body = os.environ.get("PR_BODY", "") or ""

    if not pr_author:
        print("PR_AUTHOR is empty; aborting.")
        return

    # 1. Always assign the PR author.
    safe_api(
        f"/repos/{repo}/issues/{pr_number}/assignees",
        method="POST",
        data={"assignees": [pr_author]},
        description="assign PR author",
    )
    print(f"Assigned PR #{pr_number} to author @{pr_author}")

    # 2. Org member? Just comment and exit.
    if pr_author in ORG_MEMBERS:
        print("Org member opened PR, only assigning author")
        safe_api(
            f"/repos/{repo}/issues/{pr_number}/comments",
            method="POST",
            data={"body": f"PR assigned to @{pr_author}"},
            description="author-only comment",
        )
        return

    # 3. External contributor — fetch changed files and pick a reviewer.
    files_data = safe_api(
        f"/repos/{repo}/pulls/{pr_number}/files?per_page=100",
        description="list changed files",
    ) or []
    changed_files = [f.get("filename", "") for f in files_data if f.get("filename")]
    print(f"Changed files ({len(changed_files)}): {changed_files[:10]}{'...' if len(changed_files) > 10 else ''}")

    chosen, reason = pick_reviewer(pr_title, pr_body, changed_files)
    print(f"Chosen reviewer: {chosen} — {reason}")

    # 4. Request review (PR author cannot review their own PR).
    if chosen != pr_author:
        safe_api(
            f"/repos/{repo}/pulls/{pr_number}/requested_reviewers",
            method="POST",
            data={"reviewers": [chosen]},
            description="request reviewer",
        )
        print(f"Requested review from @{chosen}")
    else:
        print("Chosen reviewer matches PR author; skipping review request")

    # 5. Add the chosen maintainer as an assignee too.
    safe_api(
        f"/repos/{repo}/issues/{pr_number}/assignees",
        method="POST",
        data={"assignees": [chosen]},
        description="assign maintainer",
    )
    print(f"Added @{chosen} as assignee")

    # 6. Post a summary comment.
    comment_body = (
        f"PR opened by @{pr_author}\n"
        f"Review requested from @{chosen}: {reason}"
    )
    safe_api(
        f"/repos/{repo}/issues/{pr_number}/comments",
        method="POST",
        data={"body": comment_body},
        description="summary comment",
    )
    print("Posted summary comment")


if __name__ == "__main__":
    main()
