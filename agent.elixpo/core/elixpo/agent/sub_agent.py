"""Sub-agent system — lightweight agents for specialized tasks."""

from __future__ import annotations

from enum import Enum
from typing import Any

import structlog
from pydantic import BaseModel

from elixpo.llm.models import Message
from elixpo.llm.router import ModelRole, ModelRouter, ReasoningEffort

log = structlog.get_logger()


class SubAgentRole(str, Enum):
    RESEARCH = "research"      # Uses Perplexity, no tools
    VALIDATION = "validation"  # Uses Kimi + shell/test tools only
    WORKER = "worker"          # Uses Kimi + all tools


class SubAgentConfig(BaseModel):
    role: SubAgentRole
    task: str
    max_steps: int = 15


class SubAgentResult(BaseModel):
    role: str
    summary: str
    success: bool
    details: str = ""
    steps_taken: int = 0


# System prompts per role
RESEARCH_PROMPT = """You are a research assistant. Answer the question using your knowledge.
Be concise and factual. Include sources or references when possible.
Do NOT use any tools — just provide your answer directly."""

VALIDATION_PROMPT = """You are a validation agent. Your job is to verify that changes are correct.
Run the appropriate tests, linting, or build commands.
Report: what passed, what failed, and any issues found.
Be concise and structured in your output."""

WORKER_PROMPT = """You are a worker agent handling a sub-task.
Complete the assigned task using the available tools.
Be efficient — take the minimal steps needed.
When done, summarize what you did."""


class SubAgent:
    """A lightweight agent that runs a focused sub-task and reports back."""

    def __init__(
        self,
        config: SubAgentConfig,
        router: ModelRouter,
        tools: Any | None,
        workspace_path: str,
    ):
        self.config = config
        self.router = router
        self.workspace_path = workspace_path
        self.messages: list[Message] = []

        # Set up tools based on role
        if config.role == SubAgentRole.RESEARCH:
            self._tools = None
            self._model_role = ModelRole.RESEARCH
        elif config.role == SubAgentRole.VALIDATION:
            self._tools = self._create_validation_tools()
            self._model_role = ModelRole.VALIDATION
        else:
            self._tools = tools or self._create_worker_tools()
            self._model_role = ModelRole.GENERAL

    def _create_validation_tools(self):
        """Create a minimal tool registry for validation."""
        from elixpo.mcp.registry import ToolRegistry
        from elixpo.mcp.tools.shell import ShellExecTool
        from elixpo.mcp.tools.file_read import FileReadTool
        from elixpo.mcp.tools.grep import GrepTool
        from elixpo.mcp.tools.task_validate import TaskValidateTool

        registry = ToolRegistry()
        for cls in [ShellExecTool, FileReadTool, GrepTool, TaskValidateTool]:
            registry.register(cls())
        return registry

    def _create_worker_tools(self):
        """Create a full tool registry for worker agents."""
        from elixpo.mcp.registry import create_default_registry
        return create_default_registry()

    async def run(self) -> SubAgentResult:
        """Run the sub-agent loop to completion."""
        # Build system prompt based on role
        prompts = {
            SubAgentRole.RESEARCH: RESEARCH_PROMPT,
            SubAgentRole.VALIDATION: VALIDATION_PROMPT,
            SubAgentRole.WORKER: WORKER_PROMPT,
        }
        system_prompt = prompts[self.config.role]

        self.messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=self.config.task),
        ]

        tool_defs = self._tools.list_tool_defs() if self._tools else None
        steps = 0

        for _ in range(self.config.max_steps):
            steps += 1

            try:
                response = await self.router.chat(
                    messages=self.messages,
                    tools=tool_defs,
                    role=self._model_role,
                    reasoning_effort=ReasoningEffort.LOW,
                )
            except Exception as e:
                log.error("sub_agent.llm_error", role=self.config.role, error=str(e))
                return SubAgentResult(
                    role=self.config.role,
                    summary=f"Failed: {e}",
                    success=False,
                    steps_taken=steps,
                )

            choice = response.choices[0] if response.choices else None
            if not choice:
                return SubAgentResult(
                    role=self.config.role,
                    summary="No response from LLM.",
                    success=False,
                    steps_taken=steps,
                )

            assistant_msg = choice.message
            self.messages.append(assistant_msg)

            # Handle tool calls
            if assistant_msg.tool_calls and self._tools:
                from elixpo.llm.client import assemble_tool_result

                for tc in assistant_msg.tool_calls:
                    result = await self._tools.execute(tc, self.workspace_path)
                    tool_msg = assemble_tool_result(
                        tool_call_id=tc.id,
                        content=result.output if result.success else f"ERROR: {result.error}",
                    )
                    self.messages.append(tool_msg)

            # No tool calls + stop = done
            elif choice.finish_reason == "stop":
                summary = assistant_msg.content or "Task completed."
                return SubAgentResult(
                    role=self.config.role,
                    summary=summary,
                    success=True,
                    steps_taken=steps,
                )

        # Max steps reached
        last_content = ""
        for msg in reversed(self.messages):
            if msg.role == "assistant" and msg.content:
                last_content = msg.content
                break

        return SubAgentResult(
            role=self.config.role,
            summary=last_content or "Max steps reached without completion.",
            success=False,
            details=f"Reached max {self.config.max_steps} steps.",
            steps_taken=steps,
        )
