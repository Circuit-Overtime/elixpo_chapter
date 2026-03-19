"""
Generate a professionally branded PDF from markdown content.
Stores the PDF on the shared content volume and returns a full URL.

Requires fpdf2 (``pip install fpdf2``).
"""
import asyncio
import os
import re
import uuid
from datetime import datetime

_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://search.elixpo.com").rstrip("/")


def _generate_title_slug(content: str, max_words: int = 8) -> str:
    """Extract a short title from the first heading or first sentence of the content."""
    heading = re.search(r"^#+\s+(.+)", content, re.MULTILINE)
    if heading:
        title = heading.group(1).strip()
    else:
        first_line = content.strip().split("\n")[0]
        title = re.sub(r"[*_`\[\]()]", "", first_line).strip()

    words = title.split()[:max_words]
    slug = "-".join(words).lower()
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "lixsearch-export"


# ── Inline markdown parser ───────────────────────────────────────────────

_INLINE_RE = re.compile(
    r"(?P<bold_italic>\*\*\*(.+?)\*\*\*)"
    r"|(?P<bold>\*\*(.+?)\*\*)"
    r"|(?P<italic>\*(.+?)\*)"
    r"|(?P<code>`(.+?)`)"
    r"|(?P<link>\[([^\]]+)\]\(([^)]+)\))"
    r"|(?P<img>!\[[^\]]*\]\([^)]+\))"
)


def _parse_inline(text: str):
    """Tokenize a markdown line into styled segments.

    Returns list of tuples:
      ("text", str) | ("bold", str) | ("italic", str) |
      ("bold_italic", str) | ("code", str) | ("link", text, url)
    """
    segments = []
    last = 0
    for m in _INLINE_RE.finditer(text):
        if m.start() > last:
            segments.append(("text", text[last:m.start()]))

        if m.group("bold_italic"):
            segments.append(("bold_italic", m.group(2)))
        elif m.group("bold"):
            segments.append(("bold", m.group(3)))
        elif m.group("italic"):
            segments.append(("italic", m.group(4)))
        elif m.group("code"):
            segments.append(("code", m.group(6)))
        elif m.group("link"):
            segments.append(("link", m.group(8), m.group(9)))
        # img: silently dropped

        last = m.end()

    if last < len(text):
        segments.append(("text", text[last:]))
    return segments if segments else [("text", text)]


def _write_md(pdf, text: str, font: str = "Helvetica", size: int = 11,
              color=(50, 50, 50), lh: float = 6):
    """Render a markdown-formatted text span with inline bold/italic/code/link."""
    for seg in _parse_inline(text):
        kind = seg[0]

        if kind == "text":
            pdf.set_font(font, "", size)
            pdf.set_text_color(*color)
            pdf.write(lh, seg[1])

        elif kind == "bold":
            pdf.set_font(font, "B", size)
            pdf.set_text_color(*color)
            pdf.write(lh, seg[1])

        elif kind == "italic":
            pdf.set_font(font, "I", size)
            pdf.set_text_color(*color)
            pdf.write(lh, seg[1])

        elif kind == "bold_italic":
            pdf.set_font(font, "BI", size)
            pdf.set_text_color(*color)
            pdf.write(lh, seg[1])

        elif kind == "code":
            code_text = seg[1]
            pdf.set_font("Courier", "", size - 1)
            w = pdf.get_string_width(code_text) + 3
            x, y = pdf.get_x(), pdf.get_y()
            pdf.set_fill_color(240, 240, 240)
            pdf.rect(x, y - 0.5, w, lh + 1, "F")
            pdf.set_text_color(180, 50, 50)
            pdf.write(lh, f" {code_text} ")

        elif kind == "link":
            link_text, url = seg[1], seg[2]
            pdf.set_font(font, "U", size)
            pdf.set_text_color(40, 80, 160)
            pdf.write(lh, link_text, url)

    # Reset
    pdf.set_font(font, "", size)
    pdf.set_text_color(*color)


# ── PDF builder ──────────────────────────────────────────────────────────

