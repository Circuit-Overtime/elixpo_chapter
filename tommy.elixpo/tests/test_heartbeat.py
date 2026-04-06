"""
Test heartbeat mechanism for ccr execution.
Simulates the _execute_with_streaming function with heartbeat.
"""
import asyncio
import time

async def simulate_heartbeat_execution():
    """Simulate ccr execution with heartbeat updates."""

    heartbeat_messages = [
        "Working on the task...",
        "Analyzing code...",
        "Thinking...",
        "Processing...",
        "Making changes...",
        "Working...",
    ]

    heartbeat_idx = 0
    start_time = time.time()
    progress_updates = []

    async def on_progress(message: str):
        """Simulate progress callback (would update Discord embed)."""
        progress_updates.append(message)
        print(f"[Progress] {message}")

    async def heartbeat_loop():
        """Send periodic progress updates."""
        nonlocal heartbeat_idx
        while True:
            await asyncio.sleep(5)  # Use 5s for testing (normally 30s)
            elapsed = int(time.time() - start_time)
            mins, secs = divmod(elapsed, 60)
            msg = heartbeat_messages[heartbeat_idx % len(heartbeat_messages)]
            await on_progress(f"{msg} ({mins}m {secs}s)")
            heartbeat_idx += 1

    async def simulate_ccr_execution():
        """Simulate ccr running for 25 seconds."""
        print("[CCR] Starting execution...")
        await asyncio.sleep(25)  # Simulate 25s execution
        print("[CCR] Execution complete!")
        return "Done! Modified 3 files."

    # Run with heartbeat
    heartbeat_task = None
    try:
        heartbeat_task = asyncio.create_task(heartbeat_loop())
        await on_progress("Starting task...")

        result = await simulate_ccr_execution()

        await on_progress(f"Completed: {result}")
    finally:
        if heartbeat_task:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

    print(f"\n=== Test Results ===")
    print(f"Total progress updates: {len(progress_updates)}")
    print(f"All updates:")
    for i, update in enumerate(progress_updates):
        print(f"  {i+1}. {update}")

    # Verify heartbeat fired multiple times
    heartbeat_count = sum(1 for u in progress_updates if "m " in u and "s)" in u)
    print(f"\nHeartbeat messages: {heartbeat_count}")

    if heartbeat_count >= 4:  # Should have ~4-5 heartbeats in 25s with 5s interval
        print("PASS: Heartbeat mechanism working correctly")
        return True
    else:
        print(f"FAIL: Expected >= 4 heartbeats, got {heartbeat_count}")
        return False

if __name__ == "__main__":
    print("Testing heartbeat mechanism...")
    print("=" * 50)
    result = asyncio.run(simulate_heartbeat_execution())
    exit(0 if result else 1)
