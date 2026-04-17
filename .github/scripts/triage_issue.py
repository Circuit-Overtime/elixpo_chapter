#!/usr/bin/env python3
"""
Issue Triage Bot — accounts.elixpo
Categorizes and prioritizes new GitHub issues via LLM, then files them
into the matching per-category GitHub Project V2 with labels and a comment.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

# ── Config import ──────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ci_config import *  # noqa: F401,F403

# ── Environment variables ──────────────────────────────────────────────────
# Note: ISSUE_TITLE and ISSUE_BODY are intentionally NOT read from env vars.
# The event payload is stale if issue_description.py has already rewritten
# the body in an earlier step. We fetch them fresh from the GitHub API below.
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
POLLINATIONS_KEY = os.environ.get("POLLINATIONS_KEY", "")
ISSUE_NUMBER = os.environ["ISSUE_NUMBER"]
ISSUE_AUTHOR = os.environ["ISSUE_AUTHOR"]
REPO = os.environ["REPO"]

# ── Defaults ───────────────────────────────────────────────────────────────
DEFAULT_CATEGORY = "Support"
DEFAULT_PRIORITY = "Medium"
DEFAULT_SUMMARY = "Awaiting manual triage"

# ── Label colors (hex, no #) ──────────────────────────────────────────────
LABEL_COLORS = {
    "feature": "a2eeef",
    "bugs": "d73a4a",
    "support": "cfd3d7",
    "dev": "7057ff",
    "urgent": "b60205",
    "high": "d93f0b",
    "medium": "fbca04",
    "low": "0e8a16",
}


# ── HTTP helpers ───────────────────────────────────────────────────────────
def github_rest(method: str, path: str, body: dict | None = None) -> dict:
    """Make an authenticated GitHub REST API call."""
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {GITHUB_TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        raw = resp.read().decode()
    if not raw:
        return {}
    return json.loads(raw)


def github_graphql(query: str) -> dict:
    """Make an authenticated GitHub GraphQL call."""
    url = "https://api.github.com/graphql"
    data = json.dumps({"query": query}).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {GITHUB_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
    if "errors" in result:
        print(f"[warn] GraphQL errors: {result['errors']}")
    return result


# ── LLM call ───────────────────────────────────────────────────────────────
def call_llm(title: str, body: str, include_category: bool) -> dict:
    """Ask the Pollinations LLM to triage the issue. Returns parsed JSON."""
    if include_category:
        system_prompt = (
            f"You are an issue triage bot for {PROJECT_NAME} ({PROJECT_DESCRIPTION}).\n"
            "Categorize this issue and set priority.\n\n"
            "Categories:\n"
            "- Feature: new capabilities, enhancements, UX improvements\n"
            "- Bugs: errors, crashes, regressions, broken behavior\n"
            "- Support: questions, how-to, help requests\n"
            "- Dev: internal dev work, refactoring, infrastructure\n\n"
            "Priority levels:\n"
            "- Urgent: security issues, data loss, production down\n"
            "- High: crashes, major functional bugs\n"
            "- Medium: minor bugs, standard features, most items (default)\n"
            "- Low: nice-to-have, cosmetic, questions\n\n"
            'Respond in JSON only: {"category": "...", "priority": "...", "summary": "one sentence"}'
        )
    else:
        system_prompt = (
            f"You are an issue triage bot for {PROJECT_NAME} ({PROJECT_DESCRIPTION}).\n"
            "This issue is from an org member — category is already set to Dev.\n"
            "Pick a priority only.\n\n"
            "Priority levels:\n"
            "- Urgent: security issues, data loss, production down\n"
            "- High: crashes, major functional bugs\n"
            "- Medium: minor bugs, standard features, most items (default)\n"
            "- Low: nice-to-have, cosmetic, questions\n\n"
            'Respond in JSON only: {"category": "Dev", "priority": "...", "summary": "one sentence"}'
        )

    user_message = f"Title: {title}\n\nBody: {body}"

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "response_format": {"type": "json_object"},
    }

    headers = {"Content-Type": "application/json"}
    if POLLINATIONS_KEY:
        headers["Authorization"] = f"Bearer {POLLINATIONS_KEY}"

    data = json.dumps(payload).encode()
    req = urllib.request.Request(LLM_API_URL, data=data, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)

    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())

    content = result["choices"][0]["message"]["content"]
    # Tolerate responses wrapped in code fences
    content = content.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", content, re.DOTALL)
    if fence:
        content = fence.group(1)
    return json.loads(content)


# ── Label helpers ──────────────────────────────────────────────────────────
def ensure_label(name: str, color: str, description: str = "") -> None:
    """Create a label if it doesn't already exist."""
    try:
        github_rest("GET", f"/repos/{REPO}/labels/{urllib.parse.quote(name, safe='')}")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            print(f"  Creating label '{name}'")
            github_rest(
                "POST",
                f"/repos/{REPO}/labels",
                {"name": name, "color": color, "description": description},
            )
        else:
            raise


