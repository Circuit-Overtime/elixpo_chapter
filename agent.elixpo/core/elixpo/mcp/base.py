"""Base interface for all MCP tools."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

from elixpo.llm.models import ToolDef, FunctionDef

if TYPE_CHECKING:
    from elixpo.agent.memory import MemoryStore, WorkingMemory
    from elixpo.agent.mode import AgentMode, ModeController
    from elixpo.agent.session import Session
    from elixpo.agent.workspace import Workspace
    from elixpo.llm.router import ModelRouter


@dataclass
class ToolContext:
    """Shared context passed to tools that need access to engine internals."""
    router: ModelRouter | None = None
    workspace: Workspace | None = None
    working_memory: WorkingMemory | None = None
    memory_store: MemoryStore | None = None
    session: Session | None = None
    mode_controller: ModeController | None = None
    current_mode: AgentMode | None = None


class ToolResult(BaseModel):
    """Result returned by a tool execution."""
    success: bool
    output: str
    error: str | None = None


class BaseTool(abc.ABC):
    """Abstract base class for MCP tools.

    Subclasses must define:
      - name: unique tool identifier
      - description: what the tool does (shown to the LLM)
      - parameters: JSON Schema dict for the tool's arguments
      - execute(): run the tool with given arguments
    """

    name: str
    description: str
    parameters: dict[str, Any]
    _context: ToolContext | None = None

    # Tool mode permissions: "all" means available in both modes
    # Override in subclass to restrict: e.g., allowed_modes = {"edit"}
    allowed_modes: set[str] = {"plan", "edit"}

    def set_context(self, ctx: ToolContext) -> None:
        """Set the shared tool context (injected by the engine)."""
        self._context = ctx

    @abc.abstractmethod
    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        """Execute the tool in the given workspace context."""
        ...

    def to_tool_def(self) -> ToolDef:
        """Convert to OpenAI-compatible tool definition."""
        return ToolDef(
            function=FunctionDef(
                name=self.name,
                description=self.description,
                parameters=self.parameters,
            )
        )
