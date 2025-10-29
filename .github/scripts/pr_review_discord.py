import os
import sys
import json
import random
import requests
from typing import Dict, List, Optional
from jinja2 import Environment, Template

# Configuration
GITHUB_API_BASE = "https://api.github.com"
POLLINATIONS_API_BASE = "https://text.pollinations.ai/openai"
MODEL = "gemini"

def get_env(key: str, required: bool = True) -> Optional[str]:
    """Get environment variable with optional requirement check"""
    value = os.getenv(key)
    if required and not value:
        print(f"❌ Error: {key} environment variable is required")
        sys.exit(1)
    return value

def github_api_request(endpoint: str, token: str) -> Dict:
    """Make GitHub API request"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    url = f"{GITHUB_API_BASE}/{endpoint}"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ GitHub API error: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    return response.json()

def get_pr_diff(repo: str, pr_number: str, token: str) -> str:
    """Get PR diff in unified format"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3.diff"
    }
    
    url = f"{GITHUB_API_BASE}/repos/{repo}/pulls/{pr_number}"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get PR diff: {response.status_code}")
        sys.exit(1)
    
    return response.text

def get_pr_files(repo: str, pr_number: str, token: str) -> List[Dict]:
    """Get list of files changed in PR"""
    endpoint = f"repos/{repo}/pulls/{pr_number}/files"
    return github_api_request(endpoint, token)

def format_diff_for_review(diff_text: str) -> str:
    """
    Format the diff text to match PR-Agent's format with line numbers
    """
    lines = diff_text.split('\n')
    formatted_output = []
    current_file = None
    in_hunk = False
    line_number = 0
    new_hunk_lines = []
    old_hunk_lines = []
    file_status = None
    
    for line in lines:
        if line.startswith('diff --git'):
            # Save previous hunk if exists
            if new_hunk_lines or old_hunk_lines:
                if new_hunk_lines:
                    formatted_output.append("__new hunk__")
                    formatted_output.extend(new_hunk_lines)
                if old_hunk_lines:
                    formatted_output.append("__old hunk__")
                    formatted_output.extend(old_hunk_lines)
                new_hunk_lines = []
                old_hunk_lines = []
            
            # Extract filename - handle both a/ and b/ prefixes
            parts = line.split(' ')
            if len(parts) >= 4:
                # Get the file path from either a/ or b/ prefix
                filename_a = parts[2].replace('a/', '') if parts[2].startswith('a/') else parts[2]
                filename_b = parts[3].replace('b/', '') if parts[3].startswith('b/') else parts[3]
                
                # Determine file status and use appropriate filename
                if filename_a == '/dev/null':
                    filename = filename_b
                    file_status = "ADDED"
                elif filename_b == '/dev/null':
                    filename = filename_a
                    file_status = "DELETED"
                else:
                    filename = filename_b
                    file_status = "MODIFIED"
                
                current_file = filename
                status_emoji = {"ADDED": "➕", "DELETED": "🗑️", "MODIFIED": "📝"}
                formatted_output.append(f"\n## File: '{filename}' {status_emoji.get(file_status, '')}")
                if file_status:
                    formatted_output.append(f"**Status:** {file_status}")
                formatted_output.append("")
        
        elif line.startswith('@@'):
            # Save previous hunk if exists
            if new_hunk_lines or old_hunk_lines:
                if new_hunk_lines:
                    formatted_output.append("__new hunk__")
                    formatted_output.extend(new_hunk_lines)
                if old_hunk_lines:
                    formatted_output.append("__old hunk__")
                    formatted_output.extend(old_hunk_lines)
                new_hunk_lines = []
                old_hunk_lines = []
            
            # Extract line number from hunk header
            formatted_output.append("")
            formatted_output.append(line)
            # Parse line number: @@ -old_start,old_count +new_start,new_count @@
            try:
                if '+' in line:
                    parts = line.split('+')[1].split(',')
                    line_number = int(parts[0]) - 1
                else:
                    line_number = 0
            except:
                line_number = 0
            in_hunk = True
        
        elif in_hunk:
            if line.startswith('+') and not line.startswith('+++'):
                line_number += 1
                new_hunk_lines.append(f"{line_number:2d} {line}")
            elif line.startswith('-') and not line.startswith('---'):
                old_hunk_lines.append(line)
            elif line.startswith(' '):
                line_number += 1
                new_hunk_lines.append(f"{line_number:2d} {line}")
            else:
                # Context line or end of hunk
                if line.strip():
                    line_number += 1
                    new_hunk_lines.append(f"{line_number:2d}  {line}")
    
    # Save last hunk
    if new_hunk_lines or old_hunk_lines:
        if new_hunk_lines:
            formatted_output.append("__new hunk__")
            formatted_output.extend(new_hunk_lines)
        if old_hunk_lines:
            formatted_output.append("__old hunk__")
            formatted_output.extend(old_hunk_lines)
    
    return '\n'.join(formatted_output)

