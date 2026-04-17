#!/usr/bin/env python3
"""
PR Triage Bot — accounts.elixpo

Categorizes new pull requests and files them into the matching per-category
GitHub Project V2 board with an UPPERCASE category label.

Rules:
  - PRs opened by org members default to "Dev" (no LLM call).
  - PRs from external contributors: LLM picks the best-fit category based on
    the PR title, body, and list of changed files.

Env vars: AGENT_TOKEN, POLLINATIONS_KEY, PR_NUMBER, PR_AUTHOR, REPO
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

# ── Environment ────────────────────────────────────────────────────────────
AGENT_TOKEN = os.environ["AGENT_TOKEN"]
POLLINATIONS_KEY = os.environ.get("POLLINATIONS_KEY", "")
PR_NUMBER = os.environ["PR_NUMBER"]
PR_AUTHOR = os.environ["PR_AUTHOR"]
REPO = os.environ["REPO"]

# ── Defaults ───────────────────────────────────────────────────────────────
DEFAULT_CATEGORY = "Dev"

# Label colors (same as issues — keep the palette consistent)
LABEL_COLORS = {
    "FEATURE": "a2eeef",
    "BUGS": "d73a4a",
    "SUPPORT": "cfd3d7",
    "DEV": "7057ff",
}


# ── HTTP helpers ───────────────────────────────────────────────────────────
def github_rest(method: str, path: str, body: dict | None = None) -> dict:
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {AGENT_TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        raw = resp.read().decode()
    return json.loads(raw) if raw else {}


def github_graphql(query: str) -> dict:
    url = "https://api.github.com/graphql"
    data = json.dumps({"query": query}).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {AGENT_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
    if "errors" in result:
        print(f"[warn] GraphQL errors: {result['errors']}")
    return result


# ── LLM call ───────────────────────────────────────────────────────────────
def call_llm(title: str, body: str, files: list[str]) -> dict:
    system_prompt = (
        f"You are a pull request triage bot for {PROJECT_NAME} ({PROJECT_DESCRIPTION}).\n"
        "Categorize this PR based on its title, body, and changed files.\n\n"
        "Categories:\n"
        "- Feature: adds new capability, enhancement, or UX improvement\n"
        "- Bugs: fixes a bug, regression, crash, or broken behavior\n"
        "- Support: answers a question, adds docs or examples for users\n"
        "- Dev: internal dev work — refactor, infra, CI, dependencies, chores\n\n"
        'Respond in JSON only: {"category": "Feature|Bugs|Support|Dev", "summary": "one sentence"}'
    )

    files_preview = "\n".join(f"- {f}" for f in files[:50]) or "(no files)"
    user_message = (
        f"PR title: {title}\n\n"
        f"PR body:\n{body or '(empty)'}\n\n"
        f"Changed files:\n{files_preview}"
    )

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
        "User-Agent": "elixpo-ci/1.0",
    }
    if POLLINATIONS_KEY:
        headers["Authorization"] = f"Bearer {POLLINATIONS_KEY.strip()}"

    req = urllib.request.Request(LLM_API_URL, data=json.dumps(payload).encode(), method="POST")
    for k, v in headers.items():
        req.add_header(k, v)

    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())

    content = result["choices"][0]["message"]["content"].strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", content, re.DOTALL)
    if fence:
        content = fence.group(1)
    return json.loads(content)


# ── PR / Project V2 helpers ───────────────────────────────────────────────
def fetch_pr(pr_number: str) -> dict:
    return github_rest("GET", f"/repos/{REPO}/pulls/{pr_number}")


def fetch_pr_files(pr_number: str, limit: int = 100) -> list[str]:
    try:
        data = github_rest(
            "GET", f"/repos/{REPO}/pulls/{pr_number}/files?per_page={limit}"
        )
        if isinstance(data, list):
            return [f.get("filename", "") for f in data if f.get("filename")]
    except Exception as exc:
        print(f"[warn] Failed to fetch PR files: {exc}")
    return []


def add_to_project(project_id: str, pr_node_id: str) -> str | None:
    mutation = f"""
    mutation {{
      addProjectV2ItemById(input: {{projectId: "{project_id}", contentId: "{pr_node_id}"}}) {{
        item {{ id }}
      }}
    }}
    """
    result = github_graphql(mutation)
    try:
        return result["data"]["addProjectV2ItemById"]["item"]["id"]
    except (KeyError, TypeError):
        return None


# ── Label helpers ──────────────────────────────────────────────────────────
def ensure_label(name: str, color: str, description: str = "") -> None:
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


def add_labels(pr_number: str, labels: list[str]) -> None:
    # PRs share the issues endpoint for labels
    github_rest(
        "POST",
        f"/repos/{REPO}/issues/{pr_number}/labels",
        {"labels": labels},
    )


# ── Main ───────────────────────────────────────────────────────────────────
def main() -> None:
    print(f"=== PR Triage: #{PR_NUMBER} ===")

    pr_data = fetch_pr(PR_NUMBER)
    pr_node_id = pr_data["node_id"]
    pr_title = pr_data.get("title") or ""
    pr_body = pr_data.get("body") or ""
    print(f"Title:  {pr_title}")
    print(f"Author: @{PR_AUTHOR}")

    is_org_member = PR_AUTHOR in ORG_MEMBERS
    category = DEFAULT_CATEGORY

    if is_org_member:
        print(f"@{PR_AUTHOR} is an org member — defaulting category to Dev")
    else:
        print("External contributor — asking LLM for category")
        try:
            files = fetch_pr_files(PR_NUMBER)
            print(f"Changed files: {len(files)}")
            llm_result = call_llm(pr_title, pr_body, files)
            print(f"LLM response: {json.dumps(llm_result)}")
            raw_category = llm_result.get("category", DEFAULT_CATEGORY)
            if raw_category in CATEGORIES:
                category = raw_category
            else:
                print(f"[warn] Unknown category '{raw_category}', defaulting to {DEFAULT_CATEGORY}")
        except Exception as exc:
            print(f"[error] LLM call failed: {exc}")
            print(f"Falling back to default category '{DEFAULT_CATEGORY}'")

    print(f"Category: {category}")

    # Resolve project
    project = PROJECTS.get(category) or PROJECTS[DEFAULT_CATEGORY]

    # Add to project board
    print(f"Adding PR to '{category}' project ({project['id']})...")
    try:
        item_id = add_to_project(project["id"], pr_node_id)
        print(f"Project item ID: {item_id}")
    except Exception as exc:
        print(f"[error] Failed to add to project: {exc}")

    # Apply category label (UPPERCASE)
    cat_label = category.upper()
    print(f"Applying label: [{cat_label}]")
    try:
        ensure_label(cat_label, LABEL_COLORS.get(cat_label, "ededed"), f"Category: {category}")
        add_labels(PR_NUMBER, [cat_label])
    except Exception as exc:
        print(f"[warn] Label application failed: {exc}")

    print("=== PR triage complete ===")


if __name__ == "__main__":
    main()
