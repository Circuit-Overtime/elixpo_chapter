"""MCP Tool: Spawn a sub-agent for specialized tasks."""

from __future__ import annotations

from elixpo.mcp.base import BaseTool, ToolResult


class SpawnSubAgentTool(BaseTool):
    name = "spawn_sub_agent"
    description = (
        "Spawn a sub-agent for a specialized task. "
        "Roles: 'research' (web search via Perplexity — available in plan/edit mode), "
        "'validation' (run tests, verify output — edit mode only), "
        "'worker' (general sub-task execution — edit mode only). "
        "The sub-agent runs autonomously and returns a summary."
    )
    parameters = {
        "type": "object",
        "properties": {
            "role": {
                "type": "string",
                "enum": ["research", "validation", "worker"],
                "description": "The sub-agent role.",
            },
            "task": {
                "type": "string",
                "description": "The task for the sub-agent to accomplish.",
            },
            "max_steps": {
                "type": "integer",
                "description": "Maximum steps the sub-agent can take (default: 15).",
            },
        },
        "required": ["role", "task"],
    }
    # Available in both modes, but role restrictions are enforced in execute
    allowed_modes = {"plan", "edit"}

    async def execute(self, workspace_path: str, **kwargs) -> ToolResult:
        role = kwargs["role"]
        task = kwargs["task"]
        max_steps = kwargs.get("max_steps", 15)

        if not self._context:
            return ToolResult(success=False, output="", error="No tool context available.")

        # Enforce mode restrictions
        mode = self._context.current_mode
        if mode and mode.value == "plan" and role != "research":
            return ToolResult(
                success=False,
                output="",
                error=f"Sub-agent role '{role}' is not allowed in PLAN mode. Only 'research' is available.",
            )

        if not self._context.router:
            return ToolResult(success=False, output="", error="No router available.")

        try:
            from elixpo.agent.sub_agent import SubAgent, SubAgentConfig, SubAgentRole

            config = SubAgentConfig(
                role=SubAgentRole(role),
                task=task,
                max_steps=max_steps,
            )
            sub = SubAgent(
                config=config,
                router=self._context.router,
                tools=None,  # SubAgent creates its own tool set based on role
                workspace_path=workspace_path,
            )
            result = await sub.run()

            output = f"Sub-agent ({role}) completed.\n"
            output += f"Success: {result.success}\n"
            output += f"Steps: {result.steps_taken}\n"
            output += f"Summary:\n{result.summary}"
            if result.details:
                output += f"\n\nDetails:\n{result.details}"

            return ToolResult(success=result.success, output=output)

        except Exception as e:
            return ToolResult(success=False, output="", error=f"Sub-agent failed: {e}")
