#!/usr/bin/env python3
"""
Project Manager — AI-powered issue/PR triage and labeling.

Triggered on new issues and PRs. Uses AI to:
  1. Categorize the item (bug, feature, docs, question, etc.)
  2. Apply appropriate labels
  3. Add to GitHub Project board (if configured)

All configuration is read from .github/tommy.yml via ci_config.
"""

import json
import os
import sys
import requests
from typing import Dict, Optional

from ci_config import (
    ai_api_base,
    ai_model,
    bot_name,
    project_number,
    cfg,
)


GITHUB_API_BASE = "https://api.github.com"


def get_env(key: str, required: bool = True) -> Optional[str]:
    value = os.getenv(key)
    if required and not value:
        print(f"Error: {key} environment variable is required")
        sys.exit(1)
    return value


def call_ai(system_prompt: str, user_prompt: str, token: str) -> Optional[str]:
    """Call the AI API to categorize an issue/PR."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": ai_model("text"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
    }
    try:
        resp = requests.post(ai_api_base(), headers=headers, json=payload, timeout=60)
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"  AI API error: {e}")
    return None


def apply_labels(github_token: str, repo: str, issue_number: int, labels: list):
    """Apply labels to an issue or PR."""
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
    }
    resp = requests.post(
        f"{GITHUB_API_BASE}/repos/{repo}/issues/{issue_number}/labels",
        headers=headers,
        json={"labels": labels},
        timeout=15,
    )
    if resp.status_code in [200, 201]:
        print(f"  Applied labels: {labels}")
    else:
        print(f"  Failed to apply labels: {resp.status_code} {resp.text[:200]}")


def add_to_project(github_token: str, item_node_id: str, proj_num: int, owner: str):
    """Add an issue/PR to a GitHub ProjectV2 board."""
    if proj_num <= 0:
        return

    # First get the project ID
    query = """
    query($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) { id }
      }
    }
    """
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        "https://api.github.com/graphql",
        headers=headers,
        json={"query": query, "variables": {"owner": owner, "number": proj_num}},
        timeout=15,
    )
    if resp.status_code != 200:
        # Try as user instead of org
        query = query.replace("organization", "user")
        resp = requests.post(
            "https://api.github.com/graphql",
            headers=headers,
            json={"query": query, "variables": {"owner": owner, "number": proj_num}},
            timeout=15,
        )

    try:
        data = resp.json()
        project_id = (
            data.get("data", {})
            .get("organization", data.get("data", {}).get("user", {}))
            .get("projectV2", {})
            .get("id")
        )
    except Exception:
        project_id = None

    if not project_id:
        print(f"  Could not find project #{proj_num}")
        return

    # Add item to project
    mutation = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }
    """
    resp = requests.post(
        "https://api.github.com/graphql",
        headers=headers,
        json={
            "query": mutation,
            "variables": {"projectId": project_id, "contentId": item_node_id},
        },
        timeout=15,
    )
    if resp.status_code == 200 and "errors" not in resp.json():
        print(f"  Added to project #{proj_num}")
    else:
        print(f"  Failed to add to project: {resp.text[:200]}")


def main():
    print(f"=== {bot_name()} Project Manager ===")

    github_token = get_env("GITHUB_TOKEN")
    ai_token = get_env("POLLINATIONS_TOKEN")
    event_json = get_env("GITHUB_EVENT")
    repo_full = get_env("REPO_FULL_NAME")

    event = json.loads(event_json)
    owner = repo_full.split("/")[0]

    # Determine if this is an issue or PR
    issue = event.get("issue")
    pr = event.get("pull_request")
    item = issue or pr

    if not item:
        print("  No issue or PR found in event")
        sys.exit(0)

    item_number = item["number"]
    title = item.get("title", "")
    body = item.get("body", "") or ""
    node_id = item.get("node_id", "")
    item_type = "PR" if pr else "Issue"

    print(f"\n  {item_type} #{item_number}: {title}")

    # Get label mapping from config
    label_map = cfg.get("project_manager", {}).get("labels", {})
    valid_categories = list(label_map.keys())

    # Ask AI to categorize
    system_prompt = (
        f"You are {bot_name()}, a project manager bot. "
        f"Categorize the following GitHub {item_type.lower()} into exactly one category.\n"
        f"Valid categories: {', '.join(valid_categories)}\n"
        f"Respond with ONLY the category name, nothing else."
    )
    user_prompt = f"Title: {title}\n\nBody:\n{body[:2000]}"

    category = call_ai(system_prompt, user_prompt, ai_token)
    if category:
        category = category.strip().lower()
        if category in label_map:
            label = label_map[category]
            apply_labels(github_token, repo_full, item_number, [label])
        else:
            print(f"  AI returned unknown category: {category}")
    else:
        print("  AI categorization failed, skipping labels")

    # Add to project board if configured
    proj_num = project_number()
    if proj_num > 0 and node_id:
        add_to_project(github_token, node_id, proj_num, owner)

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
