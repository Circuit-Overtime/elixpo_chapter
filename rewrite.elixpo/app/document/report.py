"""Turnitin-style AI detection PDF report.

Generates a professional annotated report with:
- Summary dashboard (overall score, verdict, feature breakdown)
- Color-coded text highlighting per paragraph (red/yellow/green)
- Score badges in the margin
- Legend and methodology notes
"""

import io
import logging
import math
import re
from datetime import datetime
from typing import Optional

from app.core.config import SCORE_GREEN, SCORE_YELLOW
from app.document.structure import Document

logger = logging.getLogger(__name__)


def _score_color_rgb(score: float) -> tuple:
    """Return RGB tuple (0-1) for a score. Smooth gradient."""
    if score > 60:
        # Red zone — interpolate from orange-red to deep red
        t = min(1, (score - 60) / 40)
        return (0.85 + 0.1 * t, 0.25 - 0.15 * t, 0.15 - 0.05 * t)
    if score > 20:
        # Yellow zone — interpolate from green-yellow to orange
        t = (score - 20) / 40
        return (0.9 * t + 0.3 * (1 - t), 0.75 - 0.3 * t, 0.15)
    # Green zone
    t = score / 20
    return (0.15 + 0.15 * t, 0.7 - 0.1 * t, 0.3)


def _score_hex(score: float) -> str:
    r, g, b = _score_color_rgb(score)
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"


def _bg_hex(score: float, opacity: float = 0.12) -> str:
    """Light background tint of the score color."""
    r, g, b = _score_color_rgb(score)
    br = int(r * 255 * opacity + 255 * (1 - opacity))
    bg = int(g * 255 * opacity + 255 * (1 - opacity))
    bb = int(b * 255 * opacity + 255 * (1 - opacity))
    return f"#{br:02x}{bg:02x}{bb:02x}"


def _escape(text: str) -> str:
    """Escape XML entities for ReportLab paragraphs."""
    result = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    # Clean raw LaTeX math for PDF display
    # Replace $$ ... $$ display math with [equation]
    result = re.sub(r"\$\$.*?\$\$", "[equation]", result, flags=re.DOTALL)
    # Replace $ ... $ inline math — keep content but strip dollar signs
    result = re.sub(r"\$([^$]+)\$", r"\1", result)
    # Clean leftover LaTeX commands
    result = re.sub(r"\\text\{([^}]*)\}", r"\1", result)
    result = re.sub(r"\\(?:frac|sqrt|sum|int|prod)\{[^}]*\}", "[math]", result)
    result = re.sub(r"\\[a-zA-Z]+", "", result)
    result = result.replace("{", "").replace("}", "")
    return result


