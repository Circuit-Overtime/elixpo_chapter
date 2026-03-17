"""
SSE status messages for the pipeline.

Each operation key maps to a list of synonym variants.
The pipeline rotates through these when a status persists too long.
"""
import random
import time
from typing import Optional, Callable

# operation → list of TASK-wrapped status messages
STATUS_MESSAGES = {
    "processing": [
        "Processing your request",
        "Working on it",
        "Getting started",
        "On it",
    ],
    "analyzing": [
        "Analyzing your input",
        "Understanding your query",
        "Breaking down your question",
    ],
    "searching": [
        "Searching for information",
        "Looking things up",
        "Searching the web",
        "Finding relevant results",
    ],
    "fetching": [
        "Gathering relevant data",
        "Reading sources",
        "Pulling in content",
        "Collecting information",
    ],
    "synthesizing": [
        "Preparing your answer",
        "Putting it all together",
        "Synthesizing findings",
    ],
    "image_analysis": [
        "Analyzing provided content",
        "Examining the image",
        "Processing visual input",
    ],
    "generating": [
        "Generating results",
        "Creating your response",
        "Building the answer",
    ],
    "generating_image": [
        "Generating image, this may take 10-15 seconds",
        "Creating your image, hang tight for about 10-15s",
        "Image generation in progress, usually takes 10-15 seconds",
    ],
    "image_generated": [
        "Image generated, preparing final response",
        "Image ready, putting together your answer",
        "Image created, finalizing response",
    ],
    "preparing": [
        "Preparing next step",
        "Processing results",
        "Reviewing gathered data",
    ],
    "finalizing": [
        "Finalizing response",
        "Wrapping up",
        "Almost there",
    ],
    "complete": [
        "Done",
        "All done",
        "Complete",
    ],
}

# Stale status refresh messages — used when any status persists > threshold
STALE_REFRESH_MESSAGES = [
    "Still working on it",
    "Hang tight, processing",
    "Almost there, still gathering info",
    "Taking a bit longer than usual",
    "Working through the details",
]


def get_status_message(operation: str) -> str:
    """Pick a random TASK-wrapped message for the given operation."""
    variants = STATUS_MESSAGES.get(operation)
    if not variants:
        return "<TASK>Processing</TASK>"
    return f"<TASK>{random.choice(variants)}</TASK>"


def get_stale_refresh_message() -> str:
    """Pick a random stale-refresh TASK message."""
    return f"<TASK>{random.choice(STALE_REFRESH_MESSAGES)}</TASK>"


class SSEStatusTracker:
    """
    Tracks the last SSE INFO event time and emits refresh events
    when the current status has been stale for too long.

    Usage in the pipeline:
        tracker = SSEStatusTracker(emit_event, stale_threshold=10.0)
        tracker.emit("searching")          # emits a search status
        ...
        # Call periodically (e.g. before/after long operations):
        refreshed = yield from tracker.refresh_if_stale()
    """

    def __init__(
        self,
        emit_fn: Callable,
        stale_threshold: float = 10.0,
    ):
        self.emit_fn = emit_fn
        self.stale_threshold = stale_threshold
        self._last_emit_time: float = time.monotonic()
        self._last_operation: Optional[str] = None

    def emit(self, operation: str) -> Optional[str]:
        """Emit a status event and reset the staleness timer. Returns the SSE string or None."""
        self._last_operation = operation
        self._last_emit_time = time.monotonic()
        msg = get_status_message(operation)
        return self.emit_fn("INFO", msg)

    def is_stale(self) -> bool:
        return (time.monotonic() - self._last_emit_time) >= self.stale_threshold

    def refresh_if_stale(self) -> Optional[str]:
        """If the last status was emitted > threshold seconds ago, emit a refresh.
        Returns the SSE string or None."""
        if not self.is_stale():
            return None
        self._last_emit_time = time.monotonic()
        msg = get_stale_refresh_message()
        return self.emit_fn("INFO", msg)

    def touch(self) -> None:
        """Reset the staleness timer without emitting."""
        self._last_emit_time = time.monotonic()
