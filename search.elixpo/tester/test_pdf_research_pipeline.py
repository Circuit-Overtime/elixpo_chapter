import asyncio
from unittest import mock

from pipeline.instruction import _runtime_skill_guidance, synthesis_instruction
from pipeline.optimized_tool_execution import optimized_tool_execution
from pipeline.response_builder import (
    auto_generate_pdf,
    derive_pdf_title,
    normalize_pdf_document,
    requested_coverage_gap,
    requested_day_count,
    missing_local_date_anchor,
)
from pipeline.tools import tools


def _tool_schema(name):
    return next(item["function"] for item in tools if item["function"]["name"] == name)


def test_live_research_skills_are_injected_into_runtime_prompt():
    guidance = _runtime_skill_guidance()
    assert "search snippets only as leads" in guidance
    assert "search → fetch → synthesize → export" in guidance
    assert "Never recall semantic memory for a self-contained current-information request" in guidance


def test_pdf_synthesis_requests_final_content_not_an_export_tool_call():
    prompt = synthesis_instruction("give me a pdf of the latest news from india")
    assert "complete, polished, evidence-backed document" in prompt
    assert "do not call export_to_pdf" in prompt
    assert "MUST call the export_to_pdf tool" not in prompt
    assert "N distinct dated entries" in prompt
    assert "Never emit a tool name" in prompt


def test_web_search_exposes_freshness_window():
    properties = _tool_schema("web_search")["parameters"]["properties"]
    assert properties["freshness"]["enum"] == ["any", "day", "week", "month", "year"]


def test_local_time_tool_anchors_relative_location_dates():
    tool = _tool_schema("get_local_time")
    assert "relative dates" in tool["description"]
    assert "local date anchors" in tool["description"]


def test_pdf_synthesis_includes_local_today_in_next_n_days():
    prompt = synthesis_instruction("weather in Kolkata for next 7 days")
    assert "Anchor relative ranges to" in prompt
    assert "includes local today as entry one" in prompt


def test_runtime_pdf_export_is_idempotent():
    memo = {"generated_pdfs": []}
    content = "# India news\n\n" + ("A grounded, cited news item. " * 8)

    async def run():
        with mock.patch(
            "functionCalls.generatePDF.create_pdf_from_content",
            new=mock.AsyncMock(return_value="https://search.elixpo.com/generated/report.pdf"),
        ) as create:
            first = await auto_generate_pdf(content, "give me a pdf", memo, "event")
            second = await auto_generate_pdf(content, "give me a pdf", memo, "event")
            assert first == "https://search.elixpo.com/generated/report.pdf"
            assert second is None
            create.assert_awaited_once()

    asyncio.run(run())


def test_runtime_does_not_export_error_text_after_failed_tool_export():
    memo = {"generated_pdfs": [], "pdf_export_attempted": True,
            "pdf_export_error": "render failed"}
    content = "PDF generation failed. " * 10

    async def run():
        with mock.patch(
            "functionCalls.generatePDF.create_pdf_from_content",
            new=mock.AsyncMock(),
        ) as create:
            result = await auto_generate_pdf(content, "give me a pdf", memo, "event")
            assert result is None
            create.assert_not_awaited()

    asyncio.run(run())

def test_followup_pdf_exports_trusted_prior_answer_instead_of_model_rewrite():
    prior = "# Grounded space discovery\n\n" + ("Evidence with citation. " * 12)
    memo = {"generated_pdfs": [], "continuation_pdf_content": prior}

    async def collect():
        with mock.patch(
            "pipeline.optimized_tool_execution.create_pdf_from_content",
            new=mock.AsyncMock(return_value="https://search.elixpo.com/generated/space.pdf"),
        ) as create:
            output = []
            async for item in optimized_tool_execution(
                "export_to_pdf",
                {"content": "Generic rewritten space overview", "title": "Space Technology"},
                memo, lambda *_: None,
            ):
                output.append(item)
            create.assert_awaited_once_with(prior, None)
        return output

    output = asyncio.run(collect())
    assert output[-1].endswith("https://search.elixpo.com/generated/space.pdf")

def test_export_tool_reuses_existing_pdf_without_rendering_again():
    memo = {"generated_pdfs": ["https://search.elixpo.com/generated/report.pdf"]}

    async def collect():
        output = []
        with mock.patch("pipeline.optimized_tool_execution.create_pdf_from_content") as create:
            async for item in optimized_tool_execution(
                "export_to_pdf", {"content": "draft"}, memo, lambda *_: None
            ):
                output.append(item)
            create.assert_not_called()
        return output

    result = asyncio.run(collect())
    assert result == [
        "PDF already exported.\nDownload: https://search.elixpo.com/generated/report.pdf"
    ]


def test_leaked_python_pdf_wrapper_is_unwrapped_to_document_only():
    leaked = "Got it!\n```markdown\nexport_to_pdf(\n  content=\"# Kolkata Forecast\\n\\n## September 2nd 2026\\nRain\"\n)\n```"
    assert normalize_pdf_document(leaked) == "# Kolkata Forecast\n\n## September 2nd 2026\nRain"


def test_bounded_day_coverage_is_generic_for_any_subject_and_count():
    query = "make a PDF itinerary for next 3 days"
    incomplete = "September 2nd 2026 through September 4th 2026"
    complete = "\n".join(f"## September {day}th 2026" for day in range(2, 5))
    assert requested_day_count(query) == 3
    assert requested_coverage_gap(query, incomplete) == (3, 2)
    assert requested_coverage_gap(query, complete) is None


def test_pdf_title_comes_from_subject_not_conversational_preamble():
    query = "give me a pdf of the latest weather forecast for Kolkata for next 7 days"
    content = "Got it! I will whip up a PDF of that."
    assert derive_pdf_title(query, content) == "Latest Weather Forecast For Kolkata For Next 7 Days"


def test_local_date_anchor_must_be_present_in_range():
    info = {"Kolkata": "The current time in Kolkata is 12:30 AM on 2026-09-02"}
    query = "weather in Kolkata for next 7 days"
    assert missing_local_date_anchor(query, "## September 3rd 2026", info) == "2026-09-02"
    assert missing_local_date_anchor(query, "## September 2nd 2026", info) is None


def test_explicit_tomorrow_shifts_generic_local_anchor():
    info = {"Tokyo": "The current time in Tokyo is 11:30 PM on 2026-09-02"}
    query = "make a three day itinerary starting tomorrow"
    assert missing_local_date_anchor(query, "## September 2nd 2026", info) == "2026-09-03"
    assert missing_local_date_anchor(query, "## September 3rd 2026", info) is None
