"""Global configuration loaded from environment variables."""

from __future__ import annotations

from pydantic import BaseModel
from pydantic_settings import BaseSettings


class ModelProfile(BaseModel):
    """Configuration for a single LLM provider."""
    name: str
    api_url: str
    api_key: str = ""
    model: str
    max_context_tokens: int = 128_000
    temperature: float = 0.0
    supports_tools: bool = True
    role: str = "general"  # "general" | "research"


class LLMSettings(BaseSettings):
    model_config = {"env_prefix": "ELIXPO_LLM_"}

    # Legacy single-model fallback
    api_url: str = "https://api.moonshot.cn/v1"
    api_key: str = ""
    model: str = "kimi"
    max_context_tokens: int = 128_000
    temperature: float = 0.0


class KimiSettings(BaseSettings):
    model_config = {"env_prefix": "ELIXPO_KIMI_"}

    api_url: str = "https://api.moonshot.cn/v1"
    api_key: str = ""
    model: str = "moonshot-v1-128k"
    max_context_tokens: int = 128_000


class PerplexitySettings(BaseSettings):
    model_config = {"env_prefix": "ELIXPO_PERPLEXITY_"}

    api_url: str = "https://api.perplexity.ai"
    api_key: str = ""
    model: str = "sonar"
    max_context_tokens: int = 128_000


class GitHubSettings(BaseSettings):
    model_config = {"env_prefix": "ELIXPO_GITHUB_"}

    app_id: str = ""
    private_key_path: str = ""
    webhook_secret: str = ""
    bot_username: str = "elixpoo"


class AgentSettings(BaseSettings):
    model_config = {"env_prefix": "ELIXPO_"}

    max_agent_steps: int = 50
    max_tokens_per_session: int = 500_000
    max_concurrent_sessions: int = 5
    session_storage_path: str = "/data/sessions"
    workspace_path: str = "/data/workspaces"
    default_reasoning_effort: str = "medium"  # "low" | "medium" | "high"


class SandboxSettings(BaseSettings):
    model_config = {"env_prefix": "ELIXPO_SANDBOX_"}

    mode: str = "none"  # "none", "nsjail", "docker"
    timeout: int = 120
    memory_limit: str = "512M"


class CloudflareSettings(BaseSettings):
    model_config = {"env_prefix": "ELIXPO_CF_"}

    account_id: str = ""
    d1_database_id: str = "4c028188-932f-4808-81ba-67e67a832be7"
    kv_namespace_id: str = "8e440b0aebbe4961a655915469da98df"
    api_token: str = ""


class Settings(BaseSettings):
    llm: LLMSettings = LLMSettings()
    kimi: KimiSettings = KimiSettings()
    perplexity: PerplexitySettings = PerplexitySettings()
    github: GitHubSettings = GitHubSettings()
    agent: AgentSettings = AgentSettings()
    sandbox: SandboxSettings = SandboxSettings()
    cloudflare: CloudflareSettings = CloudflareSettings()

    api_secret_key: str = "dev-secret-change-me"
    cors_origins: list[str] = ["http://localhost:3000"]
    debug: bool = False

    model_config = {"env_prefix": "ELIXPO_"}

    def build_model_profiles(self) -> dict[str, ModelProfile]:
        """Build model profiles from settings, using Kimi/Perplexity env vars or falling back to LLM defaults."""
        profiles = {}

        # Kimi profile (main workhorse for tool calls)
        kimi_key = self.kimi.api_key or self.llm.api_key
        if kimi_key:
            profiles["kimi"] = ModelProfile(
                name="kimi",
                api_url=self.kimi.api_url,
                api_key=kimi_key,
                model=self.kimi.model,
                max_context_tokens=self.kimi.max_context_tokens,
                supports_tools=True,
                role="general",
            )

        # Perplexity profile (web search/research)
        if self.perplexity.api_key:
            profiles["perplexity"] = ModelProfile(
                name="perplexity",
                api_url=self.perplexity.api_url,
                api_key=self.perplexity.api_key,
                model=self.perplexity.model,
                max_context_tokens=self.perplexity.max_context_tokens,
                supports_tools=False,
                role="research",
            )

        # Fallback: if no kimi profile, use legacy LLM settings
        if "kimi" not in profiles and self.llm.api_key:
            profiles["kimi"] = ModelProfile(
                name="kimi",
                api_url=self.llm.api_url,
                api_key=self.llm.api_key,
                model=self.llm.model,
                max_context_tokens=self.llm.max_context_tokens,
                supports_tools=True,
                role="general",
            )

        return profiles


settings = Settings()
