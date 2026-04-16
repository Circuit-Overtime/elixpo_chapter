#!/usr/bin/env python3
"""
merge_gist.py — Generate a changelog gist entry for merged PRs.

Uses only Python stdlib. Fetches PR data from GitHub, generates an LLM
summary via Pollinations AI, and creates/updates a public gist on the
elixpoo account as a living changelog for each project.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def api_request(url, *, method="GET", headers=None, data=None, accept=None):
    """Fire an HTTP request and return (status, parsed_body | raw_text)."""
    hdrs = headers or {}
    if accept:
        hdrs["Accept"] = accept
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")

    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            content_type = resp.headers.get("Content-Type", "")
            if "json" in content_type:
                return resp.status, json.loads(raw)
            return resp.status, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(raw)
        except Exception:
            return exc.code, raw


def gh_headers(token):
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


# ---------------------------------------------------------------------------
# GitHub data fetching
# ---------------------------------------------------------------------------

def fetch_pr(repo, pr_number, token):
    """Return PR metadata dict."""
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    status, data = api_request(url, headers=gh_headers(token))
    if status != 200:
        print(f"::error::Failed to fetch PR data ({status}): {data}", file=sys.stderr)
        sys.exit(1)
    return data


def fetch_pr_diff(repo, pr_number, token):
    """Return the unified diff as a string."""
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    hdrs = gh_headers(token)
    hdrs["Accept"] = "application/vnd.github.v3.diff"
    status, data = api_request(url, headers=hdrs)
    if status != 200:
        print(f"::warning::Failed to fetch diff ({status})", file=sys.stderr)
        return ""
    return data


def fetch_pr_commits(repo, pr_number, token):
    """Return list of commit dicts."""
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/commits?per_page=100"
    status, data = api_request(url, headers=gh_headers(token))
    if status != 200:
        print(f"::warning::Failed to fetch commits ({status})", file=sys.stderr)
        return []
    return data


def fetch_pr_files(repo, pr_number, token):
    """Return list of file dicts."""
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/files?per_page=100"
    status, data = api_request(url, headers=gh_headers(token))
    if status != 200:
        print(f"::warning::Failed to fetch files ({status})", file=sys.stderr)
        return []
    return data


# ---------------------------------------------------------------------------
# LLM summary via Pollinations AI
# ---------------------------------------------------------------------------

def generate_summary(pr_data, diff_text, commits, files, pollinations_key):
    """Ask Pollinations Claude-fast for a concise PR summary.

    Returns a markdown bullet list or None on failure.
    """
    commit_msgs = "\n".join(
        f"- {c.get('commit', {}).get('message', '').splitlines()[0]}"
        for c in commits[:20]
    )
    file_list = "\n".join(
        f"- {f['filename']} (+{f.get('additions', 0)}/-{f.get('deletions', 0)})"
        for f in files[:30]
    )
    # Truncate diff to keep the prompt reasonable
    diff_excerpt = diff_text[:12000] if diff_text else "(diff unavailable)"

    prompt = f"""Summarize this merged pull request in 3-5 concise bullet points.
Focus on: what changed, why, key files affected, and any referenced issues.

PR Title: {pr_data.get("title", "")}
PR Body:
{pr_data.get("body", "") or "(no description)"}

Commits:
{commit_msgs}

Files changed:
{file_list}

Diff excerpt:
{diff_excerpt}

