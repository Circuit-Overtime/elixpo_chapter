"""Post-processing pipeline — marker removal, global coherence, length normalization."""

import re
import random
import math

import nltk

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)

from nltk.tokenize import sent_tokenize

# --- Marker word substitutions (catch stragglers the LLM missed) ---
MARKER_REPLACEMENTS = {
    "delve": "explore",
    "crucial": "key",
    "moreover": "also",
    "furthermore": "and",
    "utilize": "use",
    "leveraging": "using",
    "comprehensive": "thorough",
    "facilitate": "help",
    "robust": "strong",
    "seamless": "smooth",
    "groundbreaking": "new",
    "paradigm": "model",
    "pivotal": "central",
    "intricate": "complex",
    "multifaceted": "varied",
    "endeavor": "effort",
    "streamline": "simplify",
    "harness": "use",
    "foster": "encourage",
    "bolster": "support",
    "meticulous": "careful",
    "commendable": "impressive",
    "tapestry": "mix",
    "realm": "area",
    "embark": "start",
    "holistic": "overall",
    "synergy": "combination",
    "overarching": "broad",
    "underscores": "highlights",
    "underpin": "support",
    "testament": "proof",
    "navigating": "working through",
    "ever-evolving": "changing",
    "notably": "especially",
    "landscape": "field",
    "cutting-edge": "latest",
    "encompasses": "includes",
    "showcasing": "showing",
    "underscoring": "showing",
    "demonstrating": "showing",
    "showcases": "shows",
    "noteworthy": "worth noting",
    "elevate": "improve",
    "enhance": "improve",
    "enhancing": "improving",
    "myriad": "many",
    "plethora": "many",
    "underpinning": "supporting",
    "spearheading": "leading",
    "interplay": "interaction",
    "underscore": "highlight",
    "elucidating": "explaining",
    "elucidate": "explain",
    "advent": "arrival",
    "cornerstone": "foundation",
    "exemplifies": "shows",
    "intrinsic": "built-in",
    "inherently": "naturally",
}

PHRASE_REPLACEMENTS = {
    "it is important to note": "note that",
    "it is worth noting": "worth noting:",
    "in today's world": "today",
    "in the realm of": "in",
    "plays a crucial role": "matters significantly",
    "a myriad of": "many",
    "shed light on": "clarify",
    "in light of": "given",
    "a testament to": "evidence of",
    "serves as a": "is a",
    "it should be noted": "note that",
    "this is particularly": "this is especially",
}


def replace_markers(text: str) -> str:
    """Replace AI marker words with alternatives."""
    result = text

    for old, new in PHRASE_REPLACEMENTS.items():
        pattern = re.compile(re.escape(old), re.IGNORECASE)
        result = pattern.sub(
            lambda m: new.capitalize() if m.group(0)[0].isupper() else new,
            result,
        )

    for old, new in MARKER_REPLACEMENTS.items():
        def _replace(match, replacement=new):
            word = match.group(0)
            if word[0].isupper():
                return replacement.capitalize()
            return replacement
        result = re.sub(rf"\b{re.escape(old)}\b", _replace, result, flags=re.IGNORECASE)

    return result


def normalize_length(rewritten: str, original: str, tolerance: float = 0.25) -> str:
    """Trim rewritten text if it's significantly longer than the original.

    LLMs tend to expand text when rewriting. This caps the output to within
    tolerance of the original word count.
    """
    orig_words = len(original.split())
    rewritten_words = len(rewritten.split())

    if orig_words == 0:
        return rewritten

    ratio = rewritten_words / orig_words
    if ratio <= 1.0 + tolerance:
        return rewritten  # within bounds

    # Trim from the end, preserving complete sentences
    target = int(orig_words * (1.0 + tolerance))
    sentences = sent_tokenize(rewritten)
    result = []
    word_count = 0

    for sent in sentences:
        sent_words = len(sent.split())
        if word_count + sent_words > target and result:
            break
        result.append(sent)
        word_count += sent_words

    return " ".join(result)


