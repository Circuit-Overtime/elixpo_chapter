"""Tool registry — registers, resolves, and dispatches MCP tool calls."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import structlog

from elixpo.llm.models import ToolCall, ToolDef
from elixpo.mcp.base import BaseTool, ToolContext, ToolResult

if TYPE_CHECKING:
    from elixpo.agent.mode import AgentMode

log = structlog.get_logger()


class ToolRegistry:
    """Manages all available MCP tools."""

    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        if tool.name in self._tools:
            log.warning("tool.duplicate_registration", name=tool.name)
        self._tools[tool.name] = tool
        log.debug("tool.registered", name=tool.name)

    def get(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    def set_context(self, ctx: ToolContext) -> None:
        """Propagate tool context to all registered tools."""
        for tool in self._tools.values():
            tool.set_context(ctx)

    def list_tool_defs(self, mode: AgentMode | None = None) -> list[ToolDef]:
        """Get OpenAI-compatible tool definitions, optionally filtered by mode."""
        tools = self._tools.values()
        if mode is not None:
            tools = [t for t in tools if mode.value in t.allowed_modes]
        return [tool.to_tool_def() for tool in tools]

    async def execute(self, tool_call: ToolCall, workspace_path: str) -> ToolResult:
        """Execute a tool call and return the result."""
        tool = self._tools.get(tool_call.function.name)
        if tool is None:
            return ToolResult(
                success=False,
                output="",
                error=f"Unknown tool: {tool_call.function.name}",
            )

        try:
            kwargs = json.loads(tool_call.function.arguments)
        except json.JSONDecodeError as e:
            return ToolResult(
                success=False,
                output="",
                error=f"Invalid tool arguments JSON: {e}",
            )

        log.info("tool.execute", name=tool_call.function.name, args_keys=list(kwargs.keys()))

        try:
            result = await tool.execute(workspace_path=workspace_path, **kwargs)
        except Exception as e:
            log.error("tool.execute_error", name=tool_call.function.name, error=str(e))
            result = ToolResult(success=False, output="", error=str(e))

        log.info(
            "tool.result",
            name=tool_call.function.name,
            success=result.success,
            output_length=len(result.output),
        )
        return result


def create_default_registry() -> ToolRegistry:
    """Create a registry with all built-in tools."""
    from elixpo.mcp.tools.file_read import FileReadTool
    from elixpo.mcp.tools.file_write import FileWriteTool
    from elixpo.mcp.tools.file_edit import FileEditTool
    from elixpo.mcp.tools.shell import ShellExecTool
    from elixpo.mcp.tools.grep import GrepTool
    from elixpo.mcp.tools.glob import GlobTool
    from elixpo.mcp.tools.directory_tree import DirectoryTreeTool
    from elixpo.mcp.tools.git import (
        GitStatusTool,
        GitDiffTool,
        GitLogTool,
        GitCommitTool,
        GitBranchTool,
    )
    from elixpo.mcp.tools.github_tools import GitPushTool, GitCloneTool
    from elixpo.mcp.tools.web_search import WebSearchTool
    from elixpo.mcp.tools.task_validate import TaskValidateTool
    from elixpo.mcp.tools.memory_tools import MemoryWriteTool, MemorySearchTool
    from elixpo.mcp.tools.sub_agent_tool import SpawnSubAgentTool

    registry = ToolRegistry()
    for tool_cls in [
        FileReadTool,
        FileWriteTool,
        FileEditTool,
        ShellExecTool,
        GrepTool,
        GlobTool,
        DirectoryTreeTool,
        GitStatusTool,
        GitDiffTool,
        GitLogTool,
        GitCommitTool,
        GitBranchTool,
        GitPushTool,
        GitCloneTool,
        WebSearchTool,
        TaskValidateTool,
        MemoryWriteTool,
        MemorySearchTool,
        SpawnSubAgentTool,
    ]:
        registry.register(tool_cls())
    return registry
