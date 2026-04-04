#!/usr/bin/env python3
"""
Common utilities for CI scripts.
Used by generate_realtime.py, publish_realtime.py, and pr-review.py.
"""

import os
import sys
import time
import json
import random
import requests
from typing import Dict, List, Optional
from urllib.parse import quote
from pathlib import Path

from ci_config import ai_api_base, ai_image_base, ai_model, image_style_suffix, character_ref_url, gists_branch, gists_dir, discord_char_limit

# API Endpoints — read from .github/tommy.yml
GITHUB_API_BASE = "https://api.github.com"
POLLINATIONS_API_BASE = ai_api_base()
POLLINATIONS_IMAGE_BASE = ai_image_base()

# Models — read from .github/tommy.yml
MODEL = ai_model("text")
IMAGE_MODEL = ai_model("image")

# Limits and retry settings
MAX_SEED = 2147483647
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 2
DEFAULT_TIMEOUT = 30

GISTS_BRANCH = gists_branch()

# Image generation — read from .github/tommy.yml
IMAGE_STYLE_SUFFIX = image_style_suffix()

# Discord-specific — read from .github/tommy.yml
DISCORD_CHAR_LIMIT = discord_char_limit()

# Get the directory where this script lives
SCRIPTS_DIR = Path(__file__).parent
PROMPTS_DIR = SCRIPTS_DIR.parent / "prompts"
BRAND_DIR = PROMPTS_DIR / "brand"

# Cache for shared prompts (loaded once)
_shared_prompts_cache: Dict[str, str] = {}


def github_api_request(
    method: str,
    url: str,
    headers: Dict,
    timeout: int = None,
    max_retries: int = 3,
    **kwargs,
) -> requests.Response:
    """Make a GitHub API request with retry on transient failures (5xx, 429)."""
    _timeout = timeout or DEFAULT_TIMEOUT
    resp = None
    last_exc = None
    for attempt in range(max_retries):
        try:
            resp = requests.request(method, url, headers=headers, timeout=_timeout, **kwargs)
            if resp.status_code < 500 and resp.status_code != 429:
                return resp
            print(f"  GitHub API {resp.status_code} on attempt {attempt + 1}/{max_retries}")
        except requests.exceptions.RequestException as e:
            last_exc = e
            print(f"  GitHub API request error on attempt {attempt + 1}/{max_retries}: {e}")
        if attempt < max_retries - 1:
            delay = INITIAL_RETRY_DELAY * (2 ** attempt)
            time.sleep(delay)
    if last_exc:
        raise last_exc
    print(f"  WARNING: GitHub API returned {resp.status_code} after {max_retries} retries: {url}")
    return resp


def parse_json_response(response: str) -> Optional[Dict]:
    """Parse JSON from AI response, stripping markdown fences."""
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}")
        print(f"  Response: {text[:500]}")
        return None


def get_repo_root() -> str:
    """Get the repository root directory by looking for .git folder."""
    current = os.path.dirname(os.path.abspath(__file__))
    while current != '/':
        if os.path.exists(os.path.join(current, '.git')):
            return current
        current = os.path.dirname(current)
    return os.getcwd()


