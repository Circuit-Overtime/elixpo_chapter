"""Agent mode controller — manages PLAN vs EDIT mode switching."""

from __future__ import annotations

import re
from enum import Enum

import structlog

log = structlog.get_logger()


class AgentMode(str, Enum):
    PLAN = "plan"
    EDIT = "edit"


# Keywords that suggest planning/exploration tasks
PLAN_KEYWORDS = {
    "plan", "design", "how", "explore", "investigate", "explain",
    "understand", "analyze", "review", "research", "what", "why",
    "architecture", "approach", "strategy", "propose",
}

# Keywords that suggest direct execution tasks
EDIT_KEYWORDS = {
    "fix", "add", "change", "update", "delete", "remove", "create",
    "implement", "build", "write", "run", "install", "deploy",
    "rename", "move", "refactor", "migrate", "configure",
}

# Read-only tools allowed in PLAN mode
PLAN_TOOLS = {
    "file_read", "grep", "glob", "directory_tree",
    "git_status", "git_diff", "git_log",
    "web_search", "memory_search", "memory_write",
    "shell_exec",  # filtered further by safe command check
    "spawn_sub_agent",  # only research role allowed
}

# All tools allowed in EDIT mode
EDIT_TOOLS = {
    "file_read", "file_write", "file_edit",
    "shell_exec", "grep", "glob", "directory_tree",
    "git_status", "git_diff", "git_log", "git_commit", "git_branch",
    "git_push", "git_clone",
    "web_search", "memory_search", "memory_write",
    "spawn_sub_agent", "task_validate",
}

# Safe bash command prefixes for PLAN mode
SAFE_BASH_PREFIXES = (
    "ls", "cat", "head", "tail", "find", "wc", "echo", "pwd",
    "file", "stat", "du", "df", "which", "type", "env", "printenv",
    "python -c", "python3 -c", "node -e",
    "git status", "git log", "git diff", "git show", "git branch",
    "git remote", "git tag",
    "cargo check", "npm list", "pip list", "pip show",
    "tree", "less", "more", "sort", "uniq", "grep", "rg", "ag",
    "jq", "yq", "curl -s", "wget -q",
)


class ModeController:
    """Controls agent mode transitions and tool permissions."""

    def determine_initial_mode(self, task: str) -> AgentMode:
        """Determine starting mode based on task text."""
        task_lower = task.lower().strip()

        plan_score = sum(1 for kw in PLAN_KEYWORDS if kw in task_lower)
        edit_score = sum(1 for kw in EDIT_KEYWORDS if kw in task_lower)

        if plan_score > edit_score:
            return AgentMode.PLAN
        if edit_score > plan_score:
            return AgentMode.EDIT

        # Default: PLAN for longer/ambiguous tasks, EDIT for short direct ones
        if len(task_lower) > 100:
            return AgentMode.PLAN
        return AgentMode.EDIT

    def get_allowed_tools(self, mode: AgentMode) -> set[str]:
        """Get the set of allowed tool names for the current mode."""
        if mode == AgentMode.EDIT:
            return EDIT_TOOLS
        return PLAN_TOOLS

    def should_transition(self, current_mode: AgentMode, user_message: str) -> AgentMode | None:
        """Check if user message triggers a mode switch. Returns new mode or None."""
        msg = user_message.strip().lower()

        # Explicit commands
        if msg == "/plan":
            return AgentMode.PLAN
        if msg == "/edit":
            return AgentMode.EDIT

        # Approval phrases trigger PLAN → EDIT
        if current_mode == AgentMode.PLAN:
            approval_patterns = [
                r"^(go ahead|approve|proceed|do it|execute|looks good|lgtm|yes|ok|okay|sure)[\s!.]*$",
                r"^(start|begin|make the changes|apply)[\s!.]*$",
            ]
            for pattern in approval_patterns:
                if re.match(pattern, msg):
                    return AgentMode.EDIT

        return None

    def is_safe_bash_command(self, command: str) -> bool:
        """Check if a bash command is safe to run in PLAN mode."""
        cmd = command.strip()
        return any(cmd.startswith(prefix) for prefix in SAFE_BASH_PREFIXES)

    def filter_bash_for_mode(self, command: str, mode: AgentMode) -> tuple[bool, str]:
        """Check if a bash command is allowed in the current mode.

        Returns (allowed, reason).
        """
        if mode == AgentMode.EDIT:
            return True, ""

        if self.is_safe_bash_command(command):
            return True, ""

        return False, (
            f"Command '{command[:50]}...' is not allowed in PLAN mode. "
            "Only read-only commands are permitted. Switch to EDIT mode with /edit to run this."
        )
