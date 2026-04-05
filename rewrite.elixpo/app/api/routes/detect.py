"""Detection endpoints."""

import os
import tempfile
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.api.schemas import (
    DetectTextRequest,
    DetectResponse,
    SegmentScore,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
)
from app.detection.ensemble import detect, detect_heuristic_only, detect_segments
from app.document.parser import parse_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["detection"])


@router.post("/detect", response_model=DetectResponse)
def detect_text(req: DetectTextRequest):
    """Detect AI-generated content in text."""
    text = req.text.strip()

    if req.segments:
        seg_result = detect_segments(
            text, use_llm_judge=req.use_llm_judge,
        )
        segments = [
            SegmentScore(index=i, text=s["text"][:200], score=s["score"], verdict=s["verdict"])
            for i, s in enumerate(seg_result["segments"])
        ]
        return DetectResponse(
            score=seg_result["overall_score"],
            verdict=seg_result["overall_verdict"],
            features=seg_result.get("features", {}),
            segments=segments,
        )

    if req.use_llm_judge:
        result = detect(text)
    else:
        result = detect_heuristic_only(text)

    return DetectResponse(
        score=result["score"],
        verdict=result["verdict"],
        features=result.get("features", {}),
    )


@router.post("/detect/file", response_model=DetectResponse)
async def detect_file(
    file: UploadFile = File(...),
    use_llm_judge: bool = Form(True),
    segments: bool = Form(False),
):
    """Detect AI-generated content in an uploaded file."""
    _validate_upload(file)

    # Save to temp file for parsing
    ext = os.path.splitext(file.filename or "")[1].lower()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(413, f"File too large. Max size: {MAX_FILE_SIZE // 1024 // 1024} MB")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        doc = parse_file(tmp_path)
        text = doc.text

        if len(text.strip()) < 50:
            raise HTTPException(422, "Extracted text too short (< 50 characters)")

        # Reuse the text endpoint logic
        req = DetectTextRequest(text=text[:100_000], use_llm_judge=use_llm_judge, segments=segments)
        return detect_text(req)
    finally:
        os.unlink(tmp_path)


def _validate_upload(file: UploadFile):
    """Validate uploaded file type."""
    if not file.filename:
        raise HTTPException(400, "Filename required")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            415,
            f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
