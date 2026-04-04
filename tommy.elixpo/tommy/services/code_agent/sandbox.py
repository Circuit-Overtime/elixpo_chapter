"""
Persistent Docker sandbox for ccr code execution.

Architecture:
- Single persistent container "tommy_sandbox" running 24/7
- Volume mount: data/sandbox/workspace -> /workspace in container
- ccr service runs inside, handles multiple concurrent tasks
- Each task creates a git branch for isolation
- Bot AI handles all git push/PR operations (not ccr)

The sandbox survives bot restarts via Docker's restart policy.
All files are stored in data/sandbox/ for easy access/cleanup.
"""
import asyncio
import json
import logging
import os
import shlex
import shutil
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

CONTAINER_NAME = "tommy_sandbox"

@dataclass
class TerminalSession:
    thread_id: str
    process: asyncio.subprocess.Process
    stdin: asyncio.StreamWriter
    stdout: asyncio.StreamReader
    stderr: asyncio.StreamReader
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_used: datetime = field(default_factory=datetime.utcnow)
    is_busy: bool = False
    user_id: int = 0
    channel_id: int = 0

    async def send_command(self, command: str, timeout: Optional[int] = None) -> str:
        marker = f"__CCR_DONE_{self.thread_id}_{int(datetime.utcnow().timestamp())}__"
        full_cmd = f"{command}; echo '{marker}'\n"
        logger.debug(f"Terminal {self.thread_id}: sending command (len={len(command)})")
        self.stdin.write(full_cmd.encode())
        await self.stdin.drain()

        output_buffer = ""
        start_time = asyncio.get_running_loop().time()
        chunk_timeout = 5.0
        last_log_time = start_time
        chunks_read = 0

        while True:
            if timeout:
                elapsed = asyncio.get_running_loop().time() - start_time
                if elapsed >= timeout:
                    logger.warning(f"Terminal {self.thread_id}: command timed out after {elapsed:.0f}s")
                    return output_buffer + "\n[TIMEOUT]"
                current_timeout = min(chunk_timeout, timeout - elapsed)
            else:
                current_timeout = chunk_timeout

            try:
                chunk = await asyncio.wait_for(
                    self.stdout.read(4096),
                    timeout=current_timeout
                )
                if not chunk:
                    logger.warning(f"Terminal {self.thread_id}: EOF (process exited?)")
                    break

                decoded = chunk.decode(errors="replace")
                output_buffer += decoded
                chunks_read += 1

                now = asyncio.get_running_loop().time()
                if now - last_log_time > 30:
                    logger.info(f"Terminal {self.thread_id}: {chunks_read} chunks, {len(output_buffer)} bytes, {now - start_time:.0f}s elapsed")
                    last_log_time = now

                if marker in output_buffer:
                    marker_pos = output_buffer.find(marker)
                    output_buffer = output_buffer[:marker_pos].rstrip()
                    logger.debug(f"Terminal {self.thread_id}: marker found, output {len(output_buffer)} bytes")
                    break

            except asyncio.TimeoutError:
                now = asyncio.get_running_loop().time()
                if now - last_log_time > 30:
                    logger.info(f"Terminal {self.thread_id}: waiting for output... ({now - start_time:.0f}s elapsed, {len(output_buffer)} bytes so far)")
                    last_log_time = now
                continue

        self.last_used = datetime.utcnow()
        return output_buffer

    async def close(self):
        try:
            self.stdin.write(b"exit\n")
            await self.stdin.drain()
            self.process.terminate()
            await asyncio.wait_for(self.process.wait(), timeout=5)
        except Exception as e:
            logger.warning(f"Error closing terminal {self.thread_id}: {e}")
            self.process.kill()