def postprocess(text: str) -> str:
    """Per-paragraph post-processing: marker removal + length check."""
    text = replace_markers(text)
    return text


# =========================================================================
# GLOBAL POST-PROCESSING — runs on the full reassembled document
# =========================================================================

def global_postprocess(paragraphs: list[str], original_paragraphs: list[str]) -> list[str]:
    """Post-process the full document after all paragraphs have been rewritten.

    Fixes cross-paragraph issues:
    1. Repeated sentence starters across the document
    2. Paragraph length normalization (match original lengths)
    3. Repeated transitional phrases
    """
    result = list(paragraphs)

    # 1. Fix repeated starters across consecutive paragraphs
    result = _fix_cross_paragraph_starters(result)

    # 2. Normalize paragraph lengths against originals
    for i in range(len(result)):
        if i < len(original_paragraphs):
            result[i] = normalize_length(result[i], original_paragraphs[i])

    # 3. Fix repeated transitional patterns across the document
    result = _fix_repeated_transitions(result)

    return result


def _fix_cross_paragraph_starters(paragraphs: list[str]) -> list[str]:
    """Ensure no two consecutive paragraphs start with the same word/pattern."""
    result = list(paragraphs)

    for i in range(1, len(result)):
        prev_start = _get_opener(result[i - 1])
        curr_start = _get_opener(result[i])

        if prev_start and curr_start and prev_start == curr_start:
            result[i] = _rewrite_opener(result[i])

    return result


def _get_opener(text: str) -> str:
    """Get the first word of a paragraph, lowercased."""
    words = text.strip().split()
    return words[0].lower().rstrip(".,;:") if words else ""


def _rewrite_opener(text: str) -> str:
    """Change the opening of a paragraph to avoid repetition."""
    sentences = sent_tokenize(text)
    if not sentences:
        return text

    first = sentences[0]
    words = first.split()
    if len(words) < 2:
        return text

    opener = words[0].lower()

    # Rearrangement strategies
    alternatives = {
        "the": ["This", "A", "One", "Our"],
        "this": ["The", "One", "Such"],
        "we": ["Our", "The"],
        "it": ["The", "This"],
        "in": ["Within", "Across", "Throughout"],
        "these": ["The", "Such", "Our"],
        "our": ["The", "This"],
        "look": ["Consider", "Note that", "Examining"],
        "here": ["At this point", "In this section", "Now"],
        "so": ["Thus", "As a result", "Accordingly"],
        "and": ["Additionally", "Beyond this", "Further"],
    }

    if opener in alternatives:
        replacement = random.choice(alternatives[opener])
        words[0] = replacement
        # Fix case of second word if needed
        if len(words) > 1 and words[1][0].isupper() and opener not in ("i",):
            words[1] = words[1][0].lower() + words[1][1:]
        sentences[0] = " ".join(words)

    return " ".join(sentences)


def _fix_repeated_transitions(paragraphs: list[str]) -> list[str]:
    """Detect and vary repeated transitional phrases across the document."""
    result = list(paragraphs)

    # Count first-sentence starters across all paragraphs
    starters = []
    for p in result:
        sents = sent_tokenize(p)
        if sents:
            first_two = " ".join(sents[0].split()[:2]).lower()
            starters.append(first_two)
        else:
            starters.append("")

    # Find starters used more than twice
    from collections import Counter
    counts = Counter(starters)
    overused = {s for s, count in counts.items() if count > 2 and s}

    if not overused:
        return result

    # Fix: for the 3rd+ occurrence of any starter, rewrite the opener
    seen = Counter()
    for i, starter in enumerate(starters):
        if starter in overused:
            seen[starter] += 1
            if seen[starter] > 2:
                result[i] = _rewrite_opener(result[i])

    return result
