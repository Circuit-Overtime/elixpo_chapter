"""MCP Tools: Long-term memory read/write."""

from __future__ import annotations

from elixpo.data.models import Memory
from elixpo.mcp.base import BaseTool, ToolResult


class MemoryWriteTool(BaseTool):
    name = "memory_write"
    description = (
        "Store a memory for future sessions. Use this to save important context, "
        "patterns, decisions, or codebase facts that should persist across sessions."
    )
    parameters = {
        "type": "object",
        "properties": {
            "content": {
                "type": "string",
                "description": "The memory content to store.",
            },
            "category": {
                "type": "string",
                "enum": ["pattern", "decision", "preference", "codebase_fact"],
                "description": "Category of the memory.",
            },
            "repo_id": {
                "type": "string",
                "description": "Repository identifier (optional, for repo-specific memories).",
            },
        },
        "required": ["content", "category"],
    }
    allowed_modes = {"plan", "edit"}

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        if not self._context or not self._context.memory_store:
            return ToolResult(success=False, output="", error="Memory store not available.")

        content = kwargs["content"]
        category = kwargs["category"]
        repo_id = kwargs.get("repo_id")
        session_id = self._context.session.id if self._context.session else None

        memory = Memory(
            content=content,
            category=category,
            repo_id=repo_id,
            source_session_id=session_id,
        )
        self._context.memory_store.write(memory)
        return ToolResult(success=True, output=f"Memory saved: [{category}] {content[:100]}...")


class MemorySearchTool(BaseTool):
    name = "memory_search"
    description = (
        "Search long-term memory for relevant context from previous sessions. "
        "Use this to recall decisions, patterns, or facts about the codebase."
    )
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query.",
            },
            "repo_id": {
                "type": "string",
                "description": "Repository identifier (optional).",
            },
            "category": {
                "type": "string",
                "enum": ["pattern", "decision", "preference", "codebase_fact"],
                "description": "Filter by category (optional).",
            },
        },
        "required": ["query"],
    }
    allowed_modes = {"plan", "edit"}

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        if not self._context or not self._context.memory_store:
            return ToolResult(success=False, output="", error="Memory store not available.")

        query = kwargs["query"]
        repo_id = kwargs.get("repo_id")

        results = self._context.memory_store.search(query=query, repo_id=repo_id, limit=10)

        if not results:
            return ToolResult(success=True, output="No matching memories found.")

        output_parts = [f"Found {len(results)} memories:"]
        for mem in results:
            output_parts.append(f"\n[{mem.category}] (relevance: {mem.relevance_score:.2f})")
            output_parts.append(f"  {mem.content}")

        return ToolResult(success=True, output="\n".join(output_parts))
