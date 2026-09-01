from functionCalls import generatePDF


def test_pdf_renders_when_container_lacks_italic_font_faces(monkeypatch):
    monkeypatch.setattr(generatePDF, "_DEJAVU_ITALIC_PATH", "/missing/DejaVuSans-Oblique.ttf")
    monkeypatch.setattr(generatePDF, "_DEJAVU_BI_PATH", "/missing/DejaVuSans-BoldOblique.ttf")

    rendered = generatePDF._markdown_to_pdf(
        "# Latest news\n\n*Italic context* and ***bold italic context***.",
        "India News",
    )

    assert bytes(rendered).startswith(b"%PDF")

def test_pdf_renders_consecutive_lines_inside_fenced_code():
    rendered = generatePDF._markdown_to_pdf(
        "export_to_pdf\nContent:\n```\n# Latest Discovery in Space Tech\n"
        "First grounded finding with a citation.\n"
        "Second grounded finding with a citation.\n```",
        "Latest Discovery in Space Tech",
    )

    assert bytes(rendered).startswith(b"%PDF")
