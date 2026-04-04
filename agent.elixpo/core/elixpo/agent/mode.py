"""Agent mode controller — manages PLAN vs EDIT mode switching."""

from __future__ import annotations

import re
from enum import Enum

import structlog

log = structlog.get_logger()


class AgentMode(str, Enum):
    PLAN = "plan"
    EDIT = "edit"


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
    """Controls agent mode transitions and tool permissions.

    The AI decides mode transitions autonomously:
    - In autonomous mode: the AI auto-transitions PLAN→EDIT when it finishes planning
    - In interactive mode: the AI presents choices and the user picks one
    - User can always override with /plan or /edit commands
    """

    def should_transition(self, current_mode: AgentMode, user_message: str) -> AgentMode | None:
        """Check if a message triggers a mode switch. Returns new mode or None.

        This handles:
        - User explicit commands: /plan, /edit
        - AI-initiated transitions: [SWITCH_TO_EDIT], [SWITCH_TO_PLAN]
        - User approval of AI-presented choices: numbered options, approval phrases
        """
        msg = user_message.strip()
        msg_lower = msg.lower()

        # Explicit user commands
        if msg_lower == "/plan":
            return AgentMode.PLAN
        if msg_lower == "/edit":
            return AgentMode.EDIT

        # AI-initiated auto-transitions (the AI embeds these markers in its output)
        if "[SWITCH_TO_EDIT]" in msg:
            return AgentMode.EDIT
        if "[SWITCH_TO_PLAN]" in msg:
            return AgentMode.PLAN

        # User picked a hard-coded choice from the AI (e.g., "1", "2", "A", "B")
        if current_mode == AgentMode.PLAN:
            # Simple approval — user responds to AI's presented options
            approval_patterns = [
                r"^[1-3]$",  # Numbered choice
                r"^[a-c]$",  # Lettered choice
                r"^(go ahead|approve|proceed|do it|execute|looks good|lgtm|yes|ok|okay|sure)[\s!.]*$",
                r"^(start|begin|make the changes|apply|implement)[\s!.]*$",
            ]
            for pattern in approval_patterns:
                if re.match(pattern, msg_lower):
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
