"""Local CLI configuration management (~/.elixpo/config.json)."""

from __future__ import annotations

import json
import os
from pathlib import Path

CONFIG_DIR = Path.home() / ".elixpo"
CONFIG_FILE = CONFIG_DIR / "config.json"


def _ensure_config_dir():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    """Load CLI configuration from disk."""
    if not CONFIG_FILE.exists():
        return {}
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)


def save_config(config: dict) -> None:
    """Save CLI configuration to disk."""
    _ensure_config_dir()
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_api_key() -> str | None:
    """Get the LLM API key from config or environment."""
    env_key = os.environ.get("ELIXPO_KIMI_API_KEY") or os.environ.get("ELIXPO_LLM_API_KEY")
    if env_key:
        return env_key
    config = load_config()
    return config.get("api_key")


def get_api_url() -> str:
    """Get the LLM API URL from config or environment."""
    env_url = os.environ.get("ELIXPO_KIMI_API_URL") or os.environ.get("ELIXPO_LLM_API_URL")
    if env_url:
        return env_url
    config = load_config()
    return config.get("api_url", "https://gen.pollinations.ai/v1")


def get_model() -> str:
    """Get the model name from config or environment."""
    env_model = os.environ.get("ELIXPO_KIMI_MODEL") or os.environ.get("ELIXPO_LLM_MODEL")
    if env_model:
        return env_model
    config = load_config()
    return config.get("model", "openai")


def get_perplexity_key() -> str | None:
    """Get the Perplexity API key from config or environment."""
    env_key = os.environ.get("ELIXPO_PERPLEXITY_API_KEY")
    if env_key:
        return env_key
    config = load_config()
    return config.get("perplexity_key")
