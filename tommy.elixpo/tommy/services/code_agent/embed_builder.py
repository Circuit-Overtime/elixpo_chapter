"""
Discord embed builder for code task progress updates.

Creates a single embed that updates in real-time with:
- Task header (issue title, PR title, etc.)
- Checklist of steps (✅ 🔄 ⬜)
- Current status message
- Footer with elapsed time
"""
import asyncio
import discord
from discord.ui import View
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class StepStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TodoItem:
    content: str
    status: StepStatus = StepStatus.PENDING

    def to_string(self) -> str:
        emoji_map = {
            StepStatus.PENDING: "☐",
            StepStatus.IN_PROGRESS: "◉",
            StepStatus.COMPLETED: "✓",
            StepStatus.FAILED: "✗",
        }
        emoji = emoji_map.get(self.status, "☐")
        return f"{emoji} {self.content}"


@dataclass
class ProgressEmbed:
    current_action: str = "Working..."
    todos: List[TodoItem] = field(default_factory=list)
    started_at: datetime = field(default_factory=datetime.utcnow)
    color: int = 0x5865F2

    is_complete: bool = False
    is_failed: bool = False

    sub_action: str = ""
    files_changed: List[str] = field(default_factory=list)
    branch_name: str = ""
    base_branch: str = "main"
    queue_position: int = 0

    title: str = ""
    description: str = ""
    status_message: str = ""
    issue_url: Optional[str] = None
    pr_url: Optional[str] = None
    repo_url: Optional[str] = None

    @property
    def steps(self) -> List[TodoItem]:
        return self.todos

    def add_todo(self, content: str) -> int:
        self.todos.append(TodoItem(content=content))
        return len(self.todos) - 1

    def add_step(self, name: str, details: Optional[str] = None) -> int:
        return self.add_todo(name)

    def start_todo(self, index: int):
        if 0 <= index < len(self.todos):
            self.todos[index].status = StepStatus.IN_PROGRESS
            self.current_action = self.todos[index].content

    def start_step(self, index: int, details: Optional[str] = None):
        self.start_todo(index)

    def complete_todo(self, index: int):
        if 0 <= index < len(self.todos):
            self.todos[index].status = StepStatus.COMPLETED

    def complete_step(self, index: int, details: Optional[str] = None):
        self.complete_todo(index)

    def fail_todo(self, index: int):
        if 0 <= index < len(self.todos):
            self.todos[index].status = StepStatus.FAILED

    def fail_step(self, index: int, details: Optional[str] = None):
        self.fail_todo(index)

    def skip_step(self, index: int, details: Optional[str] = None):
        self.complete_todo(index)

    def set_action(self, action: str):
        self.current_action = action
        self.sub_action = ""

    def set_sub_action(self, sub_action: str):
        self.sub_action = sub_action

    def set_status(self, message: str):
        self.current_action = message

    def add_file(self, file_path: str):
        if file_path and file_path not in self.files_changed:
            self.files_changed.append(file_path)

    def set_files(self, files: List[str]):
        self.files_changed = list(files) if files else []

    def set_branch(self, branch_name: str, base_branch: str = "main"):
        self.branch_name = branch_name
        self.base_branch = base_branch

    def set_queue_position(self, position: int):
        self.queue_position = position

    def mark_complete(self, success: bool = True):
        self.is_complete = True
        self.is_failed = not success
        self.color = 0x57F287 if success else 0xED4245

    def elapsed_time(self) -> str:
        seconds = int((datetime.utcnow() - self.started_at).total_seconds())
        if seconds < 60:
            return f"{seconds}s"
        minutes = seconds // 60
        secs = seconds % 60
        if minutes < 60:
            return f"{minutes}m {secs}s"
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours}h {mins}m"

    def _get_title(self) -> str:
        if self.is_complete:
            emoji = "✓" if not self.is_failed else "✗"
            status = "Done" if not self.is_failed else "Failed"
            return f"{emoji} {status}"
        else:
            return f"✻ {self.current_action}…"

    def build(self) -> discord.Embed:
        embed = discord.Embed(
            title=self._get_title(),
            color=self.color,
        )

        sections = []

        if self.queue_position > 0:
            sections.append(f"⏳ **Queue position:** #{self.queue_position}")
            sections.append("")

        if self.todos:
            todo_lines = []
            for i, todo in enumerate(self.todos):
                todo_lines.append(todo.to_string())
                if todo.status == StepStatus.IN_PROGRESS and self.sub_action:
                    todo_lines.append(f"   └─ {self.sub_action}")
            sections.append("\n".join(todo_lines))

        if self.files_changed:
            sections.append("")
            file_count = len(self.files_changed)
            sections.append(f"📁 **Files** ({file_count})")
            for f in self.files_changed[:8]:
                display_path = f if len(f) < 40 else "…" + f[-38:]
                sections.append(f"  • `{display_path}`")
            if file_count > 8:
                sections.append(f"  • *+{file_count - 8} more*")

        embed.description = "\n".join(sections) if sections else None

        footer_parts = []
        if self.branch_name:
            footer_parts.append(f"🔀 {self.branch_name} → {self.base_branch}")
        footer_parts.append(f"⏱ {self.elapsed_time()}")
        embed.set_footer(text="  │  ".join(footer_parts))

        return embed