def load_shared(name: str) -> str:
    """Load a brand prompt component from prompts/brand/{name}.md."""
    if name in _shared_prompts_cache:
        return _shared_prompts_cache[name]

    shared_path = BRAND_DIR / f"{name}.md"

    if not shared_path.exists():
        print(f"Warning: Brand prompt not found: {shared_path}")
        return ""

    with open(shared_path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    filtered_lines = []
    for line in lines:
        if line.startswith("#") and not filtered_lines:
            continue
        if line.strip().startswith("<!--") and line.strip().endswith("-->"):
            continue
        filtered_lines.append(line)

    content = "\n".join(filtered_lines).strip()
    _shared_prompts_cache[name] = content
    return content


def _inject_shared_prompts(content: str) -> str:
    """Inject brand prompt components into content."""
    if "{about}" in content:
        content = content.replace("{about}", load_shared("about"))
    if "{visual_style}" in content:
        content = content.replace("{visual_style}", load_shared("visual"))
    if "{bee_character}" in content:
        content = content.replace("{bee_character}", load_shared("bee"))
    if "{links}" in content:
        content = content.replace("{links}", load_shared("links"))
    return content


def get_env(key: str, required: bool = True) -> Optional[str]:
    """Get environment variable with optional requirement check."""
    value = os.getenv(key)
    if required and not value:
        print(f"Error: {key} environment variable is required")
        sys.exit(1)
    return value


def load_prompt(name: str) -> str:
    """Load a prompt file from prompts/{name}.md with brand injection."""
    prompt_path = PROMPTS_DIR / f"{name}.md"

    if not prompt_path.exists():
        print(f"Warning: Prompt file not found: {prompt_path}")
        return ""

    with open(prompt_path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    if lines and lines[0].startswith("#"):
        content = "\n".join(lines[1:]).strip()

    content = _inject_shared_prompts(content)
    return content


def load_format(platform: str) -> str:
    """Load the ## {platform} section from prompts/format.md."""
    content = load_prompt("format")
    if not content:
        return ""

    lines = content.split("\n")
    section_lines = []
    in_section = False

    for line in lines:
        if line.startswith("## "):
            if in_section:
                break
            if line[3:].strip().lower() == platform.lower():
                in_section = True
                continue
        elif in_section:
            section_lines.append(line)

    if not section_lines:
        print(f"Warning: No ## {platform} section found in format.md")

    return "\n".join(section_lines).strip()


def call_pollinations_api(
    system_prompt: str,
    user_prompt: str,
    token: str,
    temperature: float = 0.7,
    max_retries: int = None,
    model: str = None,
    verbose: bool = False,
    exit_on_failure: bool = False
) -> Optional[str]:
    """Call AI API with retry logic and exponential backoff."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    use_model = model or MODEL
    retries = max_retries if max_retries is not None else MAX_RETRIES
    last_error = None

    if verbose:
        print(f"\n  [VERBOSE] API Call to {POLLINATIONS_API_BASE}")
        print(f"  [VERBOSE] Model: {use_model}")
        print(f"  [VERBOSE] Temperature: {temperature}")
        print(f"  [VERBOSE] System prompt ({len(system_prompt)} chars):")
        print(f"  ---BEGIN SYSTEM PROMPT---")
        print(system_prompt[:2000] + ("..." if len(system_prompt) > 2000 else ""))
        print(f"  ---END SYSTEM PROMPT---")
        print(f"  [VERBOSE] User prompt ({len(user_prompt)} chars):")
        print(f"  ---BEGIN USER PROMPT---")
        print(user_prompt[:2000] + ("..." if len(user_prompt) > 2000 else ""))
        print(f"  ---END USER PROMPT---")

    for attempt in range(retries):
        seed = random.randint(0, MAX_SEED)

        payload = {
            "model": use_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "seed": seed
        }

        if attempt == 0:
            if verbose:
                print(f"  Using seed: {seed}")
        else:
            backoff_delay = INITIAL_RETRY_DELAY * (2 ** attempt)
            print(f"  Retry {attempt}/{retries - 1} with new seed: {seed} (waiting {backoff_delay}s)")
            time.sleep(backoff_delay)

        try:
            response = requests.post(
                POLLINATIONS_API_BASE,
                headers=headers,
                json=payload,
                timeout=120
            )

            if response.status_code == 200:
                try:
                    result = response.json()
                    content = result['choices'][0]['message']['content']
                    if verbose:
                        print(f"  [VERBOSE] Response ({len(content)} chars):")
                        print(f"  ---BEGIN RESPONSE---")
                        print(content[:3000] + ("..." if len(content) > 3000 else ""))
                        print(f"  ---END RESPONSE---")
                    return content
                except (KeyError, IndexError, json.JSONDecodeError) as e:
                    last_error = f"Error parsing API response: {e}"
                    error_preview = response.text[:500] + "..." if len(response.text) > 500 else response.text
                    print(f"  {last_error}")
                    print(f"  Response preview: {error_preview}")
            else:
                last_error = f"API error: {response.status_code}"
                error_preview = response.text[:500] + "..." if len(response.text) > 500 else response.text
                print(f"  {last_error}")
                print(f"  Error preview: {error_preview}")

        except requests.exceptions.RequestException as e:
            last_error = f"Request failed: {e}"
            print(f"  {last_error}")

    print(f"All {retries} attempts failed. Last error: {last_error}")

    if exit_on_failure:
        sys.exit(1)
    return None


def generate_image(prompt: str, token: str, width: int = 2048, height: int = 2048, index: int = 0, model: str = None) -> tuple[Optional[bytes], Optional[str]]:
    """Generate a single image via the image API."""
    use_model = model or IMAGE_MODEL

    if "bee mascot" not in prompt.lower():
        bee_desc = load_shared("bee")
        if bee_desc:
            prompt = f"{prompt} {bee_desc}"

    prompt = f"{prompt} {IMAGE_STYLE_SUFFIX}"

    sanitized = prompt.replace("'", "")
    encoded_prompt = quote(sanitized)
    base_url = f"{POLLINATIONS_IMAGE_BASE}/{encoded_prompt}"

    print(f"\n  Generating image {index + 1} (model={use_model}): {prompt[:80]}...")

    last_error = None

    for attempt in range(MAX_RETRIES):
        seed = random.randint(0, MAX_SEED)

        params = {
            "model": use_model,
            "width": width,
            "height": height,
            "quality": "hd",
            "nologo": "true",
            "private": "true",
            "nofeed": "true",
            "seed": seed,
            "key": token,
        }
        _char_ref = character_ref_url()
        if _char_ref:
            params["image"] = _char_ref

        if attempt == 0:
            print(f"  Using seed: {seed}")
        else:
            backoff_delay = INITIAL_RETRY_DELAY * (2 ** attempt)
            print(f"  Retry {attempt}/{MAX_RETRIES - 1} with new seed: {seed} (waiting {backoff_delay}s)")
            time.sleep(backoff_delay)

        try:
            response = requests.get(base_url, params=params, timeout=300)

            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    image_bytes = response.content

                    if len(image_bytes) < 1000:
                        last_error = f"Image too small ({len(image_bytes)} bytes)"
                        print(f"  {last_error}")
                        continue

                    is_jpeg = image_bytes[:2] == b'\xff\xd8'
                    is_png = image_bytes[:8] == b'\x89PNG\r\n\x1a\n'
                    is_webp = image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP'

                    if not (is_jpeg or is_png or is_webp):
                        last_error = f"Invalid image format"
                        print(f"  {last_error}")
                        continue

                    img_format = "JPEG" if is_jpeg else ("PNG" if is_png else "WebP")
                    print(f"  Image generated successfully ({img_format}, {len(image_bytes):,} bytes)")

                    public_params = {k: v for k, v in params.items() if k != "key"}
                    public_url = base_url + "?" + "&".join(f"{k}={v}" for k, v in public_params.items())

                    return image_bytes, public_url
                else:
                    last_error = f"Unexpected content type: {content_type}"
                    print(f"  {last_error}")
            else:
                last_error = f"HTTP error: {response.status_code}"
                print(f"  {last_error}")

        except requests.exceptions.RequestException as e:
            last_error = f"Request error: {e}"
            print(f"  {last_error}")

    print(f"  Failed to generate image after {MAX_RETRIES} attempts")
    return None, None


# ── GitHub helpers ──────────────────────────────────────────────────


def _github_headers(token: str) -> Dict:
    """Standard GitHub API headers."""
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
    }


def commit_image_to_branch(
    image_bytes: bytes,
    file_path: str,
    branch: str,
    github_token: str,
    owner: str,
    repo: str,
) -> Optional[str]:
    """Commit an image file to a GitHub branch and return a raw URL."""
    import base64 as _b64

    headers = _github_headers(github_token)
    encoded = _b64.b64encode(image_bytes).decode()

    sha = get_file_sha(github_token, owner, repo, file_path, branch)

    payload = {
        "message": f"add image {file_path.split('/')[-1]}",
        "content": encoded,
        "branch": branch,
    }
    if sha:
        payload["sha"] = sha

    resp = github_api_request(
        "PUT",
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{file_path}",
        headers=headers,
        json=payload,
    )

    if resp.status_code in [200, 201]:
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}"
        print(f"  Committed image to {file_path}")
        return raw_url

    print(f"  Failed to commit image: {resp.status_code} {resp.text[:200]}")
    return None


def get_file_sha(github_token: str, owner: str, repo: str, file_path: str, branch: str = "main") -> str:
    """Get the SHA of an existing file."""
    headers = _github_headers(github_token)

    response = github_api_request(
        "GET",
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{file_path}?ref={branch}",
        headers=headers,
    )

    if response.status_code == 200:
        return response.json().get("sha", "")
    return ""


# ── Gist I/O helpers ───────────────────────────────────────────────

GISTS_REL_DIR = gists_dir()

_GIST_REQUIRED_KEYS = {"pr_number", "title", "author", "url", "merged_at"}
_GIST_AI_KEYS = {"category", "user_facing", "publish_tier", "importance",
                 "headline", "blurb", "summary", "impact", "keywords", "image_prompt"}

VALID_CATEGORIES = {"feature", "bug_fix", "improvement", "docs", "infrastructure", "community"}
VALID_PUBLISH_TIERS = {"none", "discord_only", "daily"}
VALID_IMPORTANCE = {"major", "minor"}


def validate_gist(gist: Dict) -> List[str]:
    """Validate a gist dict against the schema. Returns list of error strings (empty = valid)."""
    errors = []

    for key in _GIST_REQUIRED_KEYS:
        if key not in gist:
            errors.append(f"missing top-level key: {key}")

    ai = gist.get("gist")
    if ai is None:
        errors.append("missing 'gist' object")
        return errors

    for key in _GIST_AI_KEYS:
        if key not in ai:
            errors.append(f"missing gist.{key}")

    if ai.get("category") and ai["category"] not in VALID_CATEGORIES:
        errors.append(f"invalid category: {ai['category']}")
    if ai.get("publish_tier") and ai["publish_tier"] not in VALID_PUBLISH_TIERS:
        errors.append(f"invalid publish_tier: {ai['publish_tier']}")
    if ai.get("importance") and ai["importance"] not in VALID_IMPORTANCE:
        errors.append(f"invalid importance: {ai['importance']}")
    if "user_facing" in ai and not isinstance(ai["user_facing"], bool):
        errors.append("user_facing must be boolean")
    if "keywords" in ai and not isinstance(ai["keywords"], list):
        errors.append("keywords must be a list")

    return errors


def apply_publish_tier_rules(gist: Dict) -> str:
    """Apply hard rules for publish_tier. Returns the corrected tier."""
    ai = gist.get("gist", {})
    labels = [l.lower() for l in gist.get("labels", [])]
    ai_tier = ai.get("publish_tier", "daily")

    if ("deps" in labels or "chore" in labels) and not ai.get("user_facing", False):
        return "discord_only"

    if "feature" in labels:
        return "daily"

    return ai_tier


def gist_path_for_pr(pr_number: int, merged_at: str) -> str:
    """Return the repo-relative path for a gist file."""
    date_str = merged_at[:10]
    return f"{GISTS_REL_DIR}/{date_str}/PR-{pr_number}.json"


def commit_gist(gist: Dict, github_token: str, owner: str, repo: str) -> bool:
    """Commit a gist JSON file to the news branch. Returns True on success."""
    file_path = gist_path_for_pr(gist["pr_number"], gist["merged_at"])
    content = json.dumps(gist, indent=2, ensure_ascii=False)

    import base64 as _b64
    encoded = _b64.b64encode(content.encode()).decode()

    headers = _github_headers(github_token)
    sha = get_file_sha(github_token, owner, repo, file_path, GISTS_BRANCH)

    payload = {
        "message": f"chore(news): add gist for PR #{gist['pr_number']}",
        "content": encoded,
        "branch": GISTS_BRANCH,
    }
    if sha:
        payload["sha"] = sha

    resp = github_api_request(
        "PUT",
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{file_path}",
        headers=headers,
        json=payload,
    )

    if resp.status_code in [200, 201]:
        print(f"  Committed gist to {file_path} on {GISTS_BRANCH}")
        return True

    print(f"  Failed to commit gist: {resp.status_code} {resp.text[:200]}")
    return False
