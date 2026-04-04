"""
Output summarizer for code agent.

Takes verbose code agent output and generates short, Discord-friendly summaries.
Uses fast models to interpret and summarize.
"""
import asyncio
import logging
import re
from typing import Optional, List
from dataclasses import dataclass

from .models import model_router

logger = logging.getLogger(__name__)


@dataclass
class OutputSummary:
    short_status: str
    actions_taken: List[str]
    current_activity: str
    files_mentioned: List[str]
    errors_found: List[str]
    is_complete: bool


class OutputSummarizer:
    PATTERNS = {
        "read_file": r"(?:Reading|Read|Examining)\s+[`']?([^`'\n]+)[`']?",
        "edit_file": r"(?:Editing|Edited|Modified|Modifying)\s+[`']?([^`'\n]+)[`']?",
        "write_file": r"(?:Writing|Wrote|Creating|Created)\s+[`']?([^`'\n]+)[`']?",
        "run_command": r"(?:Running|Ran|Executing)\s+[`']?([^`'\n]+)[`']?",
        "git_commit": r"(?:Committed|Committing|commit)\s+[`']?([^`'\n]+)[`']?",
        "git_push": r"(?:Pushed|Pushing)\s+to\s+([^\n]+)",
        "create_pr": r"(?:Created|Creating)\s+(?:PR|pull request)[^:]*:\s*(.+)",
        "error": r"(?:Error|ERROR|Failed|FAILED|Exception):\s*(.+)",
        "test_pass": r"(?:Tests? passed|All tests pass|✓)",
        "test_fail": r"(?:Tests? failed|Test failure|✗)",
    }

    def __init__(self, use_ai_summary: bool = True):
        self.use_ai_summary = use_ai_summary

    def extract_quick_summary(self, output: str) -> OutputSummary:
        actions = []
        files = []
        errors = []
        current = ""
        is_complete = False

        for pattern_name, pattern in self.PATTERNS.items():
            matches = re.findall(pattern, output, re.IGNORECASE)
            for match in matches:
                match = match.strip()
                if not match:
                    continue

                if pattern_name == "read_file":
                    actions.append(f"Read {match}")
                    files.append(match)
                elif pattern_name == "edit_file":
                    actions.append(f"Edited {match}")
                    files.append(match)
                elif pattern_name == "write_file":
                    actions.append(f"Created {match}")
                    files.append(match)
                elif pattern_name == "run_command":
                    actions.append(f"Ran: {match[:50]}")
                elif pattern_name == "git_commit":
                    actions.append(f"Committed: {match[:50]}")
                elif pattern_name == "git_push":
                    actions.append(f"Pushed to {match}")
                elif pattern_name == "create_pr":
                    actions.append(f"Created PR: {match[:50]}")
                    is_complete = True
                elif pattern_name == "error":
                    errors.append(match[:100])
                elif pattern_name == "test_pass":
                    actions.append("Tests passed ✓")
                elif pattern_name == "test_fail":
                    errors.append("Tests failed")

        lines = [l.strip() for l in output.split('\n') if l.strip()][-5:]
        for line in reversed(lines):
            if len(line) > 10 and not line.startswith('['):
                current = line[:100]
                break

        if is_complete:
            short_status = "Task completed"
            if actions:
                for action in reversed(actions):
                    if "PR" in action or "Pushed" in action or "Committed" in action:
                        short_status = action
                        break
        elif errors:
            short_status = f"Error: {errors[-1][:50]}"
        elif actions:
            short_status = actions[-1][:50] if actions else "Working..."
        else:
            short_status = "Working..."

        files = list(dict.fromkeys(files))

        return OutputSummary(
            short_status=short_status,
            actions_taken=actions[-10:],
            current_activity=current,
            files_mentioned=files[:20],
            errors_found=errors,
            is_complete=is_complete
        )

    async def summarize_with_ai(
        self,
        output: str,
        task_context: str = "",
        max_length: int = 100
    ) -> str:
        if not self.use_ai_summary:
            summary = self.extract_quick_summary(output)
            return summary.short_status

        prompt = f"""Summarize this AI coding assistant's output in ONE short sentence (max {max_length} chars).
Focus on: what was done, what file was changed, any errors.
Be specific (mention file names, function names if relevant).
Don't say "The assistant" - just state what happened.

Task context: {task_context[:200] if task_context else 'Unknown task'}

Output to summarize:
{output}

One-sentence summary:"""

        try:
            response = await model_router.chat(
                model_id="gemini-large",
                messages=[{"role": "user", "content": prompt}],
                task_type="quick",
                max_tokens=150,
            )

            summary = response.get("content", "").strip()
            summary = summary.replace('"', '').replace("'", "")
            if len(summary) > max_length:
                summary = summary[:max_length-3] + "..."
            return summary or "Working..."

        except Exception as e:
            logger.warning(f"AI summary failed: {e}")
            quick = self.extract_quick_summary(output)
            return quick.short_status

    async def generate_checklist_updates(
        self,
        output: str,
        existing_steps: List[str]
    ) -> List[tuple]:
        summary = self.extract_quick_summary(output)

        updates = []

        step_keywords = {
            "analyze": ["read", "examined", "analyzed", "found"],
            "find": ["found", "located", "identified", "searching"],
            "fix": ["edited", "modified", "fixed", "changed"],
            "test": ["test", "passed", "failed", "running"],
            "commit": ["committed", "commit"],
            "pr": ["pr", "pull request", "pushed"],
        }

        output_lower = output.lower()
        actions_str = " ".join(summary.actions_taken).lower()

        for i, step in enumerate(existing_steps):
            step_lower = step.lower()
            for keyword, indicators in step_keywords.items():
                if keyword in step_lower:
                    if any(ind in actions_str or ind in output_lower for ind in indicators):
                        if summary.is_complete or "completed" in output_lower:
                            updates.append((i, "completed"))
                        else:
                            updates.append((i, "in_progress"))
                        break

        return updates


output_summarizer = OutputSummarizer(use_ai_summary=True)
