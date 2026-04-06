"""Targeted rewriting — only rewrite segments that score above threshold."""

import logging

from app.core.config import PARAPHRASE_TARGET_SCORE, PARAPHRASE_MAX_RETRIES
from app.detection.ensemble import detect_heuristic_only
from app.detection.segment import segment_by_paragraphs
from app.paraphrase.rewriter import paraphrase

logger = logging.getLogger(__name__)


def targeted_rewrite(
    text: str,
    model: str | None = None,
    domain: str = "general",
    threshold: float = PARAPHRASE_TARGET_SCORE,
    max_retries: int = PARAPHRASE_MAX_RETRIES,
) -> dict:
    """Only rewrite paragraphs scoring above threshold.

    Feeds surrounding context (prev + next paragraph) for coherence.

    Returns:
        dict with 'rewritten' (full text), 'original_score', 'final_score',
        'segments' (per-paragraph details), 'flagged_count', 'rewritten_count'.
    """
    paragraphs = segment_by_paragraphs(text)

    if not paragraphs:
        return {
            "rewritten": text,
            "original_score": 0,
            "final_score": 0,
            "segments": [],
            "flagged_count": 0,
            "rewritten_count": 0,
        }

    # Score each paragraph
    scores = []
    for p in paragraphs:
        result = detect_heuristic_only(p)
        scores.append(result["score"])

    # Identify flagged paragraphs
    flagged = [i for i, s in enumerate(scores) if s > threshold]

    # Rewrite flagged paragraphs with context
    result_paragraphs = list(paragraphs)
    segment_details = []
    rewritten_count = 0

    for i, para in enumerate(paragraphs):
        original_score = scores[i]
        detail = {
            "index": i,
            "original_score": round(original_score, 1),
            "final_score": round(original_score, 1),
            "was_rewritten": False,
            "attempts": 0,
            "needs_manual_review": False,
        }

        if i in flagged:
            # Build surrounding context
            context_parts = []
            if i > 0:
                context_parts.append(f"[Previous paragraph]: {paragraphs[i - 1]}")
            if i < len(paragraphs) - 1:
                context_parts.append(f"[Next paragraph]: {paragraphs[i + 1]}")
            context = "\n".join(context_parts)

            # Attempt rewrite with escalating intensity
            best_text = para
            best_score = original_score
            intensities = ["light", "medium", "aggressive"]

            for attempt, intensity in enumerate(intensities[:max_retries], 1):
                try:
                    rewrite_result = paraphrase(
                        para,
                        intensity=intensity,
                        model=model,
                        domain=domain,
                        max_retries=1,  # single pass per intensity level
                    )

                    if rewrite_result["final_score"] < best_score:
                        best_text = rewrite_result["rewritten"]
                        best_score = rewrite_result["final_score"]

                    detail["attempts"] = attempt

                    if best_score <= threshold:
                        break

                except Exception as e:
                    logger.warning("Rewrite failed for paragraph %d: %s", i, e)
                    break

            result_paragraphs[i] = best_text
            detail["final_score"] = round(best_score, 1)
            detail["was_rewritten"] = True
            rewritten_count += 1

            if best_score > threshold:
                detail["needs_manual_review"] = True

        segment_details.append(detail)

    # Reassemble
    rewritten_text = "\n\n".join(result_paragraphs)

    # Score final text
    final_result = detect_heuristic_only(rewritten_text)
    original_result = detect_heuristic_only(text)

    return {
        "rewritten": rewritten_text,
        "original_score": round(original_result["score"], 1),
        "final_score": round(final_result["score"], 1),
        "final_verdict": final_result["verdict"],
        "segments": segment_details,
        "flagged_count": len(flagged),
        "rewritten_count": rewritten_count,
        "needs_review": [d for d in segment_details if d["needs_manual_review"]],
    }
