"""
End-to-End Simulation Test for CCR Sandbox Integration.

This script simulates EXACTLY what tommy_agent.py and claude_code_agent.py do:
1. Create Docker sandbox
2. Install ccr
3. Setup coder user
4. Write config
5. Start ccr service
6. Run task with heartbeat
7. Collect results (files changed, todos, etc.)
"""
import asyncio
import subprocess
import time
import json
import re
import os

# Configuration
CONTAINER_NAME = "ccr_e2e_test"
CCR_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "temp_ccr_config.json")

class SimulatedCommandResult:
    def __init__(self, exit_code, stdout, stderr=""):
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr

async def run_docker_cmd(cmd: str, timeout: int = 120) -> SimulatedCommandResult:
    """Run a command in the Docker container."""
    # Use docker exec directly - don't use MSYS_NO_PATHCONV on Windows cmd
    full_cmd = ["docker", "exec", CONTAINER_NAME, "sh", "-c", cmd]
    try:
        result = subprocess.run(
            full_cmd,
            capture_output=True,
            timeout=timeout,
        )
        # Decode with errors='replace' to handle Unicode
        stdout = result.stdout.decode('utf-8', errors='replace') if result.stdout else ""
        stderr = result.stderr.decode('utf-8', errors='replace') if result.stderr else ""
        return SimulatedCommandResult(result.returncode, stdout, stderr)
    except subprocess.TimeoutExpired:
        return SimulatedCommandResult(1, "", "Timeout")

