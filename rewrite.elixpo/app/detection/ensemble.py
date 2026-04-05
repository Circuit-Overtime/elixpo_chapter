"""Ensemble detector — combines heuristics + LLM judge into final score."""

import logging

from app.core.config import ENSEMBLE_WEIGHTS, HEURISTIC_WEIGHTS
from app.detection.heuristics import score_all
from app.detection.linguistic import score_all_linguistic
from app.detection.llm_judge import judge
from app.detection.segment import segment_text

logger = logging.getLogger(__name__)


def _verdict(score: float) -> str:
    if score >= 75:
        return "Very likely AI-generated"
    if score >= 55:
        return "Likely AI-generated"
    if score >= 40:
        return "Mixed / Uncertain"
    if score >= 25:
        return "Likely human-written"
    return "Very likely human-written"


def detect(text: str, use_llm_judge: bool = True, model: str | None = None) -> dict:
    """Run ensemble detection on text.

    Combines heuristic scores with LLM judge (if enabled).
    Falls back to heuristic-only weights if LLM judge fails or is disabled.

    Returns:
        dict with 'score', 'verdict', 'features', and optionally 'llm_reasoning'.
    """
    # Heuristic + linguistic features
    features = score_all(text)
    features.update(score_all_linguistic(text))

    llm_result = None
    if use_llm_judge:
        llm_result = judge(text, model=model)
        features["llm_judge"] = llm_result["score"]

    # Choose weights based on whether LLM judge is available
    if "llm_judge" in features and llm_result and "unavailable" not in llm_result.get("reasoning", "").lower():
        weights = ENSEMBLE_WEIGHTS
    else:
        weights = HEURISTIC_WEIGHTS
        features.pop("llm_judge", None)

    total = sum(features.get(k, 0) * w for k, w in weights.items())

    result = {
        "score": round(total, 1),
        "verdict": _verdict(total),
        "features": {k: round(v, 1) for k, v in features.items()},
    }

    if llm_result:
        result["llm_reasoning"] = llm_result.get("reasoning", "")

    return result


def detect_heuristic_only(text: str) -> dict:
    """Run detection without LLM judge (heuristic + linguistic). Fast path."""
    features = score_all(text)
    features.update(score_all_linguistic(text))
    total = sum(features.get(k, 0) * w for k, w in HEURISTIC_WEIGHTS.items())

    return {
        "score": round(total, 1),
        "verdict": _verdict(total),
        "features": {k: round(v, 1) for k, v in features.items()},
    }


def detect_segments(
    text: str,
    use_llm_judge: bool = True,
    model: str | None = None,
) -> dict:
    """Run segment-level detection. Scores each ~150-word chunk independently.

    Returns:
        dict with 'overall_score', 'overall_verdict', 'segments' list,
        and per-segment scores.
    """
    segments = segment_text(text)

    if not segments:
        return {
            "overall_score": 0,
            "overall_verdict": "Very likely human-written",
            "segments": [],
        }

    segment_results = []
    for seg in segments:
        result = detect(seg, use_llm_judge=use_llm_judge, model=model)
        segment_results.append({
            "text": seg,
            "score": result["score"],
            "verdict": result["verdict"],
            "features": result["features"],
        })

    # Overall score = weighted average by segment length
    total_words = sum(len(s["text"].split()) for s in segment_results)
    if total_words > 0:
        overall = sum(
            s["score"] * len(s["text"].split()) / total_words
            for s in segment_results
        )
    else:
        overall = 0

    return {
        "overall_score": round(overall, 1),
        "overall_verdict": _verdict(overall),
        "segments": segment_results,
    }
