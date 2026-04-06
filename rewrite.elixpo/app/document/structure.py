"""Document hierarchy model — sections, paragraphs, sentences."""

from dataclasses import dataclass, field
from typing import Optional

import nltk

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)

from nltk.tokenize import sent_tokenize


@dataclass
class Paragraph:
    text: str
    sentences: list[str] = field(default_factory=list)
    score: Optional[float] = None
    verdict: Optional[str] = None

    def __post_init__(self):
        if not self.sentences and self.text:
            self.sentences = sent_tokenize(self.text)

    @property
    def word_count(self) -> int:
        return len(self.text.split())


@dataclass
class Section:
    heading: str
    paragraphs: list[Paragraph] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n\n".join(p.text for p in self.paragraphs)

    @property
    def word_count(self) -> int:
        return sum(p.word_count for p in self.paragraphs)


@dataclass
class Document:
    title: str = ""
    sections: list[Section] = field(default_factory=list)
    source_path: Optional[str] = None

    @property
    def text(self) -> str:
        parts = []
        for section in self.sections:
            if section.heading:
                parts.append(section.heading)
            parts.append(section.text)
        return "\n\n".join(parts)

    @property
    def paragraphs(self) -> list[Paragraph]:
        return [p for s in self.sections for p in s.paragraphs]

    @property
    def word_count(self) -> int:
        return sum(s.word_count for s in self.sections)

    @classmethod
    def from_text(cls, text: str, title: str = "") -> "Document":
        """Build a Document from raw text, splitting on double newlines."""
        raw_paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        paragraphs = [Paragraph(text=p) for p in raw_paragraphs]
        section = Section(heading="", paragraphs=paragraphs)
        return cls(title=title, sections=[section])