def add_labels(issue_number: str, labels: list[str]) -> None:
    """Add labels to an issue."""
    github_rest(
        "POST",
        f"/repos/{REPO}/issues/{issue_number}/labels",
        {"labels": labels},
    )


# ── Issue / Project V2 helpers ─────────────────────────────────────────────
def fetch_issue(issue_number: str) -> dict:
    """Fetch the full issue payload (node_id, title, body) from the REST API.

    This is the freshest source of truth — we use it instead of the event
    payload because an earlier pipeline step may have rewritten the body.
    """
    return github_rest("GET", f"/repos/{REPO}/issues/{issue_number}")


def assign_issue(issue_number: str, assignee: str) -> None:
    """Assign an issue to a user."""
    try:
        github_rest(
            "POST",
            f"/repos/{REPO}/issues/{issue_number}/assignees",
            {"assignees": [assignee]},
        )
        print(f"  Assigned to @{assignee}")
    except urllib.error.HTTPError as exc:
        print(f"[warn] Failed to assign @{assignee}: {exc}")


def add_to_project(project_id: str, issue_node_id: str) -> str:
    """Add an issue to a Project V2 board. Returns the project item ID."""
    mutation = f"""
    mutation {{
      addProjectV2ItemById(input: {{projectId: "{project_id}", contentId: "{issue_node_id}"}}) {{
        item {{ id }}
      }}
    }}
    """
    result = github_graphql(mutation)
    try:
        return result["data"]["addProjectV2ItemById"]["item"]["id"]
    except (KeyError, TypeError) as exc:
        raise RuntimeError(f"Failed to add issue to project: {result}") from exc


def set_single_select_field(
    project_id: str, item_id: str, field_id: str, option_id: str
) -> None:
    """Set a single-select field value on a project item."""
    mutation = f"""
    mutation {{
      updateProjectV2ItemFieldValue(input: {{
        projectId: "{project_id}",
        itemId: "{item_id}",
        fieldId: "{field_id}",
        value: {{singleSelectOptionId: "{option_id}"}}
      }}) {{
        projectV2Item {{ id }}
      }}
    }}
    """
    github_graphql(mutation)


# ── Comment helper ─────────────────────────────────────────────────────────
def post_comment(
    issue_number: str,
    category: str,
    priority: str,
    summary: str,
    project_url: str,
    assigned_to: str | None,
) -> None:
    """Post the triage result as a comment on the issue."""
    lines = [
        f"**Triage**: {category} | **Priority**: {priority}",
        f"Project: {project_url}",
        summary,
    ]
    if assigned_to:
        lines.append(f"Assigned to @{assigned_to}")
    body = "\n".join(lines)
    github_rest(
        "POST",
        f"/repos/{REPO}/issues/{issue_number}/comments",
        {"body": body},
    )


