"""Text segmentation — break documents into scoreable chunks."""

import nltk

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)

from nltk.tokenize import sent_tokenize

from app.core.config import SEGMENT_TARGET_WORDS


def segment_text(text: str, target_words: int = SEGMENT_TARGET_WORDS) -> list[str]:
    """Break text into ~target_words-sized chunks preserving sentence boundaries.

    Returns a list of text segments, each roughly target_words long.
    """
    sentences = sent_tokenize(text)
    if not sentences:
        return [text] if text.strip() else []

    segments = []
    current_chunk = []
    current_words = 0

    for sentence in sentences:
        word_count = len(sentence.split())

        # If adding this sentence exceeds target and we have content, flush
        if current_words + word_count > target_words * 1.3 and current_chunk:
            segments.append(" ".join(current_chunk))
            current_chunk = []
            current_words = 0

        current_chunk.append(sentence)
        current_words += word_count

    # Flush remaining
    if current_chunk:
        # If last chunk is tiny, merge with previous
        if segments and current_words < target_words * 0.3:
            segments[-1] += " " + " ".join(current_chunk)
        else:
            segments.append(" ".join(current_chunk))

    return segments


def segment_by_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs (double newline separated)."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return paragraphs if paragraphs else [text.strip()] if text.strip() else []
