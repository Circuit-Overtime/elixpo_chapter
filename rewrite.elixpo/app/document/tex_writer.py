"""LaTeX output writer — swap paragraph text while preserving full .tex structure.

Takes the original .tex source and a list of rewritten paragraphs,
maps each rewritten paragraph back into the .tex body, and outputs
a compilable .tex file.
"""

import re
import logging

logger = logging.getLogger(__name__)


def rewrite_tex(
    original_tex: str,
    original_paragraphs: list[str],
    rewritten_paragraphs: list[str],
) -> str:
    """Replace paragraph text in original .tex with rewritten versions.

    Preserves all LaTeX commands, preamble, math, figures, tables, etc.
    Only swaps the body text that was extracted and rewritten.

    Args:
        original_tex: Full original .tex source.
        original_paragraphs: Extracted plain-text paragraphs (from parser).
        rewritten_paragraphs: Corresponding rewritten paragraphs.

    Returns:
        Modified .tex source with rewritten paragraphs.
    """
    if len(original_paragraphs) != len(rewritten_paragraphs):
        raise ValueError(
            f"Paragraph count mismatch: {len(original_paragraphs)} original "
            f"vs {len(rewritten_paragraphs)} rewritten"
        )

    # Extract body between \begin{document} and \end{document}
    body_match = re.search(
        r"(\\begin\{document\})(.*?)(\\end\{document\})",
        original_tex, re.DOTALL,
    )
    if not body_match:
        logger.warning("No \\begin{document} found — replacing in full text")
        return _replace_in_text(original_tex, original_paragraphs, rewritten_paragraphs)

    preamble = original_tex[:body_match.start()]
    begin_doc = body_match.group(1)
    body = body_match.group(2)
    end_doc = body_match.group(3)
    after = original_tex[body_match.end():]

    # Replace paragraphs in body
    new_body = _replace_in_text(body, original_paragraphs, rewritten_paragraphs)

    return preamble + begin_doc + new_body + end_doc + after


def _replace_in_text(
    tex_body: str,
    original_paragraphs: list[str],
    rewritten_paragraphs: list[str],
) -> str:
    """Find and replace each original paragraph's source text in the .tex body."""
    result = tex_body

    for orig, rewritten in zip(original_paragraphs, rewritten_paragraphs):
        if orig == rewritten:
            continue  # unchanged, skip

        # Find the original text in the .tex body
        # The extracted paragraph is cleaned (no LaTeX commands), so we need
        # to find the region that produced it. We do this by matching key
        # phrases from the original extracted text.
        match_region = _find_paragraph_region(result, orig)
        if match_region:
            start, end = match_region
            original_tex_region = result[start:end]

            # Build replacement: wrap rewritten text in the same LaTeX context
            # Preserve any leading/trailing whitespace pattern
            leading_ws = ""
            trailing_ws = ""
            if original_tex_region and original_tex_region[0] in ("\n", " "):
                leading_ws = "\n"
            if original_tex_region and original_tex_region[-1] in ("\n", " "):
                trailing_ws = "\n"

            replacement = leading_ws + rewritten + trailing_ws
            result = result[:start] + replacement + result[end:]
        else:
            logger.debug("Could not locate paragraph in .tex: %s...", orig[:50])

    return result


def _find_paragraph_region(tex: str, extracted_text: str) -> tuple | None:
    """Find the region in .tex that corresponds to an extracted paragraph.

    Uses key phrases from the extracted text to locate the matching region.
    """
    # Take the first ~40 chars and last ~40 chars of the extracted text
    # as anchors (cleaned of special chars)
    words = extracted_text.split()
    if len(words) < 3:
        return None

    # Use first 5 words and last 5 words as search anchors
    first_words = " ".join(words[:5])
    last_words = " ".join(words[-5:])

    # Clean anchors for regex — escape and allow LaTeX commands between words
    first_pattern = _words_to_tex_pattern(first_words)
    last_pattern = _words_to_tex_pattern(last_words)

    # Search for the region bounded by first and last anchors
    try:
        first_match = re.search(first_pattern, tex, re.DOTALL | re.IGNORECASE)
        if not first_match:
            return None

        # Search for last anchor after the first match
        search_start = first_match.start()
        remaining = tex[search_start:]
        last_match = re.search(last_pattern, remaining, re.DOTALL | re.IGNORECASE)
        if not last_match:
            return None

        start = search_start
        end = search_start + last_match.end()

        # Expand to include full lines
        while start > 0 and tex[start - 1] != "\n":
            start -= 1
        while end < len(tex) and tex[end] != "\n":
            end += 1

        return (start, end)
    except re.error:
        return None


def _words_to_tex_pattern(text: str) -> str:
    """Convert plain text words to a regex that matches them with possible LaTeX in between."""
    words = text.split()
    # Escape each word and allow optional LaTeX commands/braces between
    escaped = [re.escape(w) for w in words]
    # Allow LaTeX commands, braces, and whitespace between words
    separator = r"[\s\\{}\[\]]*(?:\\[a-zA-Z]+(?:\{[^}]*\})*[\s]*)*"
    return separator.join(escaped)
