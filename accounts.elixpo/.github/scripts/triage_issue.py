#!/usr/bin/env python3
"""
Issue Triage Bot — accounts.elixpo
Categorizes and prioritizes new GitHub issues via LLM, then files them
into the GitHub Project V2 board with labels and a triage comment.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

# ── Config import ──────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ci_config import (
    CATEGORY_OPTIONS,
    FIELD_CATEGORY,
    FIELD_PRIORITY,
    LLM_API_URL,
    LLM_MODEL,
    ORG_MEMBERS,
    PRIORITY_OPTIONS,
    PROJECT_DESCRIPTION,
    PROJECT_ID,
    PROJECT_NAME,
)

# ── Environment variables ──────────────────────────────────────────────────
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
POLLINATIONS_KEY = os.environ.get("POLLINATIONS_KEY", "")
ISSUE_NUMBER = os.environ["ISSUE_NUMBER"]
ISSUE_TITLE = os.environ["ISSUE_TITLE"]
ISSUE_BODY = os.environ.get("ISSUE_BODY", "")
ISSUE_AUTHOR = os.environ["ISSUE_AUTHOR"]
REPO = os.environ["REPO"]

# ── Defaults ───────────────────────────────────────────────────────────────
DEFAULT_CATEGORY = "Support"
DEFAULT_PRIORITY = "Medium"
DEFAULT_SUMMARY = "Awaiting manual triage"


# ── HTTP helpers ───────────────────────────────────────────────────────────
def github_rest(method: str, path: str, body: dict | None = None) -> dict:
    """Make an authenticated GitHub REST API call."""
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {GITHUB_TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def github_graphql(query: str) -> dict:
    """Make an authenticated GitHub GraphQL call."""
    url = "https://api.github.com/graphql"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json",
    }
    data = json.dumps({"query": query}).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
    if "errors" in result:
        print(f"[warn] GraphQL errors: {result['errors']}")
    return result


# ── LLM call ──────────────────────────────────────────────────────────────
def call_llm(title: str, body: str) -> dict:
    """Ask the Pollinations LLM to triage the issue. Returns parsed JSON."""
    system_prompt = (
        f"You are an issue triage bot for {PROJECT_NAME} ({PROJECT_DESCRIPTION}).\n"
        "Categorize this issue and set priority.\n\n"
        "Categories: Feature, Bugs, Support, Dev\n"
        "Priority: Urgent, High, Medium, Low\n\n"
        "Rules:\n"
        "- Security issues are always Urgent\n"
        "- Crashes/data loss are High\n"
        "- UI issues are Medium\n"
        "- Questions/how-to are Support + Low\n"
        "- Feature requests are Feature + Medium (default)\n"
        "- Bug reports are Bugs + Medium (default)\n\n"
        'Respond in JSON only: {"category": "...", "priority": "...", "summary": "one sentence summary"}'
    )
    user_message = f"{title}\n\n{body}"

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "response_format": {"type": "json_object"},
    }

    headers = {
        "Content-Type": "application/json",
    }
    if POLLINATIONS_KEY:
        headers["Authorization"] = f"Bearer {POLLINATIONS_KEY}"

    data = json.dumps(payload).encode()
    req = urllib.request.Request(LLM_API_URL, data=data, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)

    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode())

    content = result["choices"][0]["message"]["content"]
    return json.loads(content)


# ── Label helpers ─────────────────────────────────────────────────────────
def ensure_label(name: str, color: str = "ededed", description: str = "") -> None:
    """Create a label if it doesn't already exist."""
    try:
        github_rest("GET", f"/repos/{REPO}/labels/{urllib.request.quote(name, safe='')}")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            print(f"  Creating label '{name}'")
            github_rest("POST", f"/repos/{REPO}/labels", {
                "name": name,
                "color": color,
                "description": description,
            })
        else:
            raise


def add_labels(issue_number: str, labels: list[str]) -> None:
    """Add labels to an issue."""
    github_rest("POST", f"/repos/{REPO}/issues/{issue_number}/labels", {
        "labels": labels,
    })


# ── Project V2 helpers ────────────────────────────────────────────────────
def get_issue_node_id(issue_number: str) -> str:
    """Fetch the GraphQL node ID for a given issue number."""
    data = github_rest("GET", f"/repos/{REPO}/issues/{issue_number}")
    return data["node_id"]


def add_to_project(issue_node_id: str) -> str:
    """Add an issue to the Project V2 board. Returns the project item ID."""
    mutation = f"""
    mutation {{
      addProjectV2ItemById(input: {{projectId: "{PROJECT_ID}", contentId: "{issue_node_id}"}}) {{
        item {{ id }}
      }}
    }}
    """
    result = github_graphql(mutation)
    return result["data"]["addProjectV2ItemById"]["item"]["id"]


