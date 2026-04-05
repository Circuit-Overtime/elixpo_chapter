"""Session polling and report download endpoints."""

import os
import tempfile
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.api.schemas import JobResponse, JobStatus
from app.api.jobs import get_session
from app.detection.ensemble import detect_heuristic_only
from app.document.structure import Document
from app.document.report import generate_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/session/{session_id}", response_model=JobResponse)
def poll_session(session_id: str):
    """Poll session status and per-paragraph progress.

    Frontend should poll this every 2-3 seconds while status is 'running'.
    The session_id is stable across reloads — store it in localStorage.
    """
    session = get_session(session_id)
    if session is None:
        raise HTTPException(404, "Session not found or expired")

    return JobResponse(
        job_id=session_id,
        status=JobStatus(session["status"]),
        progress=session.get("progress", 0),
        paragraphs=session.get("paragraphs", []),
        result=session.get("result"),
        error=session.get("error"),
    )


@router.get("/session/{session_id}/report")
def download_report(session_id: str):
    """Generate and download a PDF report for a completed session."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(404, "Session not found or expired")

    if session["status"] != JobStatus.completed.value:
        raise HTTPException(409, f"Session is {session['status']}, not completed")

    result = session.get("result")
    if not result or "rewritten" not in result:
        raise HTTPException(500, "Session result missing rewritten text")

    rewritten_text = result["rewritten"]
    doc = Document.from_text(rewritten_text)

    seg_scores = []
    for para in doc.paragraphs:
        if len(para.text.strip()) < 30:
            seg_scores.append({"score": 0, "verdict": "Too short", "text": para.text})
        else:
            r = detect_heuristic_only(para.text)
            seg_scores.append({"score": r["score"], "verdict": r["verdict"], "text": para.text})

    overall = detect_heuristic_only(rewritten_text)

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp.close()

    try:
        generate_report(
            document=doc,
            segment_scores=seg_scores,
            overall_score=overall["score"],
            overall_verdict=overall["verdict"],
            features=overall.get("features", {}),
            output_path=tmp.name,
        )
        return FileResponse(
            tmp.name,
            media_type="application/pdf",
            filename=f"rewrite_report_{session_id}.pdf",
        )
    except Exception as e:
        os.unlink(tmp.name)
        raise HTTPException(500, f"Report generation failed: {e}")


# Keep legacy /api/job/{id} route for backwards compat
@router.get("/job/{job_id}", response_model=JobResponse)
def poll_job_legacy(job_id: str):
    """Legacy endpoint — redirects to session polling."""
    return poll_session(job_id)


@router.get("/report/{job_id}/pdf")
def download_report_legacy(job_id: str):
    """Legacy endpoint — redirects to session report."""
    return download_report(job_id)
