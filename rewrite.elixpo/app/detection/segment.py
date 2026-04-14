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


import re

# Lines that are purely LaTeX structure — no prose to score or rewrite
_SKIP_PATTERNS = [
    re.compile(r"^\s*\\(documentclass|usepackage|input|include|RequirePackage)\b"),
    re.compile(r"^\s*\\(begin|end)\{(document|figure|table|equation|align|itemize|enumerate|lstlisting|verbatim|tabular|array|minipage|tikzpicture|center|flushleft|flushright|thebibliography)\}"),
    re.compile(r"^\s*\\(title|author|date|maketitle|tableofcontents|newcommand|renewcommand|def|let|setlength|setcounter|newenvironment|pagestyle|thispagestyle|bibliographystyle|bibliography|label|ref|cite|nocite|appendix)\b"),
    re.compile(r"^\s*\\(section|subsection|subsubsection|chapter|part|paragraph|subparagraph)\b"),
    re.compile(r"^\s*\\(hspace|vspace|noindent|newpage|clearpage|pagebreak|linebreak|bigskip|medskip|smallskip)\b"),
    re.compile(r"^\s*\\(centering|raggedleft|raggedright|footnotesize|small|large|Large|LARGE|huge|Huge)\b"),
    re.compile(r"^\s*%"),  # comment lines
    re.compile(r"^\s*\\(caption|includegraphics|textwidth|linewidth)\b"),
]

# Entire paragraph is a math environment or equation
_MATH_BLOCK = re.compile(r"^\s*\\begin\{(equation|align|gather|multline|eqnarray|math|displaymath)\}")


def is_prose_paragraph(text: str) -> bool:
    """Check if a paragraph contains actual human prose worth scoring/rewriting.

    Returns False for:
    - LaTeX preamble (documentclass, usepackage, etc.)
    - Section headers (\\section{...})
    - Pure math environments
    - Bibliography entries
    - Very short command-only blocks
    - Paragraphs that are mostly LaTeX commands with < 20 words of prose
    """
    stripped = text.strip()
    if not stripped:
        return False

    lines = stripped.split("\n")

    # If every line matches a skip pattern, it's not prose
    if all(_matches_skip(line) for line in lines if line.strip()):
        return False

    # If it's a math block, skip
    if _MATH_BLOCK.match(stripped):
        return False

    # Strip all LaTeX commands and check remaining prose
    prose = re.sub(r"\\[a-zA-Z]+\*?(\{[^}]*\})*(\[[^\]]*\])*", "", stripped)
    prose = re.sub(r"[{}$\\%&]", "", prose)
    prose = re.sub(r"\s+", " ", prose).strip()

    # Need at least 20 words of actual text
    words = [w for w in prose.split() if len(w) >= 2]
    if len(words) < 20:
        return False

    return True


def _matches_skip(line: str) -> bool:
    """Check if a single line is a LaTeX command (not prose)."""
    line = line.strip()
    if not line:
        return True
    for pat in _SKIP_PATTERNS:
        if pat.match(line):
            return True
    return False
