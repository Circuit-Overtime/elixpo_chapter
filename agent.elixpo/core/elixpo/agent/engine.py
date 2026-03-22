"""Core agent loop — plan, think, act, observe with multi-turn support."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

import structlog

from elixpo.agent.context import ContextManager
from elixpo.agent.prompt import build_system_prompt
from elixpo.agent.session import Session, SessionStatus, SessionStore
from elixpo.config import settings
from elixpo.llm.client import LLMClient, assemble_tool_result
from elixpo.llm.models import Message
from elixpo.mcp.registry import ToolRegistry

log = structlog.get_logger()

PLANNING_PROMPT = """Before executing, create a step-by-step plan for this task.
Output your plan as a numbered list. Be specific about which files to read/edit
and what changes to make. After planning, begin execution immediately."""


class AgentEvent:
    """An event emitted by the agent loop for streaming to clients."""

    def __init__(self, event_type: str, data: dict[str, Any]):
        self.type = event_type
        self.data = data

    def to_dict(self) -> dict:
        return {"type": self.type, **self.data}


class AgentEngine:
    """Runs the agentic loop with planning, multi-turn, and resume support.

    Flow:
      1. RECEIVE task (new) or RESUME session (existing)
      2. PLAN: ask LLM to decompose the task
      3. LOOP: think -> tool_calls -> observe -> repeat
      4. COMPLETE: final answer, persist everything
    """

    def __init__(
        self,
        llm: LLMClient,
        tools: ToolRegistry,
        session_store: SessionStore,
        context_manager: ContextManager | None = None,
    ):
        self.llm = llm
        self.tools = tools
        self.session_store = session_store
        self.context = context_manager or ContextManager(
            max_tokens=settings.llm.max_context_tokens,
        )

    async def run(
        self,
        session: Session,
        task: str,
        workspace_path: str,
    ) -> AsyncIterator[AgentEvent]:
        """Run the agent loop, yielding events as they occur.

        If the session already has messages (resume), continues from where it left off.
        """
        session.status = SessionStatus.RUNNING
        session.workspace_path = workspace_path
        is_resume = len(session.messages) > 0

        if is_resume:
            # Resuming — inject the new follow-up as a user message
            session.messages.append(Message(role="user", content=task))
            yield AgentEvent("session_resume", {
                "session_id": session.id,
                "task": task,
                "prior_steps": session.current_step,
            })
        else:
            # New session — build system prompt and inject planning instruction
            system_prompt = build_system_prompt(
                task=task,
                repo_name=session.repo_full_name,
                plan=session.plan,
            )
            session.messages.append(Message(role="system", content=system_prompt))
            session.messages.append(Message(
                role="user",
                content=f"{task}\n\n{PLANNING_PROMPT}",
            ))
            yield AgentEvent("session_start", {"session_id": session.id, "task": task})

        tool_defs = self.tools.list_tool_defs()

        while session.current_step < session.max_steps:
            session.current_step += 1

            # Compress context if approaching limit
            if self.context.needs_compression(session.messages):
                old_count = len(session.messages)
                session.messages = self.context.compress(session.messages)
                yield AgentEvent("context_compressed", {
                    "step": session.current_step,
                    "messages_before": old_count,
                    "messages_after": len(session.messages),
                })

            yield AgentEvent("thinking", {"step": session.current_step})

            # Call LLM
            try:
                response = await self.llm.chat(
                    messages=session.messages,
                    tools=tool_defs,
                )
            except Exception as e:
                log.error("agent.llm_error", error=str(e), step=session.current_step)
                session.status = SessionStatus.FAILED
                yield AgentEvent("error", {"error": str(e)})
                break

            # Track token usage
            if response.usage:
                session.token_usage.prompt_tokens += response.usage.prompt_tokens
                session.token_usage.completion_tokens += response.usage.completion_tokens
                session.token_usage.total_tokens += response.usage.total_tokens

            choice = response.choices[0] if response.choices else None
            if not choice:
                session.status = SessionStatus.FAILED
                yield AgentEvent("error", {"error": "No response from LLM"})
                break

            assistant_msg = choice.message
            session.messages.append(assistant_msg)

            # Extract plan from the first response if we don't have one yet
            if assistant_msg.content and session.plan is None and not is_resume:
                session.plan = assistant_msg.content
                yield AgentEvent("plan", {
                    "content": assistant_msg.content,
                    "step": session.current_step,
                })
            elif assistant_msg.content:
                yield AgentEvent("assistant_message", {
                    "content": assistant_msg.content,
                    "step": session.current_step,
                })

            # Execute tool calls if present
            if assistant_msg.tool_calls:
                for tool_call in assistant_msg.tool_calls:
                    yield AgentEvent("tool_call", {
                        "tool": tool_call.function.name,
                        "arguments": tool_call.function.arguments,
                        "step": session.current_step,
                    })

                    result = await self.tools.execute(tool_call, workspace_path)

                    yield AgentEvent("tool_result", {
                        "tool": tool_call.function.name,
                        "success": result.success,
                        "output_preview": result.output[:500] if result.output else "",
                        "error": result.error,
                        "step": session.current_step,
                    })

                    tool_msg = assemble_tool_result(
                        tool_call_id=tool_call.id,
                        content=result.output if result.success else f"ERROR: {result.error}",
                    )
                    session.messages.append(tool_msg)

            # No tool calls + stop = agent is done
            elif choice.finish_reason == "stop":
                session.status = SessionStatus.COMPLETED
                session.completed_at = time.time()
                yield AgentEvent("session_complete", {
                    "session_id": session.id,
                    "steps": session.current_step,
                    "token_usage": session.token_usage.model_dump(),
                })
                break

            # Token budget check
            if session.token_usage.total_tokens >= settings.agent.max_tokens_per_session:
                log.warning("agent.token_budget_exceeded", session_id=session.id)
                session.status = SessionStatus.FAILED
                yield AgentEvent("error", {"error": "Token budget exceeded"})
                break

            # Persist after each step
            self.session_store.save(session)

        else:
            session.status = SessionStatus.FAILED
            yield AgentEvent("error", {"error": f"Max steps ({session.max_steps}) reached"})

        # Final persist
        self.session_store.save(session)
        yield AgentEvent("session_end", {
            "session_id": session.id,
            "status": session.status.value,
        })

    async def resume(
        self,
        session_id: str,
        follow_up: str,
        workspace_path: str | None = None,
    ) -> AsyncIterator[AgentEvent]:
        """Resume an existing session with a follow-up message."""
        session = self.session_store.load(session_id)
        if session is None:
            yield AgentEvent("error", {"error": f"Session {session_id} not found"})
            return

        # Reset status for continuation
        session.status = SessionStatus.RUNNING
        session.completed_at = None

        workspace = workspace_path or session.workspace_path
        async for event in self.run(session, task=follow_up, workspace_path=workspace):
            yield event
