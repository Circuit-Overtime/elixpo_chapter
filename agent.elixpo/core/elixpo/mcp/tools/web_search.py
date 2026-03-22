"""MCP Tool: Web search via Perplexity."""

from __future__ import annotations

from elixpo.mcp.base import BaseTool, ToolResult
from elixpo.llm.models import Message


class WebSearchTool(BaseTool):
    name = "web_search"
    description = (
        "Search the web for information using Perplexity AI. "
        "Use this for documentation lookups, API references, error messages, "
        "or any question that requires up-to-date internet knowledge."
    )
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query.",
            },
        },
        "required": ["query"],
    }
    allowed_modes = {"plan", "edit"}

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        query = kwargs["query"]

        if not self._context or not self._context.router:
            return ToolResult(success=False, output="", error="No router available for web search.")

        from elixpo.llm.router import ModelRole

        if not self._context.router.has_profile("perplexity"):
            return ToolResult(
                success=False,
                output="",
                error="Perplexity API key not configured. Set ELIXPO_PERPLEXITY_API_KEY.",
            )

        try:
            messages = [
                Message(role="system", content="You are a helpful research assistant. Provide concise, accurate answers with sources when possible."),
                Message(role="user", content=query),
            ]
            response = await self._context.router.chat(
                messages=messages,
                role=ModelRole.RESEARCH,
            )
            if response.choices:
                answer = response.choices[0].message.content or "No answer returned."
                return ToolResult(success=True, output=answer)
            return ToolResult(success=False, output="", error="No response from Perplexity.")
        except Exception as e:
            return ToolResult(success=False, output="", error=f"Web search failed: {e}")
