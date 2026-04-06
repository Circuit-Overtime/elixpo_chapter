"""Core LLM rewriting engine with semantic similarity verification."""

import logging

from app.core.llm import chat
from app.core.config import (
    DEFAULT_MODEL,
    PARAPHRASE_MAX_RETRIES,
    PARAPHRASE_INTENSITIES,
    SIMILARITY_THRESHOLD,
)
from app.detection.ensemble import detect_heuristic_only
from app.paraphrase.prompts import build_messages
from app.paraphrase.postprocess import postprocess

logger = logging.getLogger(__name__)


def _check_similarity(original: str, rewritten: str) -> float:
    """Check semantic similarity. Returns 0.0-1.0. Falls back to 1.0 if embeddings unavailable."""
    try:
        from app.core.embeddings import similarity
        return similarity(original, rewritten)
    except Exception as e:
        logger.debug("Embedding similarity unavailable: %s — skipping check", e)
        return 1.0


def paraphrase(
    text: str,
    intensity: str = "medium",
    model: str | None = None,
    domain: str = "general",
    max_retries: int = PARAPHRASE_MAX_RETRIES,
    check_similarity: bool = True,
) -> dict:
    """Paraphrase text to bypass AI detection.

    Args:
        text: The input text to paraphrase.
        intensity: "light", "medium", or "aggressive".
        model: Pollinations model ID (defaults to config DEFAULT_MODEL).
        domain: Domain for prompt specialization.
        max_retries: Max re-rewrite attempts if score stays high.
        check_similarity: Whether to verify semantic similarity via embeddings.

    Returns:
        dict with 'rewritten', 'original_score', 'final_score', 'attempts',
        'similarity', 'final_verdict', 'final_features'.
    """
    model = model or DEFAULT_MODEL

    # Score the original
    original_result = detect_heuristic_only(text)
    original_score = original_result["score"]

    # Low temperatures produce more coherent, human-like text
    temp_schedule = [0.6, 0.7, 0.8]

    best_text = text
    best_score = original_score
    best_similarity = 1.0
    attempts = 0
    original_text = text  # preserve original for retries

    # Start aggressive — light/medium don't reduce scores enough
    current_intensity = "aggressive" if intensity != "light" else intensity

    for attempt in range(1, max_retries + 1):
        attempts = attempt
        temperature = temp_schedule[min(attempt - 1, len(temp_schedule) - 1)]

        # Build detection feedback from best attempt so far
        feedback = ""
        if attempt > 1 and best_score > 35:
            from app.paraphrase.prompts import build_detection_feedback
            best_result = detect_heuristic_only(best_text)
            feedback = build_detection_feedback(best_text, best_result["features"])

        messages = build_messages(
            original_text, intensity=current_intensity, domain=domain,
            feedback=feedback,
        )
        rewritten = chat(
            messages=messages,
            model=model,
            temperature=temperature,
            seed=-1,
        )

        # Post-process
        rewritten = postprocess(rewritten)

        # Score the output
        result = detect_heuristic_only(rewritten)
        score = result["score"]

        # Check semantic similarity
        sim = 1.0
        if check_similarity:
            sim = _check_similarity(original_text, rewritten)
            if sim < SIMILARITY_THRESHOLD:
                logger.warning(
                    "Attempt %d: similarity %.2f below threshold %.2f — rejecting",
                    attempt, sim, SIMILARITY_THRESHOLD,
                )
                continue

        if score < best_score:
            best_text = rewritten
            best_score = score
            best_similarity = sim

        # Good enough
        if score < 35:
            break

    final_result = detect_heuristic_only(best_text)

    return {
        "rewritten": best_text,
        "original_score": round(original_score, 1),
        "final_score": round(final_result["score"], 1),
        "final_verdict": final_result["verdict"],
        "final_features": final_result["features"],
        "attempts": attempts,
        "similarity": round(best_similarity, 3),
    }
