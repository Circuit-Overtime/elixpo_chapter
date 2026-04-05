"""Server-Sent Events endpoint for live session progress streaming."""

import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.api.jobs import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["sse"])


@router.get("/session/{session_id}/stream")
async def stream_session(session_id: str):
    """SSE stream of session progress.

    Frontend connects with EventSource:
        const es = new EventSource('/api/session/{id}/stream');
        es.onmessage = (e) => { const data = JSON.parse(e.data); ... };

    Events sent:
        - progress: { status, progress, paragraphs, result, error }
        - done: final state (connection closes)
        - error: error message (connection closes)
    """
    session = get_session(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")

    async def event_stream():
        last_progress = -1
        last_status = None
        stale_count = 0

        while True:
            session = get_session(session_id)
            if session is None:
                yield _sse_event("error", {"error": "Session expired"})
                return

            status = session.get("status", "pending")
            progress = session.get("progress", 0)

            # Only send if something changed
            if progress != last_progress or status != last_status:
                stale_count = 0
                last_progress = progress
                last_status = status

                payload = {
                    "status": status,
                    "progress": round(progress, 1),
                    "paragraphs": session.get("paragraphs", []),
                }

                if status == "completed":
                    payload["result"] = session.get("result")
                    yield _sse_event("done", payload)
                    return

                if status == "failed":
                    payload["error"] = session.get("error")
                    yield _sse_event("error", payload)
                    return

                yield _sse_event("progress", payload)
            else:
                stale_count += 1
                # Send keepalive comment every ~30s of no change
                if stale_count % 15 == 0:
                    yield ": keepalive\n\n"
                # Timeout after 10 minutes of no change
                if stale_count > 300:
                    yield _sse_event("error", {"error": "Timeout — no progress for 10 minutes"})
                    return

            await asyncio.sleep(2)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _sse_event(event: str, data: dict) -> str:
    """Format an SSE event."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"
