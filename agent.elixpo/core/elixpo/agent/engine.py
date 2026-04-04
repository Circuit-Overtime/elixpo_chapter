"""Core agent loop — plan/edit modes, multi-model routing, sub-agents."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

import structlog

from elixpo.agent.context import ContextManager
from elixpo.agent.memory import MemoryStore, WorkingMemory
from elixpo.agent.mode import AgentMode, ModeController
from elixpo.agent.prompt import build_system_prompt
from elixpo.agent.session import Session, SessionStatus, SessionStore
from elixpo.agent.workspace import Workspace
from elixpo.config import settings
from elixpo.llm.client import assemble_tool_result
from elixpo.llm.models import Message
from elixpo.llm.router import ModelRouter, ReasoningEffort
from elixpo.mcp.base import ToolContext
from elixpo.mcp.registry import ToolRegistry

log = structlog.get_logger()


class AgentEvent:
    """An event emitted by the agent loop for streaming to clients."""

    def __init__(self, event_type: str, data: dict[str, Any]):
        self.type = event_type
        self.data = data

    def to_dict(self) -> dict:
        return {"type": self.type, **self.data}


class AgentEngine:
    """Runs the agentic loop with plan/edit modes, multi-model routing, and sub-agents.

    Flow:
      1. RECEIVE task (new) or RESUME session (existing)
      2. Determine mode (PLAN or EDIT) based on task or user command
      3. LOOP: think -> tool_calls -> observe -> repeat
      4. In PLAN mode: produce a plan, wait for approval
      5. In EDIT mode: execute changes, validate, complete
    """

    def __init__(
        self,
        router: ModelRouter,
        tools: ToolRegistry,
        session_store: SessionStore,
        memory_store: MemoryStore | None = None,
        context_manager: ContextManager | None = None,
    ):
        self.router = router
        self.tools = tools
        self.session_store = session_store
        self.memory_store = memory_store
        self.mode_controller = ModeController()
        self.context = context_manager or ContextManager(
            max_tokens=settings.llm.max_context_tokens,
        )

    def _determine_reasoning_effort(self, session: Session) -> ReasoningEffort:
        """Determine reasoning effort based on task complexity heuristics."""
        msg_count = len(session.messages)
        step = session.current_step

        # Early steps with few messages: think harder
        if step <= 2 and msg_count < 10:
            return ReasoningEffort.HIGH
        # Many steps in: use lower effort for efficiency
        if step > 20:
            return ReasoningEffort.LOW
        return ReasoningEffort.MEDIUM

    async def run(
        self,
        session: Session,
        task: str,
        workspace_path: str,
    ) -> AsyncIterator[AgentEvent]:
        """Run the agent loop, yielding events as they occur."""
        session.status = SessionStatus.RUNNING
        session.workspace_path = workspace_path
        is_resume = len(session.messages) > 0

        # Set up working memory
        working_memory = WorkingMemory()

        # Check for mode switch commands
        if is_resume:
            new_mode = self.mode_controller.should_transition(session.mode, task)
            if new_mode is not None:
                session.mode = new_mode
                yield AgentEvent("mode_switch", {
                    "mode": session.mode.value,
                    "session_id": session.id,
                })

            session.messages.append(Message(role="user", content=task))
            yield AgentEvent("session_resume", {
                "session_id": session.id,
                "task": task,
                "mode": session.mode.value,
                "prior_steps": session.current_step,
            })
        else:
            # Always start in PLAN mode — the AI decides when to suggest switching
            # Session.mode defaults to PLAN already

            # Load long-term memories for context
            memories = []
            if self.memory_store and session.repo_full_name:
                mems = self.memory_store.read(repo_id=session.repo_full_name, limit=10)
                memories = [m.content for m in mems]

            system_prompt = build_system_prompt(
                task=task,
                repo_name=session.repo_full_name,
                plan=session.plan,
                memories=memories,
                mode=session.mode,
            )
            session.messages.append(Message(role="system", content=system_prompt))
            session.messages.append(Message(role="user", content=task))

            yield AgentEvent("session_start", {
                "session_id": session.id,
                "task": task,
                "mode": session.mode.value,
            })

        # Inject tool context
        tool_context = ToolContext(
            router=self.router,
            workspace=Workspace(session.id, settings.agent.workspace_path),
            working_memory=working_memory,
            memory_store=self.memory_store,
            session=session,
            mode_controller=self.mode_controller,
            current_mode=session.mode,
        )
        self.tools.set_context(tool_context)

        while session.current_step < session.max_steps:
            session.current_step += 1

            # Update context budget with working memory
            self.context.set_working_memory_budget(working_memory.token_budget)

            # Compress context if approaching limit
            if self.context.needs_compression(session.messages):
                old_count = len(session.messages)
                session.messages = self.context.compress(session.messages)
                yield AgentEvent("context_compressed", {
                    "step": session.current_step,
                    "messages_before": old_count,
                    "messages_after": len(session.messages),
                })

            yield AgentEvent("thinking", {
                "step": session.current_step,
                "mode": session.mode.value,
            })

            # Get tool defs filtered by current mode
            tool_defs = self.tools.list_tool_defs(mode=session.mode)

            # Determine reasoning effort
            effort = self._determine_reasoning_effort(session)

            # Call LLM via router
            try:
                response = await self.router.chat(
                    messages=session.messages,
                    tools=tool_defs,
                    reasoning_effort=effort,
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

            # Check if AI requested a mode transition via marker
            if assistant_msg.content:
                ai_transition = self.mode_controller.should_transition(
                    session.mode, assistant_msg.content
                )
                if ai_transition is not None and ai_transition != session.mode:
                    old_mode = session.mode
                    session.mode = ai_transition
                    tool_context.current_mode = session.mode
                    yield AgentEvent("mode_switch", {
                        "from": old_mode.value,
                        "to": session.mode.value,
                        "session_id": session.id,
                        "triggered_by": "ai",
                    })
                    # Refresh tool defs for next iteration
                    tool_defs = self.tools.list_tool_defs(mode=session.mode)

            # Handle plan output in PLAN mode
            if assistant_msg.content and session.mode == AgentMode.PLAN and session.plan is None:
                session.plan = assistant_msg.content
                yield AgentEvent("plan", {
                    "content": assistant_msg.content,
                    "step": session.current_step,
                    "mode": "plan",
                })
            elif assistant_msg.content:
                yield AgentEvent("assistant_message", {
                    "content": assistant_msg.content,
                    "step": session.current_step,
                    "mode": session.mode.value,
                })

            # Execute tool calls if present
            if assistant_msg.tool_calls:
                # Update mode in tool context before executing
                tool_context.current_mode = session.mode

                for tool_call in assistant_msg.tool_calls:
                    yield AgentEvent("tool_call", {
                        "tool": tool_call.function.name,
                        "arguments": tool_call.function.arguments,
                        "step": session.current_step,
                        "mode": session.mode.value,
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

            # No tool calls + stop = agent is done (or waiting for approval in PLAN mode)
            elif choice.finish_reason == "stop":
                if session.mode == AgentMode.PLAN:
                    # Plan mode complete — waiting for user approval
                    yield AgentEvent("plan_ready", {
                        "session_id": session.id,
                        "message": "Plan is ready. Send 'approve' or '/edit' to start execution, or provide feedback.",
                    })
                    break
                else:
                    # Edit mode complete
                    session.status = SessionStatus.COMPLETED
                    session.completed_at = time.time()

                    # Release working memory
                    working_memory.release_all()

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
            "mode": session.mode.value,
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

        # Check for mode transition
        new_mode = self.mode_controller.should_transition(session.mode, follow_up)
        if new_mode is not None:
            old_mode = session.mode
            session.mode = new_mode
            yield AgentEvent("mode_switch", {
                "from": old_mode.value,
                "to": new_mode.value,
                "session_id": session.id,
            })

            # If transitioning from PLAN to EDIT with approval, inject plan context
            if old_mode == AgentMode.PLAN and new_mode == AgentMode.EDIT and session.plan:
                # Rebuild system prompt for EDIT mode with the plan
                system_prompt = build_system_prompt(
                    task=None,
                    repo_name=session.repo_full_name,
                    plan=session.plan,
                    mode=AgentMode.EDIT,
                )
                # Replace system message
                if session.messages and session.messages[0].role == "system":
                    session.messages[0] = Message(role="system", content=system_prompt)

                follow_up = f"The plan has been approved. Execute it now.\n\nPlan:\n{session.plan}"

        # Reset status for continuation
        session.status = SessionStatus.RUNNING
        session.completed_at = None

        workspace = workspace_path or session.workspace_path
        async for event in self.run(session, task=follow_up, workspace_path=workspace):
            yield event
