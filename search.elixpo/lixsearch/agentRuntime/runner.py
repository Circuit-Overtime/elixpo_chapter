"""OreoFlow adapter for skill-scoped lixSearch agents."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import os
from pathlib import Path
import sys
from typing import Any

import yaml

from agentRuntime.routing import route_request
from commons.environment import load_local_environment
from agentRuntime.specs import AGENT_SPECS, AgentSpec
from skillRegistry import SkillRegistry, get_skill_registry

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OREOFLOW_ROOT = ROOT.parent / "agent.elixpo"


class AgentRuntimeError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class PreparedRun:
    agent: str
    role: str
    model: str
    skills: tuple[str, ...]
    messages: tuple[dict[str, str], ...]
    tools: tuple[dict[str, Any], ...]
    max_tokens: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class AgentRunner:
    def __init__(
        self,
        *,
        registry: SkillRegistry | None = None,
        models_path: str | Path | None = None,
    ) -> None:
        self.registry = registry or get_skill_registry()
        configured = os.getenv("OREOFLOW_MODELS_CONFIG")
        self.models_path = Path(models_path or configured or DEFAULT_OREOFLOW_ROOT / "config" / "models.yaml")
        if not self.models_path.is_file():
            raise AgentRuntimeError(f"OreoFlow models config not found: {self.models_path}")
        self.models = yaml.safe_load(self.models_path.read_text(encoding="utf-8"))

    def prepare(self, agent_name: str, prompt: str) -> PreparedRun:
        if agent_name == "auto":
            agent_name = route_request(prompt)
        try:
            spec = AGENT_SPECS[agent_name]
        except KeyError as exc:
            raise AgentRuntimeError(f"Unknown agent '{agent_name}'") from exc
        model_spec = self.models.get("roles", {}).get(spec.role)
        if not model_spec or not model_spec.get("model"):
            raise AgentRuntimeError(f"OreoFlow role '{spec.role}' has no model")
        resolved = self.registry.resolve(spec.skills)
        skill_text = "\n\n".join(skill.instructions for skill in resolved)
        system = f"{spec.system_prompt}\n\n{skill_text}".strip()
        tools = self.registry.tool_catalog(spec.skills)
        return PreparedRun(
            agent=spec.name,
            role=spec.role,
            model=model_spec["model"],
            skills=tuple(skill.name for skill in resolved),
            messages=(
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ),
            tools=tools,
            max_tokens=spec.max_tokens,
        )

    async def run(self, agent_name: str, prompt: str) -> dict[str, Any]:
        prepared = self.prepare(agent_name, prompt)
        if prepared.agent == "decision":
            decision = await self._call(prepared)
            selected = _parse_decision(decision)
            return await self._call(self.prepare(selected, prompt))
        return await self._call(prepared)

    async def _call(self, prepared: PreparedRun) -> dict[str, Any]:
        Router, Message, ToolDef = _oreoflow_types()
        load_local_environment()
        api_key = os.getenv("POLLINATIONS_API_KEY")
        if not api_key:
            raise AgentRuntimeError("Set POLLINATIONS_API_KEY in .env.local before a live agent run")
        router = Router(
            task_id=f"lixsearch-{prepared.agent}",
            models=self.models,
            api_key=api_key,
        )
        try:
            response = await router.call(
                prepared.role,
                [Message.model_validate(message) for message in prepared.messages],
                tools=[ToolDef.model_validate(tool) for tool in prepared.tools] or None,
                effort="low",
                max_tokens=prepared.max_tokens,
                tool_choice="auto" if prepared.tools else None,
            )
            return {
                "agent": prepared.agent,
                "role": prepared.role,
                "model": prepared.model,
                "response": response.model_dump(mode="json"),
            }
        finally:
            await router.aclose()


def _oreoflow_types():
    oreoflow_root = Path(os.getenv("OREOFLOW_ROOT", DEFAULT_OREOFLOW_ROOT)).resolve()
    if str(oreoflow_root) not in sys.path:
        sys.path.insert(0, str(oreoflow_root))
    try:
        from rtk.models import Message, ToolDef
        from rtk.router import Router
    except ImportError as exc:
        raise AgentRuntimeError(f"Unable to import OreoFlow from {oreoflow_root}: {exc}") from exc
    return Router, Message, ToolDef


def _parse_decision(result: dict[str, Any]) -> str:
    try:
        content = result["response"]["choices"][0]["message"]["content"]
        payload = json.loads(content)
        selected = payload["agent"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise AgentRuntimeError("Decision agent returned invalid JSON") from exc
    if selected not in AGENT_SPECS or selected == "decision":
        raise AgentRuntimeError(f"Decision agent returned unknown specialist '{selected}'")
    return selected
