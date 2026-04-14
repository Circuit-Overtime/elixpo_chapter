"""Server-Sent Events endpoints for live progress streaming."""

import asyncio
import json
import logging
import concurrent.futures

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.jobs import get_session
from app.detection.ensemble import detect_heuristic_only
from app.detection.segment import segment_by_paragraphs, is_prose_paragraph

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["sse"])

# Thread pool for running blocking detection in async context
_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


# =====================================================================
# Detection SSE — streams per-paragraph AI scores as they're computed
# =====================================================================

class DetectStreamRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=100_000)


@router.post("/detect/stream")
async def stream_detect(req: DetectStreamRequest):
    """SSE stream for detection — scores each paragraph and streams results live.

    Events:
        - init: { total_paragraphs }
        - paragraph: { index, text_preview, score, verdict }
        - done: { overall_score, overall_verdict, features, segments }
        - error: { error }
    """
    text = req.text.strip()
    paragraphs = segment_by_paragraphs(text)

    if not paragraphs:
        raise HTTPException(422, "No paragraphs found in text")

    async def event_stream():
        loop = asyncio.get_event_loop()

        # Send init
        yield _sse_event("init", {"total_paragraphs": len(paragraphs)})

        segments = []
        try:
            for i, para in enumerate(paragraphs):
                if not is_prose_paragraph(para) or len(para.strip()) < 30:
                    result = {"score": 0, "verdict": "Skipped", "features": {}}
                else:
                    # Run blocking detection in thread pool
                    result = await loop.run_in_executor(_executor, detect_heuristic_only, para)

                seg = {
                    "index": i,
                    "text_preview": para[:150],
                    "score": round(result["score"], 1),
                    "verdict": result["verdict"],
                }
                segments.append(seg)

                yield _sse_event("paragraph", {
                    **seg,
                    "progress": round(((i + 1) / len(paragraphs)) * 100, 1),
                })

            # Overall score on full text
            overall = await loop.run_in_executor(_executor, detect_heuristic_only, text)

            yield _sse_event("done", {
                "overall_score": round(overall["score"], 1),
                "overall_verdict": overall["verdict"],
                "features": overall.get("features", {}),
                "segments": segments,
            })

        except Exception as e:
            logger.exception("Detection stream error: %s", e)
            yield _sse_event("error", {"error": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# =====================================================================
# Paraphrase session SSE — polls Redis for job progress
# =====================================================================

@router.get("/session/{session_id}/stream")
async def stream_session(session_id: str):
    """SSE stream of paraphrase session progress."""
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
                if stale_count % 15 == 0:
                    yield ": keepalive\n\n"
                if stale_count > 300:
                    yield _sse_event("error", {"error": "Timeout"})
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
