"""Configuration for elixpoo. Secrets load from .env.local at the repo root.

Clean-slate naming — no legacy aliases. See .env.example for the full var list.
No database, no server: the squad system is stateless beyond GitHub issues, the
Project board, and state/*.json. Only Pollinations + GitHub App creds + paths.
"""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# repo root = parent of lib/
ROOT = Path(__file__).resolve().parents[1]

# .env.local is the working secret file (gitignored). The tracked .env is the
# SOPS-encrypted copy and is not read directly.
_envfile = ROOT / ".env.local"
if _envfile.exists():
    load_dotenv(_envfile, override=False)


class PollinationsSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="POLLINATIONS_", extra="ignore")

    api_key: str = ""
    base_url: str = "https://gen.pollinations.ai/v1"


class GitHubSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ELIXPO_GH_", extra="ignore")

    app_id: str = ""
    # PEM contents (preferred — paste into the CI secret). Path is the local-dev input.
    private_key: str = ""
    private_key_path: str = ""
    webhook_secret: str = ""
    bot_username: str = "elixpoo"
    # Control repo holding state/, candidate issues, and the Project board (owner/name).
    control_repo: str = ""
    # Token for plain REST when not minting an App installation token (Actions sets GITHUB_TOKEN).
    token: str = Field(default="", validation_alias="GITHUB_TOKEN")

    def resolved_private_key(self) -> str:
        """PEM contents: the env string wins; otherwise read the file path."""
        if self.private_key.strip():
            return self.private_key
        if self.private_key_path and Path(self.private_key_path).exists():
            return Path(self.private_key_path).read_text()
        return ""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ELIXPO_", extra="ignore")

    pollinations: PollinationsSettings = PollinationsSettings()
    github: GitHubSettings = GitHubSettings()

    root: Path = ROOT
    config_dir: Path = ROOT / "config"
    state_dir: Path = ROOT / "state"
    prompts_dir: Path = ROOT / "prompts"

    debug: bool = False


settings = Settings()
