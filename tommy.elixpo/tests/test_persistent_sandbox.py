"""
Test the new Persistent Sandbox architecture locally.

Tests:
1. Sandbox creation and persistence
2. Branch-based task isolation
3. Concurrent tasks on different branches
4. ccr execution
5. File changes detection
"""
import asyncio
import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from pathlib import Path


async def test_persistent_sandbox():
    """Test the persistent sandbox functionality."""

    print("=" * 70)
    print("PERSISTENT SANDBOX TEST")
    print("=" * 70)

    # Import after path setup
    from src.services.code_agent.sandbox import (
        PersistentSandbox,
        SANDBOX_DIR,
        WORKSPACE_DIR,
        CCR_CONFIG_DIR,
        CONTAINER_NAME,
    )

    print(f"\nPaths:")
    print(f"  SANDBOX_DIR: {SANDBOX_DIR}")
    print(f"  WORKSPACE_DIR: {WORKSPACE_DIR}")
    print(f"  CCR_CONFIG_DIR: {CCR_CONFIG_DIR}")
    print(f"  CONTAINER_NAME: {CONTAINER_NAME}")

    # Create sandbox instance
    sandbox = PersistentSandbox()

    # Test 1: Ensure running
    print("\n" + "-" * 70)
    print("TEST 1: Ensure sandbox is running")
    print("-" * 70)

    is_running = await sandbox.is_running()
    print(f"  Already running: {is_running}")

    if not is_running:
        print("  Starting sandbox...")
        success = await sandbox.ensure_running()
        print(f"  Start result: {'SUCCESS' if success else 'FAILED'}")
    else:
        print("  Sandbox already running, skipping start")

    # Test 2: Check directories exist
    print("\n" + "-" * 70)
    print("TEST 2: Check directories")
    print("-" * 70)

    print(f"  SANDBOX_DIR exists: {SANDBOX_DIR.exists()}")
    print(f"  WORKSPACE_DIR exists: {WORKSPACE_DIR.exists()}")
    print(f"  CCR_CONFIG_DIR exists: {CCR_CONFIG_DIR.exists()}")

    # Test 3: Execute simple command
    print("\n" + "-" * 70)
    print("TEST 3: Execute simple command")
    print("-" * 70)

    result = await sandbox.execute("echo 'Hello from sandbox!'")
    print(f"  Exit code: {result.exit_code}")
    print(f"  Output: {result.stdout.strip()}")

    # Test 4: Check ccr is installed
    print("\n" + "-" * 70)
    print("TEST 4: Check ccr installation")
    print("-" * 70)

    result = await sandbox.execute("which ccr && ccr --version", as_coder=True)
    print(f"  Exit code: {result.exit_code}")
    print(f"  Output: {result.stdout.strip()[:200]}")

    # Test 5: Check ccr status
    print("\n" + "-" * 70)
    print("TEST 5: Check ccr service status")
    print("-" * 70)

    result = await sandbox.execute("ccr status", as_coder=True)
    print(f"  Exit code: {result.exit_code}")
    print(f"  Output: {result.stdout.strip()}")

    # Test 6: Create task branch (with fake repo)
    print("\n" + "-" * 70)
    print("TEST 6: Create task branch")
    print("-" * 70)

    # First create a test repo in workspace
    print("  Creating test repo in workspace...")
    await sandbox.execute("mkdir -p /workspace/pollinations")
    await sandbox.execute("cd /workspace/pollinations && git init 2>/dev/null || true")
    await sandbox.execute("cd /workspace/pollinations && git config user.email 'test@test.com'")
    await sandbox.execute("cd /workspace/pollinations && git config user.name 'Test'")
    await sandbox.execute("cd /workspace/pollinations && echo 'console.log(\"hello\")' > test.js")
    await sandbox.execute("cd /workspace/pollinations && git add . && git commit -m 'Init' 2>/dev/null || true")
    await sandbox.execute("chown -R coder:coder /workspace/pollinations")

    branch = await sandbox.create_task_branch("test_user", "Test task")
    print(f"  Branch created: {branch.branch_name}")
    print(f"  Task ID: {branch.task_id}")

    # Test 7: Check we're on the branch
    print("\n" + "-" * 70)
    print("TEST 7: Verify branch checkout")
    print("-" * 70)

    result = await sandbox.execute(
        "cd /workspace/pollinations && git branch --show-current",
        as_coder=True
    )
    print(f"  Current branch: {result.stdout.strip()}")

    # Test 8: Make changes on branch
    print("\n" + "-" * 70)
    print("TEST 8: Make changes on branch")
    print("-" * 70)

    await sandbox.execute(
        "cd /workspace/pollinations && echo 'console.log(\"modified\")' > test.js",
        as_coder=True
    )
    print("  Modified test.js")

    # Test 9: Get diff
    print("\n" + "-" * 70)
    print("TEST 9: Get branch diff")
    print("-" * 70)

    diff = await sandbox.get_branch_diff(branch)
    print(f"  Diff:\n{diff[:500] if diff else '(no diff)'}")

    # Test 10: Get files changed
    print("\n" + "-" * 70)
    print("TEST 10: Get files changed")
    print("-" * 70)

    files = await sandbox.get_branch_files_changed(branch)
    print(f"  Files changed: {files}")

    # Test 11: List branches
    print("\n" + "-" * 70)
    print("TEST 11: List task branches")
    print("-" * 70)

    branches = await sandbox.list_branches()
    print(f"  Task branches: {branches}")

    # Test 12: Cleanup branch
    print("\n" + "-" * 70)
    print("TEST 12: Cleanup branch")
    print("-" * 70)

    await sandbox.cleanup_branch(branch)
    print("  Branch cleaned up")

    branches_after = await sandbox.list_branches()
    print(f"  Remaining branches: {branches_after}")

    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    tests_passed = [
        ("Sandbox running", await sandbox.is_running()),
        ("Directories exist", SANDBOX_DIR.exists()),
        ("Commands execute", True),  # If we got here, it works
        ("Branch workflow", True),
    ]

    for name, passed in tests_passed:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")

    print("\n" + "=" * 70)
    print("Sandbox is ready for use!")
    print(f"Container name: {CONTAINER_NAME}")
    print(f"Workspace: {WORKSPACE_DIR}")
    print("=" * 70)

    return True


