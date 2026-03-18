"""
Generate a professionally branded PDF from markdown content.
Stores the PDF on the shared content volume and returns a full URL.
"""
import asyncio
import os
import re
import uuid
from datetime import datetime

_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://search.elixpo.com").rstrip("/")


def _generate_title_slug(content: str, max_words: int = 8) -> str:
    """Extract a short title from the first heading or first sentence of the content."""
    # Try first markdown heading
    heading = re.search(r"^#+\s+(.+)", content, re.MULTILINE)
    if heading:
        title = heading.group(1).strip()
    else:
        # First sentence
        first_line = content.strip().split("\n")[0]
        title = re.sub(r"[*_`\[\]()]", "", first_line).strip()

    # Truncate to max_words
    words = title.split()[:max_words]
    slug = "-".join(words).lower()
    # Clean non-alphanumeric
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "lixsearch-export"


def _markdown_to_pdf(markdown_text: str, title: str = "lixSearch Response") -> bytes:
    """Convert markdown text to a professionally branded PDF."""
    from fpdf import FPDF

    class BrandedPDF(FPDF):
        def header(self):
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, "lixSearch", align="L")
            self.cell(0, 8, "search.elixpo.com", align="R", new_x="LMARGIN", new_y="NEXT")
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

    # Title block
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(30, 30, 60)
    pdf.multi_cell(0, 10, title)
    pdf.ln(2)

    # Metadata line
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, f"Generated {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}  |  Powered by lixSearch", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Divider
    pdf.set_draw_color(200, 200, 200)
    pdf.set_line_width(0.3)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(6)

    # Normalize literal \n to real newlines
    text = markdown_text.replace("\\n", "\n")

    in_code_block = False

    for line in text.split("\n"):
        stripped = line.strip()

        if not stripped:
            pdf.ln(4)
            continue

        # Code block toggle
        if stripped.startswith("```"):
            in_code_block = not in_code_block
            if in_code_block:
                pdf.ln(2)
            else:
                pdf.ln(2)
            continue

        if in_code_block:
            pdf.set_font("Courier", "", 9)
            pdf.set_text_color(60, 60, 60)
            pdf.set_fill_color(245, 245, 245)
            pdf.multi_cell(0, 5, f"  {stripped}", fill=True)
            continue

        # Headers
        if stripped.startswith("### "):
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(40, 40, 80)
            pdf.multi_cell(0, 7, stripped[4:])
            pdf.ln(2)
        elif stripped.startswith("## "):
            pdf.ln(4)
            pdf.set_font("Helvetica", "B", 15)
            pdf.set_text_color(30, 30, 60)
            pdf.multi_cell(0, 8, stripped[3:])
            pdf.ln(3)
        elif stripped.startswith("# "):
            pdf.ln(5)
            pdf.set_font("Helvetica", "B", 17)
            pdf.set_text_color(20, 20, 50)
            pdf.multi_cell(0, 9, stripped[2:])
            pdf.ln(4)
        # Lists
        elif stripped.startswith("- ") or stripped.startswith("* "):
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.cell(6)
            pdf.multi_cell(0, 6, f"\u2022  {_clean_markdown(stripped[2:])}")
            pdf.ln(1)
        elif re.match(r"^\d+\.\s", stripped):
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.cell(6)
            pdf.multi_cell(0, 6, _clean_markdown(stripped))
            pdf.ln(1)
        # Blockquotes
        elif stripped.startswith("> "):
            pdf.set_font("Helvetica", "I", 11)
            pdf.set_text_color(80, 80, 80)
            pdf.set_fill_color(245, 248, 255)
            pdf.cell(8)
            pdf.multi_cell(0, 6, _clean_markdown(stripped[2:]), fill=True)
            pdf.ln(2)
        # Horizontal rule
        elif stripped.startswith("---") or stripped.startswith("***"):
            pdf.ln(3)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(5)
        # Normal paragraph
        else:
            clean = _clean_markdown(stripped)
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 6, clean)
            pdf.ln(2)

    return pdf.output()


def _clean_markdown(text: str) -> str:
    """Strip markdown formatting for clean PDF text."""
    # Extract link text: [text](url) -> text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Bold
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    # Italic
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    # Inline code
    text = re.sub(r"`(.+?)`", r"\1", text)
    # Image markdown
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    return text.strip()


async def create_pdf_from_content(content: str, title: str = None) -> str:
    """Generate a branded PDF from markdown content. Returns the full public URL."""
    from app.gateways.content import store_content

    if not title:
        title = _generate_title_slug(content).replace("-", " ").title()

    pdf_bytes = await asyncio.to_thread(_markdown_to_pdf, content, title)

    # Use title slug + short UUID for the filename
    slug = _generate_title_slug(content)
    content_id = f"{slug}-{uuid.uuid4().hex[:8]}"
    store_content(content_id, pdf_bytes, ".pdf")

    return f"{_BASE_URL}/api/content/{content_id}"
