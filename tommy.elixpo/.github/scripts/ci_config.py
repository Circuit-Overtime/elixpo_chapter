#!/usr/bin/env python3
"""
Loads .github/tommy.yml and exposes it as a simple dict.

Usage in any CI script:
    from ci_config import cfg

    model = cfg["ai"]["models"]["text"]
    whitelist = cfg["github"]["whitelist"]
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict

# pyyaml is available in ubuntu-latest runners (pre-installed)
import yaml


def _find_config() -> Path:
    """Walk up from this script to find .github/tommy.yml."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        candidate = current / ".github" / "tommy.yml"
        if candidate.exists():
            return candidate
        # Also check if we ARE inside .github already
        candidate = current / "tommy.yml"
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent

    # Fallback: GITHUB_WORKSPACE env var (set in CI)
    workspace = os.environ.get("GITHUB_WORKSPACE", "")
    if workspace:
        candidate = Path(workspace) / ".github" / "tommy.yml"
        if candidate.exists():
            return candidate

    print("FATAL: Could not find .github/tommy.yml", file=sys.stderr)
    sys.exit(1)


def _deep_get(d: Dict, *keys: str, default: Any = None) -> Any:
    """Safely traverse nested dicts."""
    for key in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(key, default)
    return d


def _find_runtime_config() -> Path:
    """Find config.json (runtime config for the bot)."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        candidate = current / "config.json"
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent
    workspace = os.environ.get("GITHUB_WORKSPACE", "")
    if workspace:
        candidate = Path(workspace) / "config.json"
        if candidate.exists():
            return candidate
    return Path("config.json")  # fallback, may not exist


def load_config() -> Dict:
    """Load and return the full CI config dict from tommy.yml."""
    path = _find_config()
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data


def load_runtime_config() -> Dict:
    """Load config.json (runtime config — bot identity, admin users, repos)."""
    path = _find_runtime_config()
    if not path.exists():
        return {}
    import json
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Module-level singletons ─────────────────────────────────────────
cfg: Dict = load_config()
runtime_cfg: Dict = load_runtime_config()


# ── Convenience accessors ───────────────────────────────────────────

def bot_name() -> str:
    """Read from config.json (single source of truth for bot identity)."""
    return _deep_get(runtime_cfg, "bot", "name", default="Tommy")

def trigger_phrase() -> str:
    return _deep_get(cfg, "bot", "trigger_phrase", default="tommy")

def system_prompt() -> str:
    return _deep_get(cfg, "bot", "system_prompt", default="")

def whitelist() -> list:
    """Read from config.json → github.admin_users (single source of truth)."""
    return _deep_get(runtime_cfg, "github", "admin_users", default=[])

def secret_name(key: str) -> str:
    """Get a secret name, e.g. secret_name('app_id') -> 'TOMMY_BOT_APP_ID'."""
    return _deep_get(cfg, "github", "secrets", key, default="")

def ai_api_base() -> str:
    return _deep_get(cfg, "ai", "api_base_url", default="")

def ai_image_base() -> str:
    return _deep_get(cfg, "ai", "image_api_base_url", default="")

def ai_model(kind: str = "text") -> str:
    """Get model name by kind: 'text', 'review', 'image', 'websearch'."""
    return _deep_get(cfg, "ai", "models", kind, default="")

def router_config_json(api_key: str) -> str:
    """Build the claude-code-router config JSON string with the given API key injected."""
    import json
    router = _deep_get(cfg, "ai", "router", default={})
    providers_cfg = router.get("providers", [])

    providers = []
    for p in providers_cfg:
        providers.append({
            "name": p.get("name", "default"),
            "api_base_url": p.get("api_base_url", ""),
            "api_key": api_key,
            "models": p.get("models", []),
        })

    config = {
        "LOG": False,
        "NON_INTERACTIVE_MODE": True,
        "API_TIMEOUT_MS": 600000,
        "Providers": providers,
        "Router": {
            "default": router.get("default_route", ""),
            "webSearch": router.get("websearch_route", ""),
        },
    }
    return json.dumps(config)

def anthropic_api_key() -> str:
    return _deep_get(cfg, "ai", "router", "anthropic_api_key", default="")

def image_style_suffix() -> str:
    return _deep_get(cfg, "image", "style_suffix", default="")

def image_size() -> int:
    return _deep_get(cfg, "image", "size", default=2048)

def character_ref_url() -> str:
    return _deep_get(cfg, "image", "character_ref_url", default="")

def gists_branch() -> str:
    return _deep_get(cfg, "news", "gists_branch", default="news")

def gists_dir() -> str:
    return _deep_get(cfg, "news", "gists_dir", default="social/news/gists")

def discord_char_limit() -> int:
    return _deep_get(cfg, "discord", "char_limit", default=2000)

def discord_chunk_size() -> int:
    return _deep_get(cfg, "discord", "chunk_size", default=1900)

def app_token_owner() -> str:
    return _deep_get(cfg, "github", "app_token_owner", default="")

def project_number() -> int:
    return _deep_get(cfg, "project_manager", "project_number", default=0)

def pr_review_cfg() -> Dict:
    return _deep_get(cfg, "pr_review", default={})

def autofix_enabled() -> bool:
    return _deep_get(cfg, "autofix", "enabled", default=True)

def autofix_label() -> str:
    return _deep_get(cfg, "autofix", "label", default="tommy")

def autofix_system_prompt() -> str:
    return _deep_get(cfg, "autofix", "system_prompt", default="")
