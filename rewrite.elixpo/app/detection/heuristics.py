"""Heuristic AI text detector.

Scores text on multiple statistical signals that distinguish AI-generated
from human writing. Returns per-feature scores (0-100, higher = more AI-like).
"""

import math
import re
from collections import Counter

import nltk

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)

from nltk.tokenize import sent_tokenize, word_tokenize

# --- AI vocabulary markers ---
AI_MARKERS = [
    "delve", "crucial", "notably", "moreover", "furthermore",
    "it is important to note", "it is worth noting", "in conclusion",
    "comprehensive", "multifaceted", "utilize", "leveraging",
    "groundbreaking", "paradigm", "holistic", "synergy",
    "robust", "seamless", "cutting-edge", "landscape",
    "facilitate", "endeavor", "intricate", "pivotal",
    "streamline", "harness", "foster", "bolster",
    "underscores", "underpin", "overarching", "tapestry",
    "realm", "embark", "commendable", "testament",
    "meticulous", "navigating", "ever-evolving",
    "in today's world", "in the realm of", "it's important to",
    "plays a crucial role", "a myriad of", "shed light on",
    "in light of", "a testament to", "serves as a",
    "it should be noted", "this is particularly",
]

AI_STRONG_MARKERS = [
    "as an ai", "as a language model", "i don't have personal",
    "it's worth mentioning", "in summary,", "to summarize,",
    "let me explain", "here's the thing",
]

AI_STARTERS = [
    "additionally", "furthermore", "moreover", "however",
    "consequently", "nevertheless", "in addition",
    "it is", "this is", "there are", "there is",
    "one of the", "when it comes to",
]


def _sentence_lengths(sentences: list[str]) -> list[int]:
    return [len(word_tokenize(s)) for s in sentences if s.strip()]


def score_burstiness(sentences: list[str]) -> float:
    """Score burstiness (sentence length variance). Low variance = AI-like."""
    lengths = _sentence_lengths(sentences)
    if len(lengths) < 3:
        return 50.0

    mean = sum(lengths) / len(lengths)
    if mean == 0:
        return 50.0

    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
    cv = math.sqrt(variance) / mean

    ai_score = max(0, min(100, (1 - cv / 0.6) * 100))
    return ai_score


def score_vocabulary_markers(text: str) -> float:
    """Score based on AI vocabulary marker frequency."""
    text_lower = text.lower()
    word_count = len(text_lower.split())
    if word_count == 0:
        return 0.0

    marker_hits = sum(text_lower.count(m) for m in AI_MARKERS)
    strong_hits = sum(text_lower.count(m) for m in AI_STRONG_MARKERS)

    if strong_hits > 0:
        return min(100, 70 + strong_hits * 15)

    density = (marker_hits / word_count) * 100
    return max(0, min(100, density * 33))


def score_type_token_ratio(words: list[str]) -> float:
    """Score lexical diversity. Low diversity = AI-like."""
    if len(words) < 20:
        return 50.0

    window = min(100, len(words))
    ttrs = []
    for i in range(0, len(words) - window + 1, window // 2):
        chunk = words[i : i + window]
        unique = len(set(w.lower() for w in chunk))
        ttrs.append(unique / len(chunk))

    avg_ttr = sum(ttrs) / len(ttrs)
    return max(0, min(100, (0.75 - avg_ttr) / 0.25 * 100))


def score_sentence_starter_variety(sentences: list[str]) -> float:
    """Score based on how varied sentence openings are."""
    if len(sentences) < 5:
        return 50.0

    starters = []
    for s in sentences:
        words = s.strip().split()
        if words:
            starters.append(words[0].lower())

    counter = Counter(starters)
    total = len(starters)
    unique_ratio = len(counter) / total

    ai_starter_count = sum(
        1 for s in starters if any(s.startswith(a.split()[0]) for a in AI_STARTERS)
    )
    ai_starter_ratio = ai_starter_count / total

    variety_score = max(0, min(100, (1 - unique_ratio) * 150))
    starter_score = max(0, min(100, ai_starter_ratio * 200))
    return min(100, variety_score * 0.5 + starter_score * 0.5)


def score_paragraph_structure(text: str) -> float:
    """Score paragraph uniformity. Uniform paragraphs = AI-like."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(paragraphs) < 3:
        return 50.0

    lengths = [len(p.split()) for p in paragraphs]
    mean = sum(lengths) / len(lengths)
    if mean == 0:
        return 50.0

    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
    cv = math.sqrt(variance) / mean
    return max(0, min(100, (1 - cv / 0.5) * 100))


def score_punctuation_diversity(text: str) -> float:
    """Score punctuation patterns. AI underuses dashes, semicolons, parentheses."""
    if len(text) < 100:
        return 50.0

    chars = len(text)
    human_punct = sum(text.count(c) for c in [";", "\u2014", "\u2013", "-", "(", ")", ":", "!"])
    density = human_punct / chars * 100

    return max(0, min(100, (1.5 - density) / 1.5 * 100))


def score_all(text: str) -> dict[str, float]:
    """Run all heuristic scorers. Returns feature name → score (0-100)."""
    sentences = sent_tokenize(text)
    words = word_tokenize(text)

    return {
        "burstiness": round(score_burstiness(sentences), 1),
        "vocabulary_markers": round(score_vocabulary_markers(text), 1),
        "type_token_ratio": round(score_type_token_ratio(words), 1),
        "sentence_starters": round(score_sentence_starter_variety(sentences), 1),
        "paragraph_structure": round(score_paragraph_structure(text), 1),
        "punctuation_diversity": round(score_punctuation_diversity(text), 1),
    }
