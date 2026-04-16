#!/usr/bin/env python3
"""
LLM-powered GitHub issue triage.

Fetches an issue, categorises it via Pollinations AI (claude-fast),
assigns the best maintainer from .elixpo/project.yml, and labels the issue.

Zero external dependencies -- stdlib only (Python 3.11+).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Categories and valid sub-categories
# ---------------------------------------------------------------------------
CATEGORIES: dict[str, list[str]] = {
    "bug": ["regression", "crash", "ui", "data", "performance", "security"],
    "feature": ["new-feature", "enhancement", "ux", "integration"],
    "docs": ["missing", "outdated", "typo", "api-docs"],
    "infra": ["ci", "deploy", "config", "dependencies"],
    "question": ["how-to", "architecture", "support"],
}

FALLBACK_LABEL = "needs-triage"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gh_api(
    endpoint: str,
    *,
    token: str,
    method: str = "GET",
    body: dict | None = None,
) -> Any:
    """Call the GitHub REST API and return the decoded JSON response."""
    url = (
        endpoint
        if endpoint.startswith("https://")
        else f"https://api.github.com{endpoint}"
    )
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def _fetch_issue(repo: str, issue_number: int, token: str) -> dict:
    """Return the issue dict from GitHub."""
    return _gh_api(f"/repos/{repo}/issues/{issue_number}", token=token)


def _load_project_yml(repo_checkout: str) -> dict:
    """Load .elixpo/project.yml from the local checkout.

    Uses a tiny YAML subset parser (key: value + lists) so we don't
    need PyYAML.  Falls back gracefully.
    """
    yml_path = Path(repo_checkout) / ".elixpo" / "project.yml"
    if not yml_path.exists():
        print(f"[warn] {yml_path} not found -- skipping maintainer matching")
        return {}
    return _parse_simple_yaml(yml_path.read_text())


def _parse_simple_yaml(text: str) -> dict:
    """Minimal YAML parser sufficient for project.yml files.

    Handles:
      - Top-level scalar keys  (key: value)
      - List items             (- value)
      - One level of nesting   (indented key: value under a parent)
      - Inline mappings in list items  (- name: x  skill: y)

    This is NOT a general YAML parser.
    """
    result: dict = {}
    current_key: str | None = None
    current_list: list | None = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())

        # Top-level key
        if indent == 0 and ":" in stripped and not stripped.startswith("-"):
            # Flush previous list
            if current_key and current_list is not None:
                result[current_key] = current_list
            key, _, value = stripped.partition(":")
            key = key.strip()
            value = value.strip()
            if value:
                result[key] = value
                current_key = None
                current_list = None
            else:
                current_key = key
                current_list = []
            continue

        # List item under current key
        if stripped.startswith("-") and current_list is not None:
            item = stripped[1:].strip()
            # Check if it looks like an inline mapping: "name: x  skills: y"
            if ":" in item:
                mapping: dict[str, str] = {}
                # Split on whitespace-separated key: value pairs
                parts = item.split()
                k = None
                vals: list[str] = []
                for part in parts:
                    if part.endswith(":"):
                        if k is not None:
                            mapping[k] = " ".join(vals)
                        k = part[:-1]
                        vals = []
                    elif ":" in part and not part.startswith("http"):
                        if k is not None:
                            mapping[k] = " ".join(vals)
                        kk, _, vv = part.partition(":")
                        k = kk
                        vals = [vv] if vv else []
                    else:
                        vals.append(part)
                if k is not None:
                    mapping[k] = " ".join(vals)
                current_list.append(mapping if mapping else item)
            else:
                current_list.append(item)
            continue

        # Indented key: value under the current section (dict-style)
        if indent > 0 and ":" in stripped and current_key:
            if current_list is not None and len(current_list) == 0:
                # Switch to dict mode for this key
                current_list = None  # type: ignore[assignment]
                result[current_key] = {}
            if isinstance(result.get(current_key), dict):
                k, _, v = stripped.partition(":")
                result[current_key][k.strip()] = v.strip()
            continue

    # Flush
    if current_key and current_list is not None:
        result[current_key] = current_list

    return result


def _build_maintainer_context(project: dict) -> str:
    """Format maintainer info for the LLM prompt."""
    maintainers = project.get("maintainers", [])
    if not maintainers:
        return "No maintainer information available."

    lines = []
    for m in maintainers:
        if isinstance(m, dict):
            name = m.get("name") or m.get("github") or str(m)
            github = m.get("github", name)
            skills = m.get("skills", m.get("skill", "general"))
            lines.append(f"- @{github}: skills={skills}")
        else:
            lines.append(f"- @{m}: skills=general")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# LLM triage
# ---------------------------------------------------------------------------

def _call_llm(
    issue_title: str,
    issue_body: str,
    maintainer_context: str,
    api_key: str,
) -> dict | None:
    """Ask the LLM to triage the issue.  Returns parsed JSON or None."""

    categories_desc = "\n".join(
        f"  - {cat}: subcategories = {', '.join(subs)}"
        for cat, subs in CATEGORIES.items()
    )

    system_prompt = (
        "You are an expert open-source issue triager.  Given a GitHub issue, "
        "you must return a JSON object with exactly these keys:\n"
        '  "category"    - one of: bug, feature, docs, infra, question\n'
        '  "subcategory" - one of the valid subcategories for the chosen category\n'
        '  "assignee"    - the GitHub username (without @) of the best maintainer\n'
        '  "comment"     - a brief (2-3 sentence) acknowledgment comment\n\n'
        f"Valid categories and subcategories:\n{categories_desc}\n\n"
        f"Available maintainers:\n{maintainer_context}\n\n"
        "If you cannot determine a suitable maintainer, set assignee to an "
        "empty string.  Always pick the single best category and subcategory."
    )

    user_prompt = (
        f"Issue title: {issue_title}\n\n"
        f"Issue body:\n{issue_body or '(empty)'}"
    )

    payload = {
        "model": "claude-fast",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
    }

    headers = {
        "Content-Type": "application/json",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        "https://gen.pollinations.ai/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers=headers,
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"[error] LLM call failed: {exc}", file=sys.stderr)
        return None

    # Extract the assistant message content
    try:
        content = data["choices"][0]["message"]["content"]
        result = json.loads(content)
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        print(f"[error] Failed to parse LLM response: {exc}", file=sys.stderr)
        print(f"[debug] Raw LLM response: {json.dumps(data, indent=2)}", file=sys.stderr)
        return None

    # Validate
    cat = result.get("category", "")
    sub = result.get("subcategory", "")
    if cat not in CATEGORIES:
        print(f"[warn] LLM returned invalid category '{cat}'", file=sys.stderr)
        return None
    if sub not in CATEGORIES[cat]:
        print(f"[warn] LLM returned invalid subcategory '{sub}' for '{cat}'", file=sys.stderr)
        # Keep the category, drop the subcategory
        result["subcategory"] = ""

    return result


# ---------------------------------------------------------------------------
# GitHub mutations
# ---------------------------------------------------------------------------

def _add_labels(repo: str, issue_number: int, labels: list[str], token: str) -> None:
    """Add labels to an issue, creating them first if they don't exist."""
    # Label colour map for auto-creation
    colour_map = {
        "bug": "d73a4a",
        "feature": "a2eeef",
        "docs": "0075ca",
        "infra": "e4e669",
        "question": "d876e3",
        "needs-triage": "fbca04",
    }

    for label in labels:
        # Ensure label exists (ignore 422 = already exists)
        try:
            _gh_api(
                f"/repos/{repo}/labels",
                token=token,
                method="POST",
                body={
                    "name": label,
                    "color": colour_map.get(label, "ededed"),
                },
            )
        except urllib.error.HTTPError as exc:
            if exc.code != 422:
                print(f"[warn] Could not create label '{label}': {exc}", file=sys.stderr)

    _gh_api(
        f"/repos/{repo}/issues/{issue_number}/labels",
        token=token,
        method="POST",
        body={"labels": labels},
    )


