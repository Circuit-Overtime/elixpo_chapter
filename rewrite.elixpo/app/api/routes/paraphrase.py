"""Paraphrase endpoints — session-based, resumable background processing."""

import os
import tempfile
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.api.schemas import (
    ParaphraseTextRequest,
    ParaphraseResponse,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    Domain,
    Intensity,
    JobStatus,
)
from app.api.jobs import create_session, get_session, save_session, run_in_background
from app.detection.ensemble import detect_heuristic_only
from app.detection.segment import segment_by_paragraphs, is_prose_paragraph
from app.paraphrase.prompts import build_messages, build_detection_feedback
from app.paraphrase.postprocess import postprocess, normalize_length, global_postprocess
from app.core.llm import chat
from app.core.config import DEFAULT_MODEL

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["paraphrase"])


def _run_paraphrase(session_id: str):
    """Background task: paraphrase flagged paragraphs with full state persistence.

    Resumable: if the server crashed mid-job, calling this again with the same
    session_id picks up from the last completed paragraph.
    """
    session = get_session(session_id)
    if not session:
        raise RuntimeError(f"Session {session_id} not found")

    text = session["original_text"]
    intensity = session.get("intensity", "aggressive")
    domain = session.get("domain", "general")
    threshold = 20
    max_attempts = 5
    model = DEFAULT_MODEL

    paragraphs = segment_by_paragraphs(text)
    if not paragraphs:
        return {"rewritten": text, "original_score": 0, "final_score": 0, "paragraphs": []}

    # Check if we have existing state (resume scenario)
    para_progress = session.get("paragraphs", [])
    rewritten_paragraphs = session.get("rewritten_paragraphs", [])
    original_scores = session.get("original_scores", [])

    # Initialize state if fresh start
    if not para_progress or len(para_progress) != len(paragraphs):
        original_scores = []
        para_progress = []
        for i, para in enumerate(paragraphs):
            prose = is_prose_paragraph(para)
            if not prose or len(para.strip()) < 30:
                score_result = {"score": 0, "verdict": "Skipped", "features": {}}
            else:
                score_result = detect_heuristic_only(para)
            original_scores.append(score_result)
            para_progress.append({
                "index": i,
                "original_score": round(score_result["score"], 1),
                "current_score": None,
                "status": "skipped" if not prose else "pending",
                "attempts": 0,
                "max_attempts": 0,
                "reduction": 0,
                "text_preview": para[:80],
            })
        rewritten_paragraphs = list(paragraphs)

        # Persist initial scoring state
        session["paragraphs"] = para_progress
        session["rewritten_paragraphs"] = rewritten_paragraphs
        session["original_scores"] = [{"score": s["score"]} for s in original_scores]
        save_session(session_id, session)

    flagged = [
        (i, original_scores[i])
        for i in range(len(paragraphs))
        if original_scores[i]["score"] > threshold
        and para_progress[i]["status"] != "skipped"
    ]
    total_steps = len(flagged)

    if total_steps == 0:
        overall = detect_heuristic_only(text)
        return {
            "rewritten": text,
            "original_score": round(overall["score"], 1),
            "final_score": round(overall["score"], 1),
            "paragraphs": para_progress,
        }

    temp_schedule = [0.6, 0.7, 0.8, 0.85, 0.9]

    for step, (para_idx, score_info) in enumerate(flagged):
        # RESUME CHECK: skip paragraphs already completed
        if para_progress[para_idx]["status"] == "done":
            continue

        para_text = paragraphs[para_idx]
        original_score = score_info["score"]

        # Mark as rewriting + persist
        para_progress[para_idx]["status"] = "rewriting"
        para_progress[para_idx]["max_attempts"] = max_attempts
        completed_count = sum(1 for p in para_progress if p["status"] == "done")
        progress_pct = (completed_count / total_steps) * 100
        session["paragraphs"] = para_progress
        session["progress"] = progress_pct
        save_session(session_id, session)

        # Build context from neighbors
        context_parts = []
        if para_idx > 0:
            context_parts.append(f"[Previous]: {paragraphs[para_idx - 1][:200]}")
        if para_idx < len(paragraphs) - 1:
            context_parts.append(f"[Next]: {paragraphs[para_idx + 1][:200]}")
        context = "\n".join(context_parts)

        best_text = para_text
        best_score = original_score

        for attempt in range(max_attempts):
            temp = temp_schedule[min(attempt, len(temp_schedule) - 1)]

            # Update attempt count live
            para_progress[para_idx]["attempts"] = attempt + 1
            para_progress[para_idx]["current_score"] = round(best_score, 1)
            para_progress[para_idx]["reduction"] = round(original_score - best_score, 1)
            session["paragraphs"] = para_progress
            save_session(session_id, session)

            try:
                source = best_text if attempt > 0 else para_text
                fb_result = detect_heuristic_only(source)
                feedback = build_detection_feedback(source, fb_result["features"])

                messages = build_messages(
                    para_text, intensity="aggressive",
                    domain=domain, context=context,
                    feedback=feedback,
                )
                rewritten = chat(messages=messages, model=model, temperature=temp, seed=-1)
                rewritten = postprocess(rewritten)
                rewritten = normalize_length(rewritten, para_text)

                new_result = detect_heuristic_only(rewritten)
                new_score = new_result["score"]

                if new_score < best_score:
                    best_text = rewritten
                    best_score = new_score

                # Update live score after each attempt
                para_progress[para_idx]["current_score"] = round(best_score, 1)
                para_progress[para_idx]["reduction"] = round(original_score - best_score, 1)
                session["paragraphs"] = para_progress
                save_session(session_id, session)

                if best_score <= threshold:
                    break
            except Exception as e:
                logger.warning("Attempt %d failed for para %d: %s", attempt, para_idx, e)
                break

        # Save completed paragraph immediately (crash-safe)
        rewritten_paragraphs[para_idx] = best_text
        para_progress[para_idx]["current_score"] = round(best_score, 1)
        para_progress[para_idx]["status"] = "done"

        session["paragraphs"] = para_progress
        session["rewritten_paragraphs"] = rewritten_paragraphs
        completed_count = sum(1 for p in para_progress if p["status"] == "done")
        session["progress"] = (completed_count / total_steps) * 100
        save_session(session_id, session)

    # Global post-processing
    rewritten_paragraphs = global_postprocess(rewritten_paragraphs, paragraphs)

    final_text = "\n\n".join(rewritten_paragraphs)
    overall_before = detect_heuristic_only(text)
    overall_after = detect_heuristic_only(final_text)

    # Mark remaining as done
    for p in para_progress:
        if p["status"] == "pending":
            p["current_score"] = p["original_score"]
            p["status"] = "done"

    return {
        "rewritten": final_text,
        "original_score": round(overall_before["score"], 1),
        "final_score": round(overall_after["score"], 1),
        "paragraphs": para_progress,
    }


