"""Model router — routes LLM requests to Kimi (tools) or Perplexity (research)."""

from __future__ import annotations

from enum import Enum

import structlog

from elixpo.config import ModelProfile, settings
from elixpo.llm.client import LLMClient
from elixpo.llm.models import ChatCompletionResponse, Message, ToolDef

log = structlog.get_logger()


class ModelRole(str, Enum):
    GENERAL = "general"        # Kimi — default for tool calls
    RESEARCH = "research"      # Perplexity — web search
    VALIDATION = "validation"  # Kimi with validation framing


class ReasoningEffort(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Maps reasoning effort to temperature
EFFORT_TEMPERATURE: dict[ReasoningEffort, float] = {
    ReasoningEffort.LOW: 0.1,
    ReasoningEffort.MEDIUM: 0.3,
    ReasoningEffort.HIGH: 0.7,
}

# Maps model roles to profile names
ROLE_TO_PROFILE: dict[ModelRole, str] = {
    ModelRole.GENERAL: "kimi",
    ModelRole.RESEARCH: "perplexity",
    ModelRole.VALIDATION: "kimi",
}


class ModelRouter:
    """Routes LLM requests to the appropriate model based on task role."""

    def __init__(self, profiles: dict[str, ModelProfile]):
        self._profiles = profiles
        self._clients: dict[str, LLMClient] = {}
        for name, profile in profiles.items():
            self._clients[name] = LLMClient(
                api_url=profile.api_url,
                api_key=profile.api_key,
                model=profile.model,
            )
        log.info("router.init", models=list(self._clients.keys()))

    @classmethod
    def from_settings(cls) -> ModelRouter:
        """Create a router from the global settings."""
        return cls(settings.build_model_profiles())

    @classmethod
    def from_keys(
        cls,
        api_key: str,
        api_url: str | None = None,
        model: str | None = None,
        perplexity_key: str | None = None,
    ) -> ModelRouter:
        """Create a router from explicit keys (for CLI usage)."""
        profiles: dict[str, ModelProfile] = {
            "kimi": ModelProfile(
                name="kimi",
                api_url=api_url or settings.kimi.api_url,
                api_key=api_key,
                model=model or settings.kimi.model,
                supports_tools=True,
                role="general",
            ),
        }
        if perplexity_key:
            profiles["perplexity"] = ModelProfile(
                name="perplexity",
                api_url=settings.perplexity.api_url,
                api_key=perplexity_key,
                model=settings.perplexity.model,
                supports_tools=False,
                role="research",
            )
        return cls(profiles)

    def get_client(self, role: ModelRole = ModelRole.GENERAL) -> LLMClient:
        """Get the LLM client for a given role, falling back to kimi."""
        profile_name = ROLE_TO_PROFILE.get(role, "kimi")
        client = self._clients.get(profile_name)
        if client is None:
            # Fallback to first available client
            client = next(iter(self._clients.values()))
        return client

    def has_profile(self, name: str) -> bool:
        return name in self._clients

    async def chat(
        self,
        messages: list[Message],
        tools: list[ToolDef] | None = None,
        role: ModelRole = ModelRole.GENERAL,
        reasoning_effort: ReasoningEffort = ReasoningEffort.MEDIUM,
        max_tokens: int | None = None,
    ) -> ChatCompletionResponse:
        """Send a chat request routed to the appropriate model."""
        client = self.get_client(role)
        temperature = EFFORT_TEMPERATURE[reasoning_effort]

        # Perplexity doesn't support tool calls
        if role == ModelRole.RESEARCH:
            tools = None

        log.debug(
            "router.chat",
            role=role.value,
            effort=reasoning_effort.value,
            temperature=temperature,
            model=client.model,
        )

        return await client.chat(
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def close(self):
        for client in self._clients.values():
            await client.close()