class TerminalManager:
    TERMINALS_FILE = Path(__file__).parent.parent.parent.parent / "data" / "terminals.json"

    def __init__(self, container_name: str = CONTAINER_NAME):
        self.container_name = container_name
        self._terminals: Dict[str, TerminalSession] = {}
        self._terminal_metadata: Dict[str, dict] = {}
        self._lock = asyncio.Lock()
        self._load_metadata()

    def _load_metadata(self):
        try:
            if self.TERMINALS_FILE.exists():
                import json
                with open(self.TERMINALS_FILE, 'r') as f:
                    self._terminal_metadata = json.load(f)
                logger.info(f"Loaded {len(self._terminal_metadata)} terminal metadata entries")
        except Exception as e:
            logger.warning(f"Failed to load terminal metadata: {e}")
            self._terminal_metadata = {}

    def _save_metadata(self):
        try:
            import json
            self.TERMINALS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(self.TERMINALS_FILE, 'w') as f:
                json.dump(self._terminal_metadata, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save terminal metadata: {e}")

    async def get_terminal(
        self,
        thread_id: str,
        user_id: int = 0,
        channel_id: int = 0,
    ) -> TerminalSession:
        async with self._lock:
            if thread_id in self._terminals:
                terminal = self._terminals[thread_id]
                if terminal.process.returncode is None:
                    logger.debug(f"Reusing existing terminal for thread {thread_id}")
                    return terminal
                else:
                    logger.info(f"Terminal for thread {thread_id} died, recreating")
                    del self._terminals[thread_id]

            terminal = await self._create_terminal(thread_id)
            terminal.user_id = user_id
            terminal.channel_id = channel_id
            self._terminals[thread_id] = terminal

            self._terminal_metadata[thread_id] = {
                "user_id": user_id,
                "channel_id": channel_id,
            }
            self._save_metadata()

            return terminal

    async def _create_terminal(self, thread_id: str) -> TerminalSession:
        logger.info(f"Creating persistent terminal for thread {thread_id}")

        proc = await asyncio.create_subprocess_exec(
            "docker", "exec", "-i",
            "-u", "coder",
            "-w", "/workspace/pollinations",
            self.container_name,
            "bash", "--norc", "--noprofile",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        if proc.stdin is None or proc.stdout is None:
            raise RuntimeError("Failed to create subprocess pipes")

        terminal = TerminalSession(
            thread_id=thread_id,
            process=proc,
            stdin=proc.stdin,
            stdout=proc.stdout,
            stderr=proc.stderr or proc.stdout,
        )

        init_cmds = [
            "set +e",
            "export PS1=''",
            "export HOME=/home/coder",
            "source ~/.bashrc 2>/dev/null || true",
            "set +e",
            "export PATH=$HOME/.local/bin:$HOME/.npm-global/bin:$PATH",
            "cd /workspace/pollinations",
        ]

        for cmd in init_cmds:
            await terminal.send_command(cmd, timeout=5)

        await terminal.send_command("ccr start 2>/dev/null || true", timeout=10)

        logger.info(f"Terminal ready for thread {thread_id}")
        return terminal

    async def close_terminal(self, thread_id: str) -> bool:
        async with self._lock:
            closed = False

            if thread_id in self._terminals:
                terminal = self._terminals.pop(thread_id)
                await terminal.close()
                logger.info(f"Closed terminal for thread {thread_id}")
                closed = True

            if thread_id in self._terminal_metadata:
                del self._terminal_metadata[thread_id]
                self._save_metadata()
                logger.info(f"Removed terminal metadata for thread {thread_id}")
                closed = True

            if not closed:
                logger.debug(f"Terminal for thread {thread_id} not found (already closed?)")

            return closed

    async def cleanup_idle_terminals(self, max_idle_seconds: int = 300) -> int:
        closed_count = 0
        terminals_to_close = []

        async with self._lock:
            now = datetime.utcnow()

            for thread_id, terminal in self._terminals.items():
                idle_time = (now - terminal.last_used).total_seconds()

                if idle_time > max_idle_seconds and not terminal.is_busy:
                    terminals_to_close.append((thread_id, terminal))

        for thread_id, terminal in terminals_to_close:
            try:
                await terminal.close()
                async with self._lock:
                    self._terminals.pop(thread_id, None)
                    self._terminal_metadata.pop(thread_id, None)
                closed_count += 1
                logger.info(f"Auto-closed idle terminal {thread_id}")
            except Exception as e:
                logger.warning(f"Error closing idle terminal {thread_id}: {e}")

        if closed_count > 0:
            self._save_metadata()

        return closed_count

    def get_terminal_info(self, thread_id: str) -> dict | None:
        if thread_id in self._terminals:
            terminal = self._terminals[thread_id]
            return {
                "user_id": terminal.user_id,
                "channel_id": terminal.channel_id,
                "last_used": terminal.last_used.isoformat(),
                "is_busy": terminal.is_busy,
            }

        if thread_id in self._terminal_metadata:
            return {
                "user_id": self._terminal_metadata[thread_id].get("user_id", 0),
                "channel_id": self._terminal_metadata[thread_id].get("channel_id", 0),
                "last_used": None,
                "is_busy": False,
            }

        return None

    async def cleanup_stale(self, max_idle_seconds: int = 300):
        return await self.cleanup_idle_terminals(max_idle_seconds)

    async def close_all(self):
        async with self._lock:
            for thread_id, terminal in list(self._terminals.items()):
                await terminal.close()
            self._terminals.clear()
            self._terminal_metadata.clear()
            self._save_metadata()
            logger.info("Closed all terminal sessions and cleared metadata")

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

SANDBOX_DIR = PROJECT_ROOT / "data" / "sandbox"
WORKSPACE_DIR = SANDBOX_DIR / "workspace"
CCR_CONFIG_DIR = SANDBOX_DIR / "ccr_config"

REPO_SOURCE_DIR = PROJECT_ROOT / "data" / "repo" / "pollinations_pollinations"


@dataclass
class SandboxConfig:
    image: str = "node:20"
    memory_limit: str = "4g"
    cpu_limit: float = 4.0
    restart_policy: str = "unless-stopped"
    network_enabled: bool = True

@dataclass
class CommandResult:
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool = False
    duration: float = 0.0

@dataclass
class TaskBranch:
    branch_name: str
    task_id: str
    user_id: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "active"
    description: str = ""

class PersistentSandbox:
    def __init__(self, config: Optional[SandboxConfig] = None):
        self.config = config or SandboxConfig()
        self.active_branches: dict[str, TaskBranch] = {}
        self.terminal_manager = TerminalManager()
        self._setup_directories()

    def _setup_directories(self):
        SANDBOX_DIR.mkdir(parents=True, exist_ok=True)
        WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
        CCR_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Sandbox directories ready at {SANDBOX_DIR}")

    async def ensure_running(self) -> bool:
        check_result = await self._run_host_command([
            "docker", "inspect", CONTAINER_NAME
        ])

        if check_result.exit_code == 0:
            status_result = await self._run_host_command([
                "docker", "inspect", "-f", "{{.State.Running}}", CONTAINER_NAME
            ])

            if "true" in status_result.stdout.lower():
                logger.info(f"Sandbox {CONTAINER_NAME} already running")
                await self._ensure_ccr_running()
                return True
            else:
                logger.info(f"Starting stopped sandbox {CONTAINER_NAME}")
                start_result = await self._run_host_command([
                    "docker", "start", CONTAINER_NAME
                ])
                if start_result.exit_code == 0:
                    await self._ensure_ccr_running()
                    return True
                else:
                    logger.error(f"Failed to start container: {start_result.stderr}")
                    return False
        else:
            return await self._create_container()

    async def _create_container(self) -> bool:
        logger.info(f"Creating persistent sandbox {CONTAINER_NAME}")

        config = self.config

        workspace_mount = str(WORKSPACE_DIR.resolve()).replace("\\", "/")
        ccr_config_mount = str(CCR_CONFIG_DIR.resolve()).replace("\\", "/")

        cmd = [
            "docker", "run", "-d",
            "--name", CONTAINER_NAME,
            "-v", f"{workspace_mount}:/workspace",
            "-v", f"{ccr_config_mount}:/home/coder/.claude-code-router",
            "-w", "/workspace",
            "--memory", config.memory_limit,
            "--cpus", str(config.cpu_limit),
            "--restart", config.restart_policy,
        ]

        if not config.network_enabled:
            cmd.extend(["--network", "none"])

        cmd.extend([config.image, "tail", "-f", "/dev/null"])

        result = await self._run_host_command(cmd)
        if result.exit_code != 0:
            logger.error(f"Failed to create container: {result.stderr}")
            return False

        logger.info(f"Container created: {result.stdout.strip()[:12]}")

        await self._initial_setup()

        return True

    async def _initial_setup(self):
        logger.info("Running initial sandbox setup...")

        await self.execute("useradd -m coder 2>/dev/null || true")

        logger.info("Installing ccr (this may take a minute)...")
        install_result = await self.execute(
            "npm install -g @anthropic-ai/claude-code @musistudio/claude-code-router 2>&1",
            timeout=300
        )
        if install_result.exit_code != 0:
            logger.error(f"Failed to install ccr: {install_result.stderr}")
        else:
            logger.info("ccr installed successfully")

        await self.execute("chown -R coder:coder /home/coder")
        await self.execute("chown -R coder:coder /workspace 2>/dev/null || true")

        await self.execute("touch /tmp/claude-code-reference-count.txt && chmod 666 /tmp/claude-code-reference-count.txt")

        await self.execute("git config --global user.email 'meaw@pollinations.ai'")
        await self.execute("git config --global user.name 'meaw Bot'")
        await self.execute("git config --global --add safe.directory '*'")
        await self.execute("su - coder -c \"git config --global user.email 'meaw@pollinations.ai'\"")
        await self.execute("su - coder -c \"git config --global user.name 'meaw Bot'\"")
        await self.execute("su - coder -c \"git config --global --add safe.directory '*'\"")

        await self._setup_commit_hook()

        await self._write_ccr_config()

        await self._ensure_ccr_running()

        logger.info("Initial setup complete")

    async def _setup_commit_hook(self):
        hook_script = '''#!/bin/bash
COMMIT_MSG_FILE="$1"
sed -i '/🤖 Generated with/d' "$COMMIT_MSG_FILE"
sed -i '/Co-Authored-By: Claude/d' "$COMMIT_MSG_FILE"
sed -i '/claude.com\\/claude-code/d' "$COMMIT_MSG_FILE"
sed -i -e :a -e '/^\\n*$/{$d;N;ba' -e '}' "$COMMIT_MSG_FILE"
'''
        hook_path = SANDBOX_DIR / "commit-msg-hook"
        hook_path.write_text(hook_script)

        await self._run_host_command([
            "docker", "cp",
            str(hook_path),
            f"{CONTAINER_NAME}:/tmp/commit-msg"
        ])

        await self.execute("mkdir -p /home/coder/.git-templates/hooks")
        await self.execute("cp /tmp/commit-msg /home/coder/.git-templates/hooks/commit-msg")
        await self.execute("chmod +x /home/coder/.git-templates/hooks/commit-msg")
        await self.execute("chown -R coder:coder /home/coder/.git-templates")

        await self.execute("su - coder -c \"git config --global init.templateDir ~/.git-templates\"")

        await self.execute(
            "mkdir -p /workspace/pollinations/.git/hooks && "
            "cp /tmp/commit-msg /workspace/pollinations/.git/hooks/commit-msg && "
            "chmod +x /workspace/pollinations/.git/hooks/commit-msg 2>/dev/null || true"
        )

        hook_path.unlink(missing_ok=True)

        logger.info("Commit hook setup to strip Claude attribution")

    async def _write_ccr_config(self):
        from ... import config as app_config

        ccr_config = {
            "LOG": True,
            "LOG_LEVEL": "info",
            "CLAUDE_PATH": "",
            "HOST": "127.0.0.1",
            "PORT": 3456,
            "APIKEY": "",
            "API_TIMEOUT_MS": "600000",
            "PROXY_URL": "",
            "NON_INTERACTIVE_MODE": True,
            "transformers": [],
            "Providers": [
                {
                    "name": "main",
                    "api_base_url": "https://gen.pollinations.ai/v1/chat/completions",
                    "api_key": app_config.pollinations_token if hasattr(app_config, 'pollinations_token') else "",
                    "models": [
                        "openai-large",
                        "gemini-large",
                        "gemini",
                        "claude-large",
                        "perplexity-fast"
                    ],
                    "transformer": {
                        "use": ["customparams"]
                    }
                }
            ],
            "StatusLine": {
                "enabled": True,
                "currentStyle": "default",
                "default": {"modules": []},
                "powerline": {"modules": []}
            },
            "Router": {
                "default": "main,claude-large",
                "background": "main,gemini",
                "think": "",
                "longContext": "",
                "longContextThreshold": 60000,
                "webSearch": "main,perplexity-fast",
                "image": ""
            },
            "CUSTOM_ROUTER_PATH": ""
        }

        config_path = CCR_CONFIG_DIR / "config.json"
        config_path.write_text(json.dumps(ccr_config, indent=2))

        await self.execute(f"mkdir -p /home/coder/.claude-code-router")
        await self.execute(f"chown -R coder:coder /home/coder/.claude-code-router")

        logger.info(f"ccr config written to {config_path}")

    async def _ensure_ccr_running(self):
        await self.execute("su - coder -c 'ccr start' 2>&1", timeout=30)
        await asyncio.sleep(2)

        status = await self.execute("su - coder -c 'ccr status' 2>&1")
        if "running" in status.stdout.lower():
            logger.info("ccr service is running")
        else:
            logger.warning(f"ccr status unclear: {status.stdout}")

    async def sync_repo(self, force: bool = False) -> bool:
        workspace_repo = WORKSPACE_DIR / "pollinations"

        if workspace_repo.exists() and not force:
            logger.info("Workspace repo already exists, skipping sync")
            return True

        if not REPO_SOURCE_DIR.exists():
            logger.error(f"Source repo not found at {REPO_SOURCE_DIR}")
            return False

        logger.info(f"Syncing repo from {REPO_SOURCE_DIR} to workspace...")

        if workspace_repo.exists() and force:
            shutil.rmtree(workspace_repo, ignore_errors=True)

        try:
            shutil.copytree(REPO_SOURCE_DIR, workspace_repo, dirs_exist_ok=True)
            logger.info("Repo copied to workspace")
        except Exception as e:
            logger.error(f"Failed to copy repo: {e}")
            return False

        await self.execute("chown -R coder:coder /workspace/pollinations 2>/dev/null || true")

        await self.execute(
            "cd /workspace/pollinations && git checkout main 2>/dev/null || true",
            as_coder=True
        )

        return True

    async def create_task_branch(
        self,
        user_id: str,
        task_description: str,
        task_id: Optional[str] = None,
        thread_id: Optional[int] = None,
    ) -> TaskBranch:
        if thread_id:
            task_id = str(thread_id)
            branch_name = f"thread/{thread_id}"
        else:
            import uuid
            task_id = task_id or str(uuid.uuid4())[:8]
            branch_name = f"task/{task_id}"

        logger.info("Fetching latest from origin...")
        fetch_result = await self.execute(
            "cd /workspace/pollinations && git fetch origin main",
            as_coder=True
        )
        if fetch_result.exit_code != 0:
            logger.warning(f"git fetch failed: {fetch_result.stderr}")

        await self.execute(
            "cd /workspace/pollinations && git checkout main 2>/dev/null || true",
            as_coder=True
        )

        reset_result = await self.execute(
            "cd /workspace/pollinations && git reset --hard origin/main",
            as_coder=True
        )
        if reset_result.exit_code != 0:
            logger.warning(f"git reset failed: {reset_result.stderr}")

        result = await self.execute(
            f"cd /workspace/pollinations && git checkout -b {branch_name}",
            as_coder=True
        )

        if result.exit_code != 0:
            logger.info(f"Branch {branch_name} exists, recreating from fresh main...")
            await self.execute(
                f"cd /workspace/pollinations && git branch -D {branch_name} 2>/dev/null || true",
                as_coder=True
            )
            result = await self.execute(
                f"cd /workspace/pollinations && git checkout -b {branch_name}",
                as_coder=True
            )

        branch = TaskBranch(
            branch_name=branch_name,
            task_id=task_id,
            user_id=user_id,
            description=task_description
        )

        self.active_branches[task_id] = branch
        logger.info(f"Created task branch {branch_name} for user {user_id} (from latest origin/main)")

        return branch

    async def run_ccr(
        self,
        branch: TaskBranch,
        prompt: str,
        discord_user_id: int = 0,
        discord_channel_id: int = 0,
    ) -> CommandResult:
        full_prompt = (
            "IMPORTANT: When making commits, use simple descriptive messages. "
            "Do NOT include any Claude, AI, or bot attribution in commit messages. "
            "Just describe what was changed.\n\n"
            f"{prompt}"
        )

        escaped_prompt = shlex.quote(full_prompt)

        ccr_cmd = f"stdbuf -oL -eL ccr code -p --dangerously-skip-permissions {escaped_prompt}"

        logger.info(f"Running ccr on branch {branch.branch_name}: {prompt[:100]}...")

        is_thread_task = branch.task_id.isdigit() and len(branch.task_id) > 10

        if is_thread_task:
            return await self._run_ccr_in_terminal(
                branch, ccr_cmd,
                discord_user_id=discord_user_id,
                discord_channel_id=discord_channel_id,
            )
        else:
            cmd = f"cd /workspace/pollinations && git checkout {branch.branch_name} && {ccr_cmd}"
            return await self.execute(cmd, as_coder=True, timeout=None)

    async def _run_ccr_in_terminal(
        self,
        branch: TaskBranch,
        ccr_cmd: str,
        discord_user_id: int = 0,
        discord_channel_id: int = 0,
    ) -> CommandResult:
        start_time = asyncio.get_running_loop().time()

        try:
            terminal = await self.terminal_manager.get_terminal(
                branch.task_id,
                user_id=discord_user_id,
                channel_id=discord_channel_id,
            )
            terminal.is_busy = True

            await terminal.send_command(f"git checkout {branch.branch_name}", timeout=30)

            output = await terminal.send_command(ccr_cmd, timeout=None)

            terminal.is_busy = False

            return CommandResult(
                exit_code=0,
                stdout=output,
                stderr="",
                duration=asyncio.get_running_loop().time() - start_time
            )

        except Exception as e:
            logger.error(f"Error running ccr in terminal: {e}")
            return CommandResult(
                exit_code=1,
                stdout="",
                stderr=str(e),
                duration=asyncio.get_running_loop().time() - start_time
            )

    async def get_branch_diff(self, branch: TaskBranch) -> str:
        result = await self.execute(
            f"cd /workspace/pollinations && git diff main...{branch.branch_name}",
            as_coder=True
        )
        return result.stdout

    async def get_branch_files_changed(self, branch: TaskBranch) -> list[str]:
        result = await self.execute(
            f"cd /workspace/pollinations && git diff --name-only main...{branch.branch_name}",
            as_coder=True
        )
        if result.exit_code == 0 and result.stdout:
            return [f.strip() for f in result.stdout.split('\n') if f.strip()]
        return []

    async def cleanup_branch(self, branch: TaskBranch):
        await self.execute(
            "cd /workspace/pollinations && git checkout main",
            as_coder=True
        )

        await self.execute(
            f"cd /workspace/pollinations && git branch -D {branch.branch_name}",
            as_coder=True
        )

        self.active_branches.pop(branch.task_id, None)

        logger.info(f"Cleaned up branch {branch.branch_name}")

    async def list_branches(self) -> list[str]:
        result = await self.execute(
            "cd /workspace/pollinations && git branch --list 'task/*'",
            as_coder=True
        )
        if result.exit_code == 0 and result.stdout:
            return [b.strip().lstrip('* ') for b in result.stdout.split('\n') if b.strip()]
        return []

    async def execute(
        self,
        command: str,
        timeout: Optional[int] = 300,
        as_coder: bool = False,
    ) -> CommandResult:
        if as_coder:
            command = f"su - coder -c '{command}'"

        cmd = ["docker", "exec", CONTAINER_NAME, "sh", "-c", command]

        return await self._run_host_command(cmd, timeout)

    async def _run_host_command(
        self,
        cmd: list[str],
        timeout: Optional[int] = 60
    ) -> CommandResult:
        loop = asyncio.get_running_loop()
        start_time = loop.time()

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            if timeout:
                try:
                    stdout, stderr = await asyncio.wait_for(
                        proc.communicate(),
                        timeout=timeout
                    )
                except asyncio.TimeoutError:
                    proc.kill()
                    return CommandResult(
                        exit_code=-1,
                        stdout="",
                        stderr=f"Command timed out after {timeout}s",
                        timed_out=True,
                        duration=loop.time() - start_time
                    )
            else:
                stdout, stderr = await proc.communicate()

            return CommandResult(
                exit_code=proc.returncode or 0,
                stdout=stdout.decode(errors="replace"),
                stderr=stderr.decode(errors="replace"),
                duration=loop.time() - start_time
            )

        except Exception as e:
            return CommandResult(
                exit_code=1,
                stdout="",
                stderr=str(e),
                duration=loop.time() - start_time
            )

    async def stop(self):
        await self.terminal_manager.close_all()
        await self._run_host_command(["docker", "stop", CONTAINER_NAME])
        logger.info(f"Stopped sandbox {CONTAINER_NAME}")

    async def destroy(self):
        await self.terminal_manager.close_all()
        await self._run_host_command(["docker", "stop", CONTAINER_NAME])
        await self._run_host_command(["docker", "rm", CONTAINER_NAME])

        logger.info(f"Destroyed sandbox {CONTAINER_NAME}")

    async def is_running(self) -> bool:
        result = await self._run_host_command([
            "docker", "inspect", "-f", "{{.State.Running}}", CONTAINER_NAME
        ])
        return "true" in result.stdout.lower()

    async def close_thread_terminal(self, thread_id: str) -> bool:
        return await self.terminal_manager.close_terminal(thread_id)

    async def cleanup_idle_terminals(self, max_idle_seconds: int = 300) -> int:
        return await self.terminal_manager.cleanup_idle_terminals(max_idle_seconds)

    def get_terminal_info(self, thread_id: str) -> dict | None:
        return self.terminal_manager.get_terminal_info(thread_id)

    async def cleanup_stale_terminals(self, max_idle_seconds: int = 300):
        return await self.cleanup_idle_terminals(max_idle_seconds)

    async def close_all_terminals(self):
        await self.terminal_manager.close_all()

    def get_workspace_path(self) -> Path:
        return WORKSPACE_DIR

    def get_repo_path(self) -> Path:
        return WORKSPACE_DIR / "pollinations"

    async def setup_github_credentials(self, repo: str = "pollinations/pollinations") -> bool:
        from ..github_auth import github_app_auth

        if not github_app_auth:
            logger.warning("GitHub App auth not configured, cannot setup sandbox credentials")
            return False

        try:
            token = await github_app_auth.get_token()
            if not token:
                logger.error("Failed to get GitHub App token")
                return False

            credential_script = '''#!/bin/bash
echo "username=x-access-token"
echo "password=$GH_TOKEN"
'''
            helper_path = SANDBOX_DIR / "git-credential-meaw"
            helper_path.write_text(credential_script)

            await self._run_host_command([
                "docker", "cp",
                str(helper_path),
                f"{CONTAINER_NAME}:/usr/local/bin/git-credential-meaw"
            ])

            await self.execute("chmod +x /usr/local/bin/git-credential-meaw")

            await self.execute(
                "cd /workspace/pollinations && git config credential.helper '/usr/local/bin/git-credential-meaw'",
                as_coder=True
            )

            await self.execute(
                f"cd /workspace/pollinations && git remote set-url origin https://github.com/{repo}.git",
                as_coder=True
            )

            helper_path.unlink(missing_ok=True)

            logger.info("GitHub App credentials configured (using inline token for push)")
            return True

        except Exception as e:
            logger.error(f"Failed to setup GitHub credentials: {e}")
            return False

    async def refresh_github_token(self, repo: str = "pollinations/pollinations") -> bool:
        return await self.setup_github_credentials(repo)

    async def push_branch(self, branch_name: str, repo: str = "pollinations/pollinations") -> CommandResult:
        from ..github_auth import github_app_auth

        if not github_app_auth:
            return CommandResult(
                exit_code=1,
                stdout="",
                stderr="GitHub App auth not configured. Cannot push."
            )

        try:
            token = await github_app_auth.get_token()
            if not token:
                return CommandResult(
                    exit_code=1,
                    stdout="",
                    stderr="Failed to get GitHub App token"
                )

            push_url = f"https://x-access-token:{token}@github.com/{repo}.git"

            result = await self.execute(
                f"cd /workspace/pollinations && git push {push_url} {branch_name}:{branch_name}",
                as_coder=True,
                timeout=120
            )

            if result.exit_code == 0:
                await self.execute(
                    f"cd /workspace/pollinations && git branch --set-upstream-to=origin/{branch_name} {branch_name}",
                    as_coder=True
                )

            return result

        except Exception as e:
            logger.error(f"Error pushing branch: {e}")
            return CommandResult(
                exit_code=1,
                stdout="",
                stderr=str(e)
            )

@dataclass
class Sandbox:
    id: str
    container_id: Optional[str] = None
    workspace_path: Optional[Path] = None
    repo_url: Optional[str] = None
    branch: str = "main"
    created_at: datetime = field(default_factory=datetime.utcnow)
    config: SandboxConfig = field(default_factory=SandboxConfig)
    initiated_by: Optional[str] = None
    initiated_source: Optional[str] = None
    pending_destruction: bool = False

class SandboxManager:
    def __init__(self, **kwargs):
        self._persistent = PersistentSandbox()
        self.sandboxes: dict[str, Sandbox] = {}
        self.use_docker = True

    async def start(self):
        await self._persistent.ensure_running()
        await self._persistent.sync_repo()
        logger.info("SandboxManager started (persistent mode)")

    async def stop(self):
        logger.info("SandboxManager stopped (container still running)")

    async def create(
        self,
        repo_url: Optional[str] = None,
        branch: str = "main",
        config: Optional[SandboxConfig] = None,
        initiated_by: Optional[str] = None,
        initiated_source: Optional[str] = None,
    ) -> Sandbox:
        import uuid
        sandbox_id = str(uuid.uuid4())[:8]

        task_branch = await self._persistent.create_task_branch(
            user_id=initiated_by or "unknown",
            task_description=f"Task from {initiated_source or 'unknown'}",
            task_id=sandbox_id
        )

        sandbox = Sandbox(
            id=sandbox_id,
            container_id=CONTAINER_NAME,
            workspace_path=self._persistent.get_repo_path(),
            repo_url=repo_url,
            branch=task_branch.branch_name,
            config=config or SandboxConfig(),
            initiated_by=initiated_by,
            initiated_source=initiated_source,
        )

        self.sandboxes[sandbox_id] = sandbox
        return sandbox

    async def execute(
        self,
        sandbox_id: str,
        command: str,
        timeout: Optional[int] = None,
        env: Optional[dict] = None,
    ) -> CommandResult:
        sandbox = self.sandboxes.get(sandbox_id)

        if env:
            env_str = " ".join(f"{k}={v}" for k, v in env.items())
            command = f"{env_str} {command}"

        if sandbox and sandbox.branch != "main":
            await self._persistent.execute(
                f"cd /workspace/pollinations && git checkout {sandbox.branch} 2>/dev/null || true",
                as_coder=True
            )

        return await self._persistent.execute(command, timeout=timeout, as_coder=True)

    async def destroy(self, sandbox_id: str, force: bool = False):
        sandbox = self.sandboxes.pop(sandbox_id, None)
        if sandbox and sandbox.branch.startswith("task/"):
            task_id = sandbox.branch.replace("task/", "")
            branch = self._persistent.active_branches.get(task_id)
            if branch:
                await self._persistent.cleanup_branch(branch)

    def get_workspace_path(self, sandbox_id: str) -> Optional[Path]:
        return self._persistent.get_repo_path()

    async def read_file(self, sandbox_id: str, file_path: str) -> str:
        sandbox = self.sandboxes.get(sandbox_id)
        if not sandbox:
            raise FileNotFoundError(f"Sandbox {sandbox_id} not found")

        if sandbox.branch != "main":
            await self._persistent.execute(
                f"cd /workspace/pollinations && git checkout {sandbox.branch} 2>/dev/null || true",
                as_coder=True
            )

        result = await self._persistent.execute(
            f"cat /workspace/pollinations/{file_path}",
            as_coder=True
        )

        if result.exit_code != 0:
            raise FileNotFoundError(f"File not found: {file_path}")

        return result.stdout

    async def write_file(self, sandbox_id: str, file_path: str, content: str):
        sandbox = self.sandboxes.get(sandbox_id)
        if not sandbox:
            raise FileNotFoundError(f"Sandbox {sandbox_id} not found")

        if sandbox.branch != "main":
            await self._persistent.execute(
                f"cd /workspace/pollinations && git checkout {sandbox.branch} 2>/dev/null || true",
                as_coder=True
            )

        import base64
        encoded = base64.b64encode(content.encode()).decode()
        result = await self._persistent.execute(
            f"echo '{encoded}' | base64 -d > /workspace/pollinations/{file_path}",
            as_coder=True
        )

        if result.exit_code != 0:
            raise IOError(f"Failed to write file: {result.stderr}")

_persistent_sandbox: Optional[PersistentSandbox] = None

def get_persistent_sandbox() -> PersistentSandbox:
    global _persistent_sandbox
    if _persistent_sandbox is None:
        _persistent_sandbox = PersistentSandbox()
    return _persistent_sandbox

_sandbox_manager: Optional[SandboxManager] = None

def get_sandbox_manager() -> SandboxManager:
    global _sandbox_manager
    if _sandbox_manager is None:
        _sandbox_manager = SandboxManager()
    return _sandbox_manager

class _LazySandboxManager:
    def __getattr__(self, name):
        return getattr(get_sandbox_manager(), name)

sandbox_manager = _LazySandboxManager()