def set_field(item_id: str, field_id: str, option_id: str) -> None:
    """Set a single-select field value on a project item."""
    mutation = f"""
    mutation {{
      updateProjectV2ItemFieldValue(input: {{
        projectId: "{PROJECT_ID}",
        itemId: "{item_id}",
        fieldId: "{field_id}",
        value: {{singleSelectOptionId: "{option_id}"}}
      }}) {{
        projectV2Item {{ id }}
      }}
    }}
    """
    github_graphql(mutation)


# ── Comment helper ────────────────────────────────────────────────────────
def post_comment(issue_number: str, category: str, priority: str, summary: str) -> None:
    """Post the triage result as a comment on the issue."""
    body = f"**Triage**: {category} | **Priority**: {priority}\n{summary}"
    github_rest("POST", f"/repos/{REPO}/issues/{issue_number}/comments", {
        "body": body,
    })


# ── Label colors ──────────────────────────────────────────────────────────
LABEL_COLORS = {
    "feature": "0e8a16",
    "bugs": "d73a4a",
    "support": "0075ca",
    "dev": "5319e7",
    "urgent": "b60205",
    "high": "d93f0b",
    "medium": "fbca04",
    "low": "c5def5",
}


# ── Main ──────────────────────────────────────────────────────────────────
def main() -> None:
    print(f"=== Issue Triage: #{ISSUE_NUMBER} ===")
    print(f"Title:  {ISSUE_TITLE}")
    print(f"Author: {ISSUE_AUTHOR}")

    is_org_member = ISSUE_AUTHOR in ORG_MEMBERS
    if is_org_member:
        print(f"Author is an org member — category will be set to Dev")

    # ── Step 1: LLM triage ────────────────────────────────────────────────
    category = DEFAULT_CATEGORY
    priority = DEFAULT_PRIORITY
    summary = DEFAULT_SUMMARY

    try:
        print("Calling LLM for triage...")
        llm_result = call_llm(ISSUE_TITLE, ISSUE_BODY)
        print(f"LLM response: {json.dumps(llm_result)}")

        raw_category = llm_result.get("category", DEFAULT_CATEGORY)
        raw_priority = llm_result.get("priority", DEFAULT_PRIORITY)
        raw_summary = llm_result.get("summary", DEFAULT_SUMMARY)

        # Validate category
        if raw_category in CATEGORY_OPTIONS:
            category = raw_category
        else:
            print(f"[warn] Unknown category '{raw_category}', defaulting to {DEFAULT_CATEGORY}")
            category = DEFAULT_CATEGORY

        # Validate priority
        if raw_priority in PRIORITY_OPTIONS:
            priority = raw_priority
        else:
            print(f"[warn] Unknown priority '{raw_priority}', defaulting to {DEFAULT_PRIORITY}")
            priority = DEFAULT_PRIORITY

        summary = raw_summary or DEFAULT_SUMMARY

    except Exception as exc:
        print(f"[error] LLM call failed: {exc}")
        print("Falling back to defaults.")

    # Override category for org members
    if is_org_member:
        category = "Dev"

    print(f"Triage result => Category: {category} | Priority: {priority}")
    print(f"Summary: {summary}")

    # ── Step 2: Get issue node ID ─────────────────────────────────────────
    print("Fetching issue node ID...")
    issue_node_id = get_issue_node_id(ISSUE_NUMBER)
    print(f"Node ID: {issue_node_id}")

    # ── Step 3: Add to project ────────────────────────────────────────────
    print("Adding issue to Project V2...")
    item_id = add_to_project(issue_node_id)
    print(f"Project item ID: {item_id}")

    # ── Step 4: Set project fields ────────────────────────────────────────
    category_option = CATEGORY_OPTIONS.get(category)
    priority_option = PRIORITY_OPTIONS.get(priority)

    if category_option:
        print(f"Setting Category field to '{category}'...")
        set_field(item_id, FIELD_CATEGORY, category_option)
    else:
        print(f"[warn] No option ID for category '{category}', skipping field update")

    if priority_option:
        print(f"Setting Priority field to '{priority}'...")
        set_field(item_id, FIELD_PRIORITY, priority_option)
    else:
        print(f"[warn] No option ID for priority '{priority}', skipping field update")

    # ── Step 5: Apply labels ──────────────────────────────────────────────
    cat_label = category.lower()
    pri_label = priority.lower()
    print(f"Applying labels: [{cat_label}, {pri_label}]")

    ensure_label(cat_label, LABEL_COLORS.get(cat_label, "ededed"), f"Category: {category}")
    ensure_label(pri_label, LABEL_COLORS.get(pri_label, "ededed"), f"Priority: {priority}")
    add_labels(ISSUE_NUMBER, [cat_label, pri_label])

    # ── Step 6: Post triage comment ───────────────────────────────────────
    print("Posting triage comment...")
    post_comment(ISSUE_NUMBER, category, priority, summary)

    print("=== Triage complete ===")


if __name__ == "__main__":
    main()