def generate_report(
    document: Document,
    segment_scores: list[dict],
    overall_score: float,
    overall_verdict: str,
    features: dict | None = None,
    output_path: Optional[str] = None,
) -> bytes:
    """Generate a Turnitin-style AI detection PDF report.

    Args:
        document: Parsed document structure.
        segment_scores: List of dicts with 'score', 'verdict', 'text' per segment.
        overall_score: Overall detection score (0-100).
        overall_verdict: Verdict string.
        features: Optional overall feature breakdown dict.
        output_path: Optional path to save the PDF file.

    Returns:
        PDF file as bytes.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph as RLPara, Spacer, Table,
        TableStyle, HRFlowable, KeepTogether, PageBreak,
    )
    from reportlab.graphics.shapes import Drawing, Circle, String, Rect, Line
    from reportlab.graphics.charts.piecharts import Pie

    PAGE_W, PAGE_H = A4
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    # --- Custom styles ---
    s_title = ParagraphStyle("RTitle", parent=styles["Heading1"],
                             fontSize=22, spaceAfter=4, textColor=HexColor("#1a1a2e"))
    s_subtitle = ParagraphStyle("RSub", parent=styles["Normal"],
                                fontSize=11, textColor=HexColor("#666666"), spaceAfter=12)
    s_h2 = ParagraphStyle("RH2", parent=styles["Heading2"],
                           fontSize=15, spaceBefore=16, spaceAfter=8,
                           textColor=HexColor("#1a1a2e"),
                           borderWidth=0, borderPadding=0)
    s_h3 = ParagraphStyle("RH3", parent=styles["Heading3"],
                           fontSize=12, spaceBefore=10, spaceAfter=4,
                           textColor=HexColor("#333333"))
    s_body = ParagraphStyle("RBody", parent=styles["BodyText"],
                            fontSize=9.5, leading=13.5, spaceAfter=2)
    s_small = ParagraphStyle("RSmall", parent=styles["Normal"],
                             fontSize=8, textColor=HexColor("#888888"), leading=10)
    s_badge = ParagraphStyle("RBadge", parent=styles["Normal"],
                             fontSize=8, alignment=TA_CENTER)
    s_center = ParagraphStyle("RCenter", parent=styles["Normal"],
                              fontSize=10, alignment=TA_CENTER, spaceAfter=4)
    s_legend = ParagraphStyle("RLegend", parent=styles["Normal"],
                              fontSize=8.5, textColor=HexColor("#555555"), leading=12)

    elements = []

    # =====================================================================
    # PAGE 1: SUMMARY DASHBOARD
    # =====================================================================
    elements.append(RLPara("ReWrite Report", s_title))
    now = datetime.now().strftime("%B %d, %Y at %H:%M")
    doc_title = _escape(document.title) if document.title else "Untitled Document"
    elements.append(RLPara(
        f'Document: <b>{doc_title}</b>&nbsp;&nbsp;|&nbsp;&nbsp;Generated: {now}',
        s_subtitle,
    ))

    elements.append(HRFlowable(width="100%", thickness=1.5, color=HexColor("#1a1a2e")))
    elements.append(Spacer(1, 12))

    # --- Score gauge (large centered score) ---
    score_color = _score_hex(overall_score)
    score_display = f"{overall_score:.0f}" if overall_score == int(overall_score) else f"{overall_score:.1f}"

    gauge_table = Table(
        [[
            RLPara(
                f'<font size="42" color="{score_color}"><b>{score_display}%</b></font>',
                ParagraphStyle("gauge", alignment=TA_CENTER, spaceAfter=0, leading=50),
            ),
        ],
        [
            RLPara(
                f'<font size="13" color="{score_color}"><b>{_escape(overall_verdict)}</b></font>',
                ParagraphStyle("verdict_label", alignment=TA_CENTER, spaceBefore=2, leading=18),
            ),
        ],
        [
            RLPara("AI-Generated Content Likelihood", s_center),
        ]],
        colWidths=[220],
        rowHeights=[52, 22, 18],
    )
    gauge_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (0, 0), "BOTTOM"),
        ("VALIGN", (0, 1), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    # --- Score distribution bar ---
    n_segments = len(segment_scores)
    n_red = sum(1 for s in segment_scores if s.get("score", 0) > 60)
    n_yellow = sum(1 for s in segment_scores if 20 < s.get("score", 0) <= 60)
    n_green = sum(1 for s in segment_scores if s.get("score", 0) <= 20)

    dist_text = (
        f'<font color="#cc3333"><b>{n_red}</b> high risk</font>&nbsp;&nbsp;'
        f'<font color="#cc9900"><b>{n_yellow}</b> moderate</font>&nbsp;&nbsp;'
        f'<font color="#339955"><b>{n_green}</b> low risk</font>&nbsp;&nbsp;'
        f'out of <b>{n_segments}</b> segments'
    )

    stats_data = [
        [gauge_table, RLPara(dist_text, ParagraphStyle("dist", fontSize=10, leading=14))],
    ]
    stats_table = Table(stats_data, colWidths=[220, 280])
    stats_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 16))

    # --- Feature breakdown table ---
    if features:
        elements.append(RLPara("Feature Analysis", s_h2))

        feat_labels = {
            "burstiness": ("Burstiness", "Sentence length uniformity"),
            "vocabulary_markers": ("AI Vocabulary", "Marker word frequency"),
            "paragraph_structure": ("Paragraph Structure", "Paragraph length uniformity"),
            "n_gram_uniformity": ("N-gram Uniformity", "Bigram distribution smoothness"),
            "repetition": ("Repetition", "Structural template reuse"),
            "punctuation_diversity": ("Punctuation", "Punctuation pattern variety"),
            "perplexity": ("Perplexity", "Text predictability"),
            "coherence": ("Coherence", "Inter-sentence connectivity"),
            "readability": ("Readability", "Grade-level clustering"),
            "entropy": ("Entropy", "Information density"),
            "type_token_ratio": ("Lexical Diversity", "Vocabulary variety"),
            "sentence_starters": ("Sentence Starters", "Opening word variety"),
            "llm_judge": ("LLM Judge", "AI model evaluation"),
        }

        feat_data = [["Feature", "Score", "Signal", "Description"]]
        for key, value in features.items():
            label, desc = feat_labels.get(key, (key, ""))
            fc = _score_hex(value)
            bar_len = int(value / 100 * 15)
            bar = "\u2588" * bar_len + "\u2591" * (15 - bar_len)
            feat_data.append([
                label,
                RLPara(f'<font color="{fc}"><b>{value:.0f}%</b></font>',
                       ParagraphStyle(f"f_{key}", fontSize=9, alignment=TA_RIGHT)),
                RLPara(f'<font color="{fc}">{bar}</font>',
                       ParagraphStyle(f"b_{key}", fontSize=7, fontName="Courier")),
                RLPara(f'<font color="#777777">{desc}</font>',
                       ParagraphStyle(f"d_{key}", fontSize=8)),
            ])

        feat_table = Table(feat_data, colWidths=[95, 50, 110, 200])
        feat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#FFFFFF")),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#DDDDDD")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#FAFAFA"), HexColor("#FFFFFF")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(feat_table)
        elements.append(Spacer(1, 12))

    # --- Segment score table ---
    elements.append(RLPara("Segment Scores", s_h2))

    seg_data = [["#", "Score", "Verdict", "Preview"]]
    for i, seg in enumerate(segment_scores):
        sc = seg.get("score", 0)
        verdict = seg.get("verdict", "")
        text = seg.get("text", "")
        preview = _escape(text[:90] + "..." if len(text) > 90 else text)
        fc = _score_hex(sc)

        seg_data.append([
            f"{i + 1}",
            RLPara(f'<font color="{fc}"><b>{sc:.0f}%</b></font>',
                   ParagraphStyle(f"ss_{i}", fontSize=9, alignment=TA_CENTER)),
            RLPara(f'<font color="{fc}">{_escape(verdict)}</font>',
                   ParagraphStyle(f"sv_{i}", fontSize=8)),
            RLPara(f'<font color="#555555">{preview}</font>',
                   ParagraphStyle(f"sp_{i}", fontSize=7.5, leading=10)),
        ])

    seg_table = Table(seg_data, colWidths=[25, 45, 130, 260])
    seg_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#FFFFFF")),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#DDDDDD")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#FAFAFA"), HexColor("#FFFFFF")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(seg_table)

    # =====================================================================
    # PAGE 2+: ANNOTATED TEXT
    # =====================================================================
    elements.append(PageBreak())
    elements.append(RLPara("Annotated Document", s_title))
    elements.append(RLPara(
        "Each paragraph is highlighted based on its AI detection score. "
        "Scores are shown in brackets to the left.",
        s_subtitle,
    ))

    # Legend
    legend_items = [
        ("#339955", "\u2588\u2588 0-20%: Low risk (likely human)"),
        ("#cc9900", "\u2588\u2588 20-60%: Moderate risk (mixed/uncertain)"),
        ("#cc3333", "\u2588\u2588 60-100%: High risk (likely AI-generated)"),
    ]
    legend_text = "&nbsp;&nbsp;&nbsp;&nbsp;".join(
        f'<font color="{c}">{_escape(t)}</font>' for c, t in legend_items
    )
    elements.append(RLPara(legend_text, s_legend))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#CCCCCC")))
    elements.append(Spacer(1, 8))

    # --- Render annotated paragraphs ---
    para_idx = 0
    for section in document.sections:
        if section.heading:
            elements.append(RLPara(f'<b>{_escape(section.heading)}</b>', s_h3))

        for para in section.paragraphs:
            if para_idx < len(segment_scores):
                score_info = segment_scores[para_idx]
            else:
                score_info = {"score": 0, "verdict": ""}

            sc = score_info.get("score", 0)
            fc = _score_hex(sc)
            bg = _bg_hex(sc, 0.15)

            # Score badge + paragraph text in a two-column table
            badge = RLPara(
                f'<font color="{fc}" size="8"><b>{sc:.0f}%</b></font>',
                ParagraphStyle(f"badge_{para_idx}", alignment=TA_CENTER, fontSize=8),
            )

            para_text = _escape(para.text)
            text_para = RLPara(
                para_text,
                ParagraphStyle(
                    f"ap_{para_idx}",
                    parent=s_body,
                    backColor=HexColor(bg),
                    borderPadding=(4, 6, 4, 6),
                    borderWidth=0.5,
                    borderColor=HexColor(fc),
                    borderRadius=2,
                ),
            )

            row = Table(
                [[badge, text_para]],
                colWidths=[32, PAGE_W - 40 * mm - 36],
            )
            row.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 2),
            ]))

            elements.append(KeepTogether([row, Spacer(1, 4)]))
            para_idx += 1

    # =====================================================================
    # FOOTER: Methodology note
    # =====================================================================
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#CCCCCC")))
    elements.append(Spacer(1, 6))
    elements.append(RLPara(
        '<font color="#999999" size="7">'
        "This report was generated by ReWrite AI Detection Engine. "
        "Detection uses an ensemble of statistical heuristics (burstiness, vocabulary markers, "
        "n-gram uniformity, paragraph structure, repetition patterns, punctuation diversity), "
        "deep linguistic analysis, and LLM-as-judge evaluation. "
        "Weights were calibrated against real arXiv research papers and AI-generated equivalents. "
        "Scores represent probability estimates and should be interpreted as guidance, not definitive proof."
        "</font>",
        ParagraphStyle("footer", fontSize=7, textColor=HexColor("#999999"), leading=9),
    ))

    # Build PDF with copyright header/footer on every page
    def _on_page(canvas, doc_template):
        canvas.saveState()
        # --- Header: ReWrite branding ---
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(HexColor("#1a1a2e"))
        canvas.drawString(20 * mm, PAGE_H - 10 * mm, "ReWrite")
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(HexColor("#999999"))
        canvas.drawRightString(PAGE_W - 20 * mm, PAGE_H - 10 * mm, "ReWrite Report")

        # --- Footer: copyright + page number ---
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(HexColor("#999999"))
        year = datetime.now().year
        canvas.drawString(
            20 * mm, 8 * mm,
            f"\u00a9 {year} ReWrite. All rights reserved. "
            f"Generated by ReWrite AI Detection Engine."
        )
        canvas.drawRightString(
            PAGE_W - 20 * mm, 8 * mm,
            f"Page {canvas.getPageNumber()}"
        )
        # Thin line above footer
        canvas.setStrokeColor(HexColor("#DDDDDD"))
        canvas.setLineWidth(0.5)
        canvas.line(20 * mm, 12 * mm, PAGE_W - 20 * mm, 12 * mm)
        canvas.restoreState()

    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    pdf_bytes = buffer.getvalue()

    if output_path:
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)
        logger.info("Report saved to %s", output_path)

    return pdf_bytes