@router.post("/paraphrase", response_model=ParaphraseResponse)
def paraphrase_text(req: ParaphraseTextRequest):
    """Start a paraphrase job. Returns session_id for polling via GET /api/session/{id}."""
    text = req.text.strip()
    session_id = create_session()

    # Store the input text and config in the session
    session = get_session(session_id)
    session["original_text"] = text
    session["intensity"] = req.intensity.value
    session["domain"] = req.domain.value
    save_session(session_id, session)

    run_in_background(_run_paraphrase, session_id)
    return ParaphraseResponse(job_id=session_id)


@router.post("/paraphrase/file", response_model=ParaphraseResponse)
async def paraphrase_file(
    file: UploadFile = File(...),
    intensity: Intensity = Form(Intensity.aggressive),
    domain: Domain = Form(Domain.general),
):
    """Start a paraphrase job from an uploaded file."""
    if not file.filename:
        raise HTTPException(400, "Filename required")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(415, f"Unsupported file type '{ext}'")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File too large. Max: {MAX_FILE_SIZE // 1024 // 1024} MB")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        from app.document.parser import parse_file
        doc = parse_file(tmp_path)
        text = doc.text
    finally:
        os.unlink(tmp_path)

    if len(text.strip()) < 50:
        raise HTTPException(422, "Extracted text too short (< 50 characters)")

    session_id = create_session()
    session = get_session(session_id)
    session["original_text"] = text[:100_000]
    session["intensity"] = intensity.value
    session["domain"] = domain.value
    session["filename"] = file.filename
    save_session(session_id, session)

    run_in_background(_run_paraphrase, session_id)
    return ParaphraseResponse(job_id=session_id)


@router.post("/session/{session_id}/resume")
def resume_session(session_id: str):
    """Resume a failed or interrupted session from where it left off."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired")

    status = session.get("status")
    if status == JobStatus.completed.value:
        return {"message": "Session already completed", "session_id": session_id}
    if status == JobStatus.running.value:
        return {"message": "Session is already running", "session_id": session_id}

    if not session.get("original_text"):
        raise HTTPException(422, "Session has no text to process")

    # Reset status and re-run (will skip already-completed paragraphs)
    session["status"] = JobStatus.pending.value
    session["error"] = None
    save_session(session_id, session)

    run_in_background(_run_paraphrase, session_id)
    return {"message": "Session resumed", "session_id": session_id}