def _assign_issue(repo: str, issue_number: int, assignee: str, token: str) -> None:
    """Assign a user to the issue."""
    _gh_api(
        f"/repos/{repo}/issues/{issue_number}/assignees",
        token=token,
        method="POST",
        body={"assignees": [assignee]},
    )


def _post_comment(repo: str, issue_number: int, body: str, token: str) -> None:
    """Post a comment on the issue."""
    _gh_api(
        f"/repos/{repo}/issues/{issue_number}/comments",
        token=token,
        method="POST",
        body={"body": body},
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="LLM-powered issue triage")
    parser.add_argument("--repo", required=True, help="owner/repo")
    parser.add_argument("--issue-number", required=True, type=int)
    parser.add_argument("--token", required=True, help="GitHub token")
    parser.add_argument("--pollinations-key", default="", help="Pollinations API key")
    parser.add_argument(
        "--repo-checkout",
        default="repo",
        help="Path to the local checkout of the calling repo (default: repo/)",
    )
    args = parser.parse_args()

    # 1. Fetch issue
    print(f"[info] Fetching issue #{args.issue_number} from {args.repo}")
    try:
        issue = _fetch_issue(args.repo, args.issue_number, args.token)
    except urllib.error.HTTPError as exc:
        print(f"[fatal] Could not fetch issue: {exc}", file=sys.stderr)
        sys.exit(1)

    title = issue.get("title", "")
    body = issue.get("body", "") or ""
    print(f"[info] Issue title: {title}")

    # 2. Load project.yml from local checkout
    project = _load_project_yml(args.repo_checkout)
    maintainer_ctx = _build_maintainer_context(project)
    print(f"[info] Maintainer context:\n{maintainer_ctx}")

    # 3. Call LLM
    print("[info] Calling Pollinations AI for triage...")
    triage = _call_llm(title, body, maintainer_ctx, args.pollinations_key)

    if triage is None:
        # Fallback: label as needs-triage, skip assignment
        print("[warn] LLM triage failed -- applying fallback label")
        try:
            _add_labels(args.repo, args.issue_number, [FALLBACK_LABEL], args.token)
        except urllib.error.HTTPError as exc:
            print(f"[error] Could not add fallback label: {exc}", file=sys.stderr)
        sys.exit(0)

    category = triage["category"]
    subcategory = triage.get("subcategory", "")
    assignee = triage.get("assignee", "")
    comment = triage.get("comment", "")

    print(f"[info] Triage result: {category}/{subcategory} -> @{assignee}")

    # 4. Apply labels
    labels = [category]
    if subcategory:
        labels.append(subcategory)
    try:
        _add_labels(args.repo, args.issue_number, labels, args.token)
        print(f"[info] Labels applied: {labels}")
    except urllib.error.HTTPError as exc:
        print(f"[error] Could not add labels: {exc}", file=sys.stderr)

    # 5. Assign maintainer
    if assignee:
        try:
            _assign_issue(args.repo, args.issue_number, assignee, args.token)
            print(f"[info] Assigned to @{assignee}")
        except urllib.error.HTTPError as exc:
            print(f"[warn] Could not assign @{assignee}: {exc}", file=sys.stderr)

    # 6. Post comment
    if comment:
        try:
            _post_comment(args.repo, args.issue_number, comment, args.token)
            print("[info] Comment posted")
        except urllib.error.HTTPError as exc:
            print(f"[warn] Could not post comment: {exc}", file=sys.stderr)

    print("[info] Triage complete")


if __name__ == "__main__":
    main()
