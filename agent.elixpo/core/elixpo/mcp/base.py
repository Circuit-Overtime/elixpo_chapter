"""Base interface for all MCP tools."""

from __future__ import annotations

import abc
from typing import Any

from pydantic import BaseModel

from elixpo.llm.models import ToolDef, FunctionDef


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

    @abc.abstractmethod
    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        """Execute the tool in the given workspace context.

        Args:
            workspace_path: Absolute path to the current working directory/repo.
            **kwargs: Tool-specific arguments matching `self.parameters`.

        Returns:
            ToolResult with output or error.
        """
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