class ProgressEmbedManager:
    def __init__(self, channel: discord.TextChannel):
        self.channel = channel
        self.message: Optional[discord.Message] = None
        self.embed: Optional[ProgressEmbed] = None
        self._update_lock = asyncio.Lock()
        self._last_update: datetime = datetime.utcnow()
        self._min_update_interval = 1.0

    async def start(
        self,
        title: str = "",
        description: str = "",
        issue_url: Optional[str] = None,
        repo_url: Optional[str] = None,
        current_action: str = "Starting...",
    ) -> discord.Message:
        self.embed = ProgressEmbed(
            current_action=current_action or title or "Working...",
        )

        discord_embed = self.embed.build()
        self.message = await self.channel.send(embed=discord_embed)
        return self.message

    def set_action(self, action: str):
        if self.embed:
            self.embed.set_action(action)

    def add_step(self, name: str, details: Optional[str] = None) -> int:
        if self.embed:
            return self.embed.add_step(name, details)
        return -1

    def reset_steps(self):
        if self.embed:
            self.embed.steps.clear()
            self.embed.is_complete = False
            self.embed.is_failed = False

    def start_step(self, index: int, details: Optional[str] = None):
        if self.embed:
            self.embed.start_step(index, details)

    def complete_step(self, index: int, details: Optional[str] = None):
        if self.embed:
            self.embed.complete_step(index, details)

    def fail_step(self, index: int, details: Optional[str] = None):
        if self.embed:
            self.embed.fail_step(index, details)

    def set_status(self, message: str):
        if self.embed:
            self.embed.set_status(message)

    def set_sub_action(self, sub_action: str):
        if self.embed:
            self.embed.set_sub_action(sub_action)

    def add_file(self, file_path: str):
        if self.embed:
            self.embed.add_file(file_path)

    def set_files(self, files: List[str]):
        if self.embed:
            self.embed.set_files(files)

    def set_branch(self, branch_name: str, base_branch: str = "main"):
        if self.embed:
            self.embed.set_branch(branch_name, base_branch)

    def set_queue_position(self, position: int):
        if self.embed:
            self.embed.set_queue_position(position)

    def set_pr_url(self, url: str):
        if self.embed:
            self.embed.pr_url = url

    def mark_complete(self, success: bool = True):
        if self.embed:
            self.embed.mark_complete(success)

    async def update(self, force: bool = False):
        if not self.message or not self.embed:
            return

        async with self._update_lock:
            now = datetime.utcnow()
            elapsed = (now - self._last_update).total_seconds()
            if not force and elapsed < self._min_update_interval:
                return

            try:
                discord_embed = self.embed.build()
                await self.message.edit(embed=discord_embed)
                self._last_update = now
            except discord.HTTPException as e:
                logging.getLogger(__name__).warning(f"Failed to update embed: {e}")

    async def finish(
        self,
        success: bool = True,
        final_status: Optional[str] = None,
        view: Optional[View] = None,
    ):
        if self.embed:
            self.embed.mark_complete(success)
            if final_status:
                self.embed.set_status(final_status)

        if not self.message or not self.embed:
            return

        async with self._update_lock:
            try:
                discord_embed = self.embed.build()
                if view:
                    await self.message.edit(embed=discord_embed, view=view)
                else:
                    await self.message.edit(embed=discord_embed)
                self._last_update = datetime.utcnow()
            except discord.HTTPException as e:
                logger.warning(f"Failed to finish embed: {e}")

