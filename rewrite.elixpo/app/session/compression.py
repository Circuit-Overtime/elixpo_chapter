"""Context compression — summarize sections for context window management."""

import logging

from app.core.llm import chat

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """Summarize the following section in 2-3 sentences. Preserve all key facts, data points, and conclusions. Be concise.

Section:
{text}"""


def summarize_section(text: str, model: str | None = None) -> str:
    """Summarize a section of text using LLM for context compression."""
    try:
        result = chat(
            messages=[
                {"role": "system", "content": "You are a precise summarizer. Output only the summary, nothing else."},
                {"role": "user", "content": SUMMARY_PROMPT.format(text=text)},
            ],
            model=model,
            temperature=0.3,
            max_tokens=200,
        )
        return result.strip()
    except Exception as e:
        logger.warning("Section summarization failed: %s", e)
        # Fallback: truncate to first 100 words
        words = text.split()
        return " ".join(words[:100]) + ("..." if len(words) > 100 else "")


def build_sliding_context(
    sections: list[str],
    current_index: int,
    model: str | None = None,
    max_context_words: int = 2000,
) -> str:
    """Build context window with full text for current section, summaries for others.

    Args:
        sections: List of section texts.
        current_index: Index of the section being processed (gets full text).
        model: LLM model for summarization.
        max_context_words: Target word budget.

    Returns:
        Combined context string.
    """
    if not sections:
        return ""

    parts = []
    current_text = sections[current_index]
    current_words = len(current_text.split())
    remaining_budget = max_context_words - current_words

    # Summarize surrounding sections
    for i, section in enumerate(sections):
        if i == current_index:
            parts.append(f"[CURRENT SECTION {i + 1}]\n{section}")
        elif remaining_budget > 50:
            summary = summarize_section(section, model=model)
            summary_words = len(summary.split())
            if summary_words <= remaining_budget:
                parts.append(f"[SECTION {i + 1} SUMMARY]\n{summary}")
                remaining_budget -= summary_words
            else:
                # Budget exhausted, just note the section exists
                parts.append(f"[SECTION {i + 1}] (omitted for brevity)")
        else:
            parts.append(f"[SECTION {i + 1}] (omitted for brevity)")

    return "\n\n".join(parts)