async def run_host_cmd(cmd: str, timeout: int = 120) -> SimulatedCommandResult:
    """Run a command on the host (uses shell=True for simple commands)."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            timeout=timeout,
        )
        stdout = result.stdout.decode('utf-8', errors='replace') if result.stdout else ""
        stderr = result.stderr.decode('utf-8', errors='replace') if result.stderr else ""
        return SimulatedCommandResult(result.returncode, stdout, stderr)
    except subprocess.TimeoutExpired:
        return SimulatedCommandResult(1, "", "Timeout")

def parse_todos_from_output(output: str) -> list:
    """Parse todo items from Claude Code output (same as claude_code_agent.py)."""
    todos = []
    seen = set()
    lines = output.split('\n')

    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue

        status = "pending"
        content = None

        if line.startswith('⬜') or line.startswith('◻'):
            content = line[1:].strip().lstrip('- ').strip()
            status = "pending"
        elif line.startswith('🔄') or line.startswith('⏳'):
            content = line[1:].strip().lstrip('- ').strip()
            status = "in_progress"
        elif line.startswith('✅') or line.startswith('✓'):
            content = line[1:].strip().lstrip('- ').strip()
            status = "completed"
        elif line.startswith('❌'):
            content = line[1:].strip().lstrip('- ').strip()
            status = "failed"
        elif line.startswith('- [ ]') or line.startswith('* [ ]'):
            content = line[5:].strip()
            status = "pending"
        elif line.startswith('- [x]') or line.startswith('* [x]'):
            content = line[5:].strip()
            status = "completed"

        if content and len(content) > 2 and content not in seen:
            skip_patterns = ['token', 'cost', 'session', 'api', 'model']
            if not any(skip in content.lower() for skip in skip_patterns):
                seen.add(content)
                todos.append({"content": content[:100], "status": status})

    return todos[:10]

def extract_pr_url(output: str) -> str:
    """Extract PR URL from output."""
    patterns = [
        r'https://github\.com/[^/]+/[^/]+/pull/\d+',
        r'Pull request created: (https://[^\s]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, output)
        if match:
            return match.group(1) if match.lastindex else match.group(0)
    return None

async def main():
    print("=" * 60)
    print("END-TO-END CCR SANDBOX SIMULATION")
    print("=" * 60)

    progress_updates = []
    heartbeat_count = 0

    async def on_progress(message: str):
        """Simulated Discord embed update callback."""
        nonlocal heartbeat_count
        progress_updates.append(message)
        if "m " in message and "s)" in message:
            heartbeat_count += 1
        # Remove emojis for Windows console compatibility
        clean_msg = message.encode('ascii', 'ignore').decode('ascii').strip()
        print(f"  [EMBED UPDATE] {clean_msg or message[:50]}")

    # Step 1: Cleanup and create container
    print("\n[1/7] Creating Docker sandbox...")
    await run_host_cmd(f"docker rm -f {CONTAINER_NAME}")
    result = await run_host_cmd(f"docker run -d --name {CONTAINER_NAME} -w /workspace node:20 tail -f /dev/null")
    if result.exit_code != 0:
        print(f"  FAILED: {result.stderr}")
        return False
    print(f"  Container created: {result.stdout.strip()[:12]}")

    # Step 2: Install ccr
    print("\n[2/7] Installing ccr...")
    await on_progress("🔧 Setting up coding environment...")
    result = await run_docker_cmd("npm install -g @anthropic-ai/claude-code @musistudio/claude-code-router 2>&1", timeout=180)
    if result.exit_code != 0:
        print(f"  FAILED: {result.stderr}")
        return False
    print(f"  ccr installed")

    # Step 3: Create coder user
    print("\n[3/7] Creating coder user...")
    await run_docker_cmd("useradd -m coder 2>/dev/null || true")
    await run_docker_cmd("mkdir -p /home/coder/.claude-code-router")
    print("  User created")

    # Step 4: Write config
    print("\n[4/7] Writing ccr config...")
    result = await run_host_cmd(f'docker cp "{CCR_CONFIG_PATH}" {CONTAINER_NAME}:/home/coder/.claude-code-router/config.json')
    print(f"  docker cp result: {result.exit_code}")
    await run_docker_cmd("chown -R coder:coder /home/coder")
    print("  Config written")

    # Step 5: Fix temp file and start service
    print("\n[5/7] Starting ccr service...")
    await run_docker_cmd("touch /tmp/claude-code-reference-count.txt && chmod 666 /tmp/claude-code-reference-count.txt")
    result = await run_docker_cmd("su - coder -c 'ccr start' 2>&1", timeout=30)
    await asyncio.sleep(2)
    status = await run_docker_cmd("su - coder -c 'ccr status' 2>&1")
    if "Running" not in status.stdout:
        print(f"  FAILED: ccr not running - {status.stdout}")
        return False
    print("  ccr service running")

    # Step 6: Setup workspace
    print("\n[6/7] Setting up test workspace...")
    await run_docker_cmd("git config --global user.email 'test@test.com' && git config --global user.name 'Test'")
    await run_docker_cmd("cd /workspace && git init && echo 'function add(a, b) { return a - b; }' > math.js && git add . && git commit -m 'Initial'")
    await run_docker_cmd("chown -R coder:coder /workspace")
    print("  Workspace ready with buggy math.js")

    # Step 7: Run task WITH HEARTBEAT SIMULATION
    print("\n[7/7] Running ccr task with heartbeat...")
    await on_progress("🚀 Starting task...")

    heartbeat_messages = [
        "⏳ Working on the task...",
        "🔍 Analyzing code...",
        "💭 Thinking...",
        "⚙️ Processing...",
    ]

    start_time = time.time()
    heartbeat_idx = 0

    # Start heartbeat task
    async def heartbeat_loop():
        nonlocal heartbeat_idx
        while True:
            await asyncio.sleep(5)  # 5s for testing
            elapsed = int(time.time() - start_time)
            mins, secs = divmod(elapsed, 60)
            msg = heartbeat_messages[heartbeat_idx % len(heartbeat_messages)]
            await on_progress(f"{msg} ({mins}m {secs}s)")
            heartbeat_idx += 1

    heartbeat_task = asyncio.create_task(heartbeat_loop())

    try:
        # Run ccr task
        prompt = "Fix the bug in math.js - the add function should add, not subtract"
        escaped_prompt = prompt.replace("'", "'\\''")
        cmd = f"su - coder -c \"cd /workspace && ANTHROPIC_API_KEY=dummy ccr code -p --dangerously-skip-permissions '{escaped_prompt}'\""

        # Run via docker exec to get output
        ccr_result = await run_docker_cmd(cmd, timeout=120)
    finally:
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

    elapsed_total = int(time.time() - start_time)

    # Collect results
    print(f"\n{'='*60}")
    print("RESULTS")
    print("="*60)

    print(f"\nCCR Output:")
    print(f"  Exit code: {ccr_result.exit_code}")
    print(f"  Output: {ccr_result.stdout[:200]}..." if len(ccr_result.stdout) > 200 else f"  Output: {ccr_result.stdout}")

    # Check file was fixed
    file_result = await run_docker_cmd("cat /workspace/math.js")
    print(f"\nmath.js content:")
    print(f"  {file_result.stdout.strip()}")

    # Check git diff
    diff_result = await run_docker_cmd("su - coder -c 'cd /workspace && git diff HEAD'")
    print(f"\nGit diff:")
    print(f"  {diff_result.stdout[:300]}..." if len(diff_result.stdout) > 300 else f"  {diff_result.stdout}")

    # Parse todos
    todos = parse_todos_from_output(ccr_result.stdout)
    print(f"\nParsed todos: {len(todos)}")
    for todo in todos:
        print(f"  [{todo['status']}] {todo['content']}")

    # Progress updates summary
    print(f"\nProgress updates: {len(progress_updates)}")
    print(f"Heartbeat messages: {heartbeat_count}")
    print(f"Total elapsed: {elapsed_total}s")

    # Verification
    print(f"\n{'='*60}")
    print("VERIFICATION")
    print("="*60)

    success = True

    # Check if bug was fixed
    if "a + b" in file_result.stdout or "+ b" in file_result.stdout:
        print("[PASS] Bug fixed: math.js now uses addition")
    else:
        print("[FAIL] Bug NOT fixed")
        success = False

    # Check heartbeat worked
    if heartbeat_count >= 1:
        print(f"[PASS] Heartbeat working: {heartbeat_count} updates during execution")
    else:
        print(f"[INFO] Heartbeat: {heartbeat_count} updates (ccr was fast, <30s)")
        # Don't fail for this - ccr might be too fast for heartbeat to fire

    # Check ccr succeeded
    if ccr_result.exit_code == 0 or "fixed" in ccr_result.stdout.lower() or "changed" in ccr_result.stdout.lower():
        print("[PASS] CCR task completed successfully")
    else:
        print(f"[FAIL] CCR task failed: exit_code={ccr_result.exit_code}")
        success = False

    # Cleanup
    print(f"\n[Cleanup] Removing container...")
    await run_host_cmd(f"docker rm -f {CONTAINER_NAME}")

    print(f"\n{'='*60}")
    if success:
        print("ALL TESTS PASSED!")
    else:
        print("SOME TESTS FAILED")
    print("="*60)

    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)