def post_pr_comment(repo: str, pr_number: str, comment: str, token: str):
    """Post a comment on the PR"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/{pr_number}/comments"
    payload = {"body": comment}
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code != 201:
        print(f"❌ Failed to post PR comment: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    print("✅ Successfully posted comment on PR!")

def get_system_prompt() -> str:
    """Return the change summary prompt for elixpo_ai_chapter"""
    return """You are a PR summary expert for the elixpo_ai_chapter project - an AI learning and development platform.

FOCUS AREAS FOR THIS REPO:
- **Learning Content** - Tutorials, examples, documentation, educational resources
- **Infrastructure** - Docker setup, deployment, environment configurations
- **Tools & Utilities** - Scripts, CLI tools, helper functions for AI workflows
- **Bug Fixes & Improvements** - Performance, reliability, user experience enhancements

CHANGE TYPES TO HIGHLIGHT:
- Learning material or tutorial updates
- Performance improvements
- Breaking changes users need to know about
- New features or capabilities
- Bug fixes affecting user workflow

OUTPUT FORMAT:
Create a GitHub PR comment with this structure:

## 📊 Change Summary

**Type:** [Feature | Bug Fix | Documentation | Infrastructure | Refactor]

### What Changed
- Specific change 1
- Specific change 2
- Specific change 3

### Impact
Brief explanation of how this affects users/developers

### Files Modified
- List key files changed
- Group by category if helpful

---
*Generated by PR Review Bot*

IMPORTANT RULES:
- Use markdown formatting
- Be concise but informative
- Focus on user-facing impact
- Highlight breaking changes clearly
- Use emojis appropriately
- Max 1500 characters
"""

def get_user_prompt_comment(title: str, branch: str, description: str, diff: str) -> str:
    """Generate prompt for PR comment"""
    template = """PR Information for elixpo_ai_chapter:

Title: '{{ title }}'
Branch: '{{ branch }}'
Description:
{{ description }}

Code Changes:
{{ diff }}