Reply ONLY with 3-5 markdown bullet points (starting with "- "). No preamble."""

    url = "https://gen.pollinations.ai/v1/chat/completions"
    payload = {
        "model": "claude-fast",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }
    hdrs = {"Content-Type": "application/json"}
    if pollinations_key:
        hdrs["Authorization"] = f"Bearer {pollinations_key}"

    try:
        status, data = api_request(url, method="POST", headers=hdrs, data=payload)
        if status == 200 and isinstance(data, dict):
            return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        print(f"::warning::LLM summary failed: {exc}", file=sys.stderr)

    return None


# ---------------------------------------------------------------------------
# Manifest helpers
# ---------------------------------------------------------------------------

def read_manifest(manifest_path):
    """Read .elixpo/project.yml and return gist ID (or None).

    Parses the YAML manually to avoid external deps — only looks for
    a top-level `gist:` block with an `id:` key.
    """
    if not os.path.isfile(manifest_path):
        print(f"::warning::Manifest not found at {manifest_path}", file=sys.stderr)
        return None

    with open(manifest_path, "r") as fh:
        lines = fh.readlines()

    in_gist_block = False
    for line in lines:
        stripped = line.strip()
        # Detect top-level key (no leading whitespace for top-level)
        if stripped.startswith("gist:") and not line[0].isspace():
            # Inline value?  gist: { id: abc }
            rest = stripped[len("gist:"):].strip()
            if rest:
                # Try to grab id from inline mapping
                if "id:" in rest:
                    part = rest.split("id:")[1].strip().strip("'\"").split()[0].rstrip(",}")
                    if part:
                        return part
            in_gist_block = True
            continue
        if in_gist_block:
            if line[0:1] not in (" ", "\t"):
                # Left the gist block
                in_gist_block = False
                continue
            if "id:" in stripped:
                val = stripped.split("id:")[1].strip().strip("'\"")
                if val:
                    return val
    return None


# ---------------------------------------------------------------------------
# Gist operations (using gist-token / elixpoo PAT)
# ---------------------------------------------------------------------------

def gist_headers(gist_token):
    return {
        "Authorization": f"token {gist_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def fetch_gist(gist_id, gist_token):
    """Fetch existing gist content. Returns (filename, content) or (None, None)."""
    url = f"https://api.github.com/gists/{gist_id}"
    status, data = api_request(url, headers=gist_headers(gist_token))
    if status != 200:
        print(f"::warning::Failed to fetch gist {gist_id} ({status})", file=sys.stderr)
        return None, None
    files = data.get("files", {})
    if not files:
        return None, None
    fname = next(iter(files))
    content = files[fname].get("content", "")
    return fname, content


def update_gist(gist_id, filename, content, gist_token):
    """PATCH an existing gist."""
    url = f"https://api.github.com/gists/{gist_id}"
    payload = {"files": {filename: {"content": content}}}
    status, data = api_request(url, method="PATCH", headers=gist_headers(gist_token), data=payload)
    if status not in (200, 201):
        print(f"::error::Failed to update gist ({status}): {data}", file=sys.stderr)
        sys.exit(1)
    return data


def create_gist(filename, content, description, gist_token):
    """Create a new public gist. Returns the full gist response dict."""
    url = "https://api.github.com/gists"
    payload = {
        "description": description,
        "public": True,
        "files": {filename: {"content": content}},
    }
    status, data = api_request(url, method="POST", headers=gist_headers(gist_token), data=payload)
    if status not in (200, 201):
        print(f"::error::Failed to create gist ({status}): {data}", file=sys.stderr)
        sys.exit(1)
    return data


# ---------------------------------------------------------------------------
# PR comment
# ---------------------------------------------------------------------------

def post_pr_comment(repo, pr_number, body, token):
    """Post a comment on the PR using the regular GH token."""
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    status, data = api_request(url, method="POST", headers=gh_headers(token), data={"body": body})
    if status not in (200, 201):
        print(f"::warning::Failed to post PR comment ({status}): {data}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Entry formatting
# ---------------------------------------------------------------------------

def extract_issue_refs(pr_body):
    """Pull issue references (#NNN) from the PR body."""
    if not pr_body:
        return []
    import re
    return sorted(set(re.findall(r"#(\d+)", pr_body)))


def format_entry(pr_data, files, summary_text, date_str):
    """Build the markdown changelog entry."""
    number = pr_data["number"]
    title = pr_data.get("title", "Untitled")
    merged_by = pr_data.get("merged_by", {}) or {}
    merger = merged_by.get("login", "unknown")

    key_files = ", ".join(f"`{f['filename']}`" for f in files[:8])
    if len(files) > 8:
        key_files += f" (+{len(files) - 8} more)"

    issue_refs = extract_issue_refs(pr_data.get("body", ""))
    issues_str = ", ".join(f"#{i}" for i in issue_refs) if issue_refs else "None referenced"

    summary_block = summary_text if summary_text else "- *(automated summary unavailable)*"

    entry = (
        f"## PR #{number} — {title} ({date_str})\n"
        f"**Merged by**: @{merger}\n"
        f"**Summary**:\n{summary_block}\n"
        f"**Files**: {key_files}\n"
        f"**Issues**: {issues_str}\n"
        f"\n---\n"
    )
    return entry


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate merge gist digest entry")
    parser.add_argument("--repo", required=True, help="owner/repo e.g. elixpo/blogs.elixpo")
    parser.add_argument("--pr-number", required=True, type=int)
    parser.add_argument("--token", required=True, help="GitHub token for PR data access")
    parser.add_argument("--gist-token", required=True, help="PAT for elixpoo account (gist ops)")
    parser.add_argument("--pollinations-key", default="", help="Pollinations AI API key")
    parser.add_argument("--project-name", required=True, help="e.g. blogs.elixpo")
    parser.add_argument("--manifest-path", required=True, help="Path to .elixpo/project.yml")
    args = parser.parse_args()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. Fetch PR data
    print(f"Fetching PR #{args.pr_number} from {args.repo}...")
    pr_data = fetch_pr(args.repo, args.pr_number, args.token)

    # 2. Fetch supplementary data in sequence (stdlib has no async)
    diff_text = fetch_pr_diff(args.repo, args.pr_number, args.token)
    commits = fetch_pr_commits(args.repo, args.pr_number, args.token)
    files = fetch_pr_files(args.repo, args.pr_number, args.token)

    # 3. LLM summary
    print("Generating summary...")
    summary = generate_summary(pr_data, diff_text, commits, files, args.pollinations_key)
    if not summary:
        print("::warning::LLM summary unavailable, falling back to raw data")

    # 4. Build the entry
    entry = format_entry(pr_data, files, summary, today)

    # 5. Read manifest for existing gist ID
    gist_id = read_manifest(args.manifest_path)
    gist_filename = f"{args.project_name}-changelog.md"
    gist_description = f"{args.project_name} — Change Log by agent.elixpo"

    # 6. Create or update gist
    if gist_id:
        print(f"Updating existing gist {gist_id}...")
        existing_fname, existing_content = fetch_gist(gist_id, args.gist_token)
        if existing_fname is None:
            # Gist fetch failed — try creating a new one
            print("::warning::Could not fetch existing gist, creating new one")
            gist_id = None

    if gist_id:
        # Prepend new entry (newest first)
        new_content = entry + "\n" + (existing_content or "")
        # Use the original filename from the gist to avoid creating a second file
        update_gist(gist_id, existing_fname, new_content, args.gist_token)
        gist_url = f"https://gist.github.com/{gist_id}"
        print(f"Gist updated: {gist_url}")
    else:
        print("Creating new gist...")
        header = f"# {args.project_name} — Change Log\n\n"
        gist_resp = create_gist(gist_filename, header + entry, gist_description, args.gist_token)
        new_gist_id = gist_resp.get("id", "")
        gist_url = gist_resp.get("html_url", f"https://gist.github.com/{new_gist_id}")
        print(f"GIST_ID={new_gist_id}")
        print(f"Gist created: {gist_url}")

    # 7. Comment on the PR
    comment_body = (
        f"**Changelog updated** — [View the {args.project_name} change log]({gist_url})\n\n"
        f"*Entry added by [agent.elixpo](https://github.com/elixpo/agent.elixpo)*"
    )
    post_pr_comment(args.repo, args.pr_number, comment_body, args.token)
    print("Done.")


if __name__ == "__main__":
    main()