def _markdown_to_pdf(markdown_text: str, title: str = "lixSearch Response") -> bytes:
    """Convert markdown text to a branded PDF with full inline formatting."""
    from fpdf import FPDF

    class BrandedPDF(FPDF):
        def header(self):
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, "LixSearch", align="L")
            self.ln(0)
            self.cell(0, 8, "search.elixpo.com", align="R")
            self.ln(8)
            self.set_draw_color(30, 30, 60)
            self.set_line_width(0.5)
            self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
            self.ln(4)

        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    pdf = BrandedPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(30, 30, 60)
    pdf.multi_cell(0, 10, title)
    pdf.ln(2)

    # Metadata
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120, 120, 120)
    ts = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")
    pdf.cell(0, 6, f"Generated {ts}  |  Powered by LixSearch")
    pdf.ln(8)

    # Divider
    pdf.set_draw_color(200, 200, 200)
    pdf.set_line_width(0.3)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(6)

    # ── Render body ──────────────────────────────────────────────────
    text = markdown_text.replace("\\n", "\n")
    in_code_block = False

    for line in text.split("\n"):
        stripped = line.strip()

        if not stripped:
            pdf.ln(4)
            continue

        # Fenced code block
        if stripped.startswith("```"):
            in_code_block = not in_code_block
            pdf.ln(2)
            continue

        if in_code_block:
            pdf.set_font("Courier", "", 9)
            pdf.set_text_color(60, 60, 60)
            pdf.set_fill_color(245, 245, 245)
            pdf.multi_cell(0, 5, f"  {stripped}", fill=True)
            continue

        # ── Headings ─────────────────────────────────────────────────
        if stripped.startswith("### "):
            pdf.ln(3)
            _write_md(pdf, stripped[4:], size=13, color=(40, 40, 80), lh=7)
            pdf.ln(9)
        elif stripped.startswith("## "):
            pdf.ln(4)
            _write_md(pdf, stripped[3:], size=15, color=(30, 30, 60), lh=8)
            pdf.ln(11)
        elif stripped.startswith("# "):
            pdf.ln(5)
            _write_md(pdf, stripped[2:], size=17, color=(20, 20, 50), lh=9)
            pdf.ln(13)

        # ── Unordered list ───────────────────────────────────────────
        elif stripped.startswith("- ") or stripped.startswith("* "):
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.cell(6)
            pdf.write(6, "\u2022  ")
            _write_md(pdf, stripped[2:])
            pdf.ln(7)

        # ── Ordered list ─────────────────────────────────────────────
        elif re.match(r"^\d+\.\s", stripped):
            num_match = re.match(r"^(\d+\.\s)", stripped)
            prefix = num_match.group(1)
            rest = stripped[len(prefix):]
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.cell(6)
            pdf.write(6, prefix)
            _write_md(pdf, rest)
            pdf.ln(7)

        # ── Blockquote ───────────────────────────────────────────────
        elif stripped.startswith("> "):
            y = pdf.get_y()
            pdf.set_draw_color(100, 120, 200)
            pdf.set_line_width(0.8)
            pdf.line(pdf.l_margin + 2, y, pdf.l_margin + 2, y + 8)
            pdf.cell(10)
            _write_md(pdf, stripped[2:], color=(80, 80, 80))
            pdf.ln(8)

        # ── Horizontal rule ──────────────────────────────────────────
        elif stripped in ("---", "***", "___") or re.match(r"^[-*_]{3,}$", stripped):
            pdf.ln(3)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(5)

        # ── Normal paragraph ─────────────────────────────────────────
        else:
            _write_md(pdf, stripped)
            pdf.ln(8)

    return pdf.output()


async def create_pdf_from_content(content: str, title: str = None) -> str:
    """Generate a branded PDF from markdown content. Returns the full public URL."""
    from app.gateways.content import store_content

    if not title:
        title = _generate_title_slug(content).replace("-", " ").title()

    pdf_bytes = await asyncio.to_thread(_markdown_to_pdf, content, title)

    slug = _generate_title_slug(content)
    content_id = f"{slug}-{uuid.uuid4().hex[:8]}"
    store_content(content_id, pdf_bytes, ".pdf")

    return f"{_BASE_URL}/api/content/{content_id}"