# ── Main ───────────────────────────────────────────────────────────────────
def main() -> None:
    print(f"=== Issue Triage: #{ISSUE_NUMBER} ===")

    # ── Step 0: Fetch fresh issue data from the API ───────────────────────
    # The event payload may be stale (an earlier step can rewrite the body),
    # so we treat the REST API as the source of truth for title/body.
    print("Fetching fresh issue data from API...")
    issue_data = fetch_issue(ISSUE_NUMBER)
    issue_node_id = issue_data["node_id"]
    issue_title = issue_data.get("title") or ""
    issue_body = issue_data.get("body") or ""
    print(f"Title:  {issue_title}")
    print(f"Author: {ISSUE_AUTHOR}")
    print(f"Node ID: {issue_node_id}")

    is_org_member = ISSUE_AUTHOR in ORG_MEMBERS
    if is_org_member:
        print(f"Author @{ISSUE_AUTHOR} is an org member — forcing category to Dev")
        try:
            assign_issue(ISSUE_NUMBER, ISSUE_AUTHOR)
        except Exception as exc:
            print(f"[warn] Assign failed: {exc}")

    # ── Step 1: LLM triage ────────────────────────────────────────────────
    category = "Dev" if is_org_member else DEFAULT_CATEGORY
    priority = DEFAULT_PRIORITY
    summary = DEFAULT_SUMMARY

    try:
        print("Calling LLM for triage...")
        llm_result = call_llm(
            issue_title, issue_body, include_category=not is_org_member
        )
        print(f"LLM response: {json.dumps(llm_result)}")

        raw_category = llm_result.get("category", category)
        raw_priority = llm_result.get("priority", DEFAULT_PRIORITY)
        raw_summary = llm_result.get("summary", DEFAULT_SUMMARY)

        if is_org_member:
            category = "Dev"  # Always force Dev for org members
        elif raw_category in CATEGORIES:
            category = raw_category
        else:
            print(
                f"[warn] Unknown category '{raw_category}', defaulting to {DEFAULT_CATEGORY}"
            )
            category = DEFAULT_CATEGORY

        if raw_priority in PRIORITIES:
            priority = raw_priority
        else:
            print(
                f"[warn] Unknown priority '{raw_priority}', defaulting to {DEFAULT_PRIORITY}"
            )
            priority = DEFAULT_PRIORITY

        summary = (raw_summary or DEFAULT_SUMMARY).strip() or DEFAULT_SUMMARY

    except Exception as exc:
        print(f"[error] LLM call failed: {exc}")
        print("Falling back to defaults.")
        # Keep existing defaults; org override already applied above.

    print(f"Triage result => Category: {category} | Priority: {priority}")
    print(f"Summary: {summary}")

    # ── Step 2: Resolve project ───────────────────────────────────────────
    project = PROJECTS.get(category)
    if project is None:
        print(
            f"[warn] No project config for category '{category}', falling back to Support"
        )
        category = "Support"
        project = PROJECTS["Support"]

    project_url = project.get("url", "")
    priority_option_id = project["priority_options"].get(priority)
    if priority_option_id is None:
        print(
            f"[warn] No option ID for priority '{priority}' in project '{category}', "
            f"defaulting to {DEFAULT_PRIORITY}"
        )
        priority = DEFAULT_PRIORITY
        priority_option_id = project["priority_options"].get(priority)

    # ── Step 3: Add to project ────────────────────────────────────────────
    print(f"Adding issue to '{category}' project ({project['id']})...")
    try:
        item_id = add_to_project(project["id"], issue_node_id)
        print(f"Project item ID: {item_id}")
    except Exception as exc:
        print(f"[error] Failed to add to project: {exc}")
        item_id = None

    # ── Step 4: Set priority field ────────────────────────────────────────
    if item_id and priority_option_id:
        print(f"Setting Priority field to '{priority}'...")
        try:
            set_single_select_field(
                project["id"], item_id, project["priority_field_id"], priority_option_id
            )
        except Exception as exc:
            print(f"[warn] Failed to set priority: {exc}")
    elif not priority_option_id:
        print(f"[warn] No option ID for priority '{priority}', skipping field update")

    # ── Step 5: Apply labels ──────────────────────────────────────────────
    cat_label = category.lower()
    pri_label = priority.lower()
    print(f"Applying labels: [{cat_label}, {pri_label}]")

    try:
        ensure_label(
            cat_label, LABEL_COLORS.get(cat_label, "ededed"), f"Category: {category}"
        )
        ensure_label(
            pri_label, LABEL_COLORS.get(pri_label, "ededed"), f"Priority: {priority}"
        )
        add_labels(ISSUE_NUMBER, [cat_label, pri_label])
    except Exception as exc:
        print(f"[warn] Label application failed: {exc}")

    # ── Step 6: Post triage comment ───────────────────────────────────────
    print("Posting triage comment...")
    try:
        post_comment(
            ISSUE_NUMBER,
            category,
            priority,
            summary,
            project_url,
            ISSUE_AUTHOR if is_org_member else None,
        )
    except Exception as exc:
        print(f"[warn] Comment post failed: {exc}")

    print("=== Triage complete ===")


if __name__ == "__main__":
    main()