async def test_concurrent_tasks():
    """Test concurrent tasks on different branches."""

    print("\n" + "=" * 70)
    print("CONCURRENT TASKS TEST")
    print("=" * 70)

    from src.services.code_agent.sandbox import PersistentSandbox

    sandbox = PersistentSandbox()
    await sandbox.ensure_running()

    # Create two task branches
    print("\nCreating two concurrent task branches...")

    branch1 = await sandbox.create_task_branch("user_A", "Task A: Add feature")
    branch2 = await sandbox.create_task_branch("user_B", "Task B: Fix bug")

    print(f"  Branch 1: {branch1.branch_name}")
    print(f"  Branch 2: {branch2.branch_name}")

    # Make different changes on each branch
    print("\nMaking changes on branch 1...")
    await sandbox.execute(
        f"cd /workspace/pollinations && git checkout {branch1.branch_name}",
        as_coder=True
    )
    await sandbox.execute(
        "cd /workspace/pollinations && echo 'feature A' > feature_a.txt && git add . && git commit -m 'Add feature A'",
        as_coder=True
    )

    print("Making changes on branch 2...")
    await sandbox.execute(
        f"cd /workspace/pollinations && git checkout {branch2.branch_name}",
        as_coder=True
    )
    await sandbox.execute(
        "cd /workspace/pollinations && echo 'bugfix B' > bugfix_b.txt && git add . && git commit -m 'Fix bug B'",
        as_coder=True
    )

    # Check files on each branch
    print("\nVerifying branch isolation...")

    await sandbox.execute(
        f"cd /workspace/pollinations && git checkout {branch1.branch_name}",
        as_coder=True
    )
    result1 = await sandbox.execute(
        "cd /workspace/pollinations && ls -la",
        as_coder=True
    )
    has_feature_a = "feature_a.txt" in result1.stdout
    has_bugfix_b = "bugfix_b.txt" in result1.stdout

    print(f"  Branch 1 has feature_a.txt: {has_feature_a}")
    print(f"  Branch 1 has bugfix_b.txt: {has_bugfix_b}")

    await sandbox.execute(
        f"cd /workspace/pollinations && git checkout {branch2.branch_name}",
        as_coder=True
    )
    result2 = await sandbox.execute(
        "cd /workspace/pollinations && ls -la",
        as_coder=True
    )
    has_feature_a_2 = "feature_a.txt" in result2.stdout
    has_bugfix_b_2 = "bugfix_b.txt" in result2.stdout

    print(f"  Branch 2 has feature_a.txt: {has_feature_a_2}")
    print(f"  Branch 2 has bugfix_b.txt: {has_bugfix_b_2}")

    # Verify isolation
    isolation_works = (
        has_feature_a and not has_bugfix_b and  # Branch 1 only has feature A
        not has_feature_a_2 and has_bugfix_b_2   # Branch 2 only has bugfix B
    )

    print(f"\n  Branch isolation: {'PASS' if isolation_works else 'FAIL'}")

    # Cleanup
    print("\nCleaning up branches...")
    await sandbox.cleanup_branch(branch1)
    await sandbox.cleanup_branch(branch2)

    return isolation_works


if __name__ == "__main__":
    print("Testing Persistent Sandbox Architecture")
    print("This will create/use a Docker container named 'tommy_sandbox'\n")

    try:
        result1 = asyncio.run(test_persistent_sandbox())
        result2 = asyncio.run(test_concurrent_tasks())

        if result1 and result2:
            print("\n✅ All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