TASK: Create a concise GitHub PR comment summarizing the key changes.
- Focus on what changed and why it matters
- Keep it brief and actionable
- Highlight any breaking changes or important notes
- Group changes by category (AI models, infrastructure, docs, etc.)
"""
    
    env = Environment()
    tmpl = env.from_string(template)
    return tmpl.render(
        title=title,
        branch=branch,
        description=description or "No description provided",
        diff=diff
    )

def call_pollinations_api(system_prompt: str, user_prompt: str, token: str) -> str:
    """Call Pollinations AI API with OpenAI-compatible format"""
    # Generate random seed for varied results
    seed = random.randint(0, 2147483647)  # int32 max
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "seed": seed
    }
    
    print(f"🤖 Calling Pollinations AI API with model: {MODEL}, seed: {seed}")
    
    response = requests.post(
        f"{POLLINATIONS_API_BASE}/chat/completions",
        headers=headers,
        json=payload,
        timeout=120
    )
    
    if response.status_code != 200:
        print(f"❌ Pollinations API error: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    result = response.json()
    return result['choices'][0]['message']['content']

def parse_discord_message(response: str) -> str:
    """Parse Discord message from AI response"""
    print(f"DEBUG: Raw AI response length: {len(response)}")
    print(f"DEBUG: First 200 chars: {response[:200]}")
    
    # Clean up the response - remove any markdown code blocks if present
    message = response.strip()
    
    # Remove markdown code block markers if present
    if message.startswith('```'):
        lines = message.split('\n')
        # Remove first line if it's just ```
        if lines[0].strip() == '```' or lines[0].startswith('```'):
            lines = lines[1:]
        # Remove last line if it's just ```
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        message = '\n'.join(lines)
    
    # Ensure message isn't too long for Discord (2000 char limit)
    if len(message) > 1900:
        message = message[:1897] + "..."
    
    print(f"DEBUG: Cleaned message length: {len(message)}")
    print(f"DEBUG: Final message:\n{message}")
    
    return message

def format_review_for_discord(message_content: str, pr_info: Dict) -> Dict:
    """Format announcement message for Discord webhook"""
    
    # Format timestamp for Discord-like display
    from datetime import datetime
    try:
        if pr_info.get('merged_at'):
            # Parse ISO timestamp and format for display
            dt = datetime.fromisoformat(pr_info['merged_at'].replace('Z', '+00:00'))
            time_str = dt.strftime("%I:%M %p")
        else:
            time_str = "unknown time"
    except:
        time_str = "unknown time"
    
    # Add PR info footer to the message
    footer = f"\n\nPR #{pr_info['number']} • Merged by {pr_info['author']} • Today at {time_str}"
    
    # Combine message with footer, ensuring we don't exceed Discord limits
    full_message = message_content + footer
    if len(full_message) > 1900:
        # Truncate the main message to fit the footer
        available_space = 1900 - len(footer) - 3  # -3 for "..."
        message_content = message_content[:available_space] + "..."
        full_message = message_content + footer
    
    return {
        "content": full_message
    }

def post_to_discord(webhook_url: str, payload: Dict):
    """Post message to Discord webhook"""
    response = requests.post(webhook_url, json=payload)
    
    if response.status_code not in [200, 204]:
        print(f"❌ Discord webhook error: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    print("✅ Successfully posted to Discord!")

def main():
    print("🚀 Starting PR Review & Comment Generator...")
    
    # Get environment variables
    github_token = get_env('PAT_TOKEN')
    pollinations_token = get_env('POLLI_PAT') or get_env('POLLI_PAT', required=False)
    if not pollinations_token:
        print("⚠️ Warning: Pollinations token not found, skipping Discord announcement")
        pollinations_token = None
    discord_webhook = get_env('DISCORD_WEBHOOK_URL', required=False)
    pr_number = get_env('PR_NUMBER')
    repo_full_name = get_env('REPO_FULL_NAME')
    pr_title = get_env('PR_TITLE')
    pr_url = get_env('PR_URL')
    pr_author = get_env('PR_AUTHOR')
    pr_branch = get_env('PR_BRANCH')
    
    print(f"📝 Reviewing PR #{pr_number} in {repo_full_name}")
    print(f"🔗 {pr_url}")
    
    # Get PR details
    pr_data = github_api_request(f"repos/{repo_full_name}/pulls/{pr_number}", github_token)
    pr_description = pr_data.get('body', '')
    merged_at = pr_data.get('merged_at', '')
    
    # Get PR diff
    print("📥 Fetching PR diff...")
    diff_raw = get_pr_diff(repo_full_name, pr_number, github_token)
    
    # Format diff for review
    print("🔄 Formatting diff...")
    diff_formatted = format_diff_for_review(diff_raw)
    
    # Generate PR comment
    print("📋 Generating PR comment...")
    system_prompt_comment = get_system_prompt()
    user_prompt_comment = get_user_prompt_comment(pr_title, pr_branch, pr_description, diff_formatted)
    
    pr_comment = call_pollinations_api(system_prompt_comment, user_prompt_comment, pollinations_token)
    pr_comment = parse_discord_message(pr_comment)
    
    # Post comment on PR
    print("💬 Posting comment on PR...")
    post_pr_comment(repo_full_name, pr_number, pr_comment, github_token)
    
    # Post to Discord if webhook URL is available
    if discord_webhook and pollinations_token:
        print("📤 Posting to Discord...")
        pr_info = {
            'title': pr_title,
            'number': pr_number,
            'url': pr_url,
            'author': pr_author,
            'merged_at': merged_at
        }
        discord_payload = format_review_for_discord(pr_comment, pr_info)
        post_to_discord(discord_webhook, discord_payload)
    
    print("✨ Done!")

if __name__ == "__main__":
    main()
