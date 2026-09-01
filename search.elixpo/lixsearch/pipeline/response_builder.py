import re
import ast
import random
import asyncio
import requests
from loguru import logger

from pipeline.config import POLLINATIONS_ENDPOINT, LLM_MODEL, LOG_MESSAGE_PREVIEW_TRUNCATE
from pipeline.helpers import _scrub_tool_names, sanitize_final_response
from pipeline.utils import format_sse

MODEL = LLM_MODEL

PLACEHOLDER_PREFIXES = (
    "I found relevant information about",
    "I gathered",
    "I searched for information about",
    "I processed your query about",
    "Based on available context for",
    "Here's what I found about",
)
PLACEHOLDER_EXACT = (
    "Processing your request...",
    "I'll help you with that. Let me gather the information you need.",
)


_MONTH_DATE_RE = re.compile(
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+"
    r"(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b",
    re.IGNORECASE,
)


def normalize_pdf_document(content: str) -> str:
    """Recover document Markdown from a leaked textual export wrapper."""
    value = (content or "").strip()
    match = re.search(
        r"export_to_pdf\s*\(\s*content\s*=\s*(?P<quote>[\"\x27])(?P<body>.*)(?P=quote)\s*\)\s*`*\s*$",
        value, re.IGNORECASE | re.DOTALL,
)
    if match:
        literal = f"{match.group('quote')}{match.group('body')}{match.group('quote')}"
        try:
            value = ast.literal_eval(literal)
        except (SyntaxError, ValueError):
            value = re.sub(r"\\s*\n", "", match.group("body"))
            value = value.replace(r"\n", "\n")
    value = re.sub(r"^```(?:markdown)?\s*", "", value.strip(), flags=re.IGNORECASE)
    value = re.sub(r"\s*```$", "", value.strip())
    return value.strip()


def requested_coverage_gap(query: str, content: str) -> tuple[int, int] | None:
    """Return required and observed counts for bounded weather forecasts."""
    match = re.search(r"\b(?:next|for)\s+(\d{1,2})\s+days?\b", query or "", re.IGNORECASE)
    if not match or "weather" not in (query or "").lower():
        return None
    required = min(int(match.group(1)), 31)
    observed = len({m.group(0).lower() for m in _MONTH_DATE_RE.finditer(content or "")})
    return (required, observed) if observed < required else None


def derive_pdf_title(query: str, content: str) -> str:
    heading = re.search(r"^#{1,3}\s+(.+)$", content or "", re.MULTILINE)
    if heading:
        candidate = heading.group(1).strip(" *_`#")
        if candidate and not re.match(r"^(?:got it|here.?s|i(?:.ll| will)|export_to_pdf)\b", candidate, re.I):
            return candidate[:120]
    candidate = re.sub(
        r"^\s*(?:please\s+)?(?:give|make|create|generate|export|download)\s+(?:me\s+)?(?:a\s+)?pdf\s+(?:of|about|for)\s+",
        "", query or "", flags=re.IGNORECASE,
).strip(" .?!")
    candidate = re.sub(r"^the\s+", "", candidate, flags=re.IGNORECASE)
    return (candidate or "OreoLook Report")[:120].title()


def is_placeholder_or_fallback(content: str) -> bool:
    if content in PLACEHOLDER_EXACT:
        return True
    if any(content.startswith(p) for p in PLACEHOLDER_PREFIXES):
        return True
    return bool(re.search(
        r"\[(?:accurate|insert|provide|actual|current|specific|relevant|"
        r"temperature|weather|wind|humidity)[^\]]*\]",
        content,
        re.IGNORECASE,
    ))


async def try_image_synthesis(messages, user_query, image_pool, headers, event_id):
    _image_list = "\n".join(f"![Image]({url})" for url in image_pool[:10] if url and url.startswith("http"))
    messages.append({
        "role": "user",
        "content": (
            f"Based on the search results, provide a final comprehensive answer to: {user_query}\n\n"
            f"Include these images in your response using markdown:\n{_image_list}"
        )
    })
    payload = {
        "model": MODEL,
        "messages": messages,
        "seed": random.randint(1000, 9999),
        "max_tokens": 2500,
        "stream": False,
    }
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(requests.post, POLLINATIONS_ENDPOINT, json=payload, headers=headers, timeout=55),
            timeout=60.0
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"].get("content", "")
        if content:
            logger.info(f"[FINAL] Image synthesis: {len(content)} chars")
            return content
    except Exception as e:
        logger.warning(f"[FINAL] Image synthesis failed: {e}")
    return None


async def auto_generate_pdf(final_content, query_lower, memoized_results, event_id):
    _already_has_pdf = bool(memoized_results.get("generated_pdfs"))
    if _already_has_pdf or memoized_results.get("pdf_export_attempted"):
        return None
    if memoized_results.get("suppress_pdf_export"):
        return None
    if not any(kw in query_lower.lower() for kw in ("pdf", "export", "save as", "document")):
        return None
    if not final_content or len(final_content) <= 100:
        return None

    logger.info(f"[FINAL] Auto-generating PDF ({len(final_content)} chars)")
    from functionCalls.generatePDF import create_pdf_from_content
    _title = derive_pdf_title(query_lower, final_content)
    memoized_results["pdf_export_attempted"] = True
    try:
        pdf_url = await create_pdf_from_content(final_content, _title)
    except Exception as exc:
        memoized_results["pdf_export_error"] = str(exc)
        raise
    if "generated_pdfs" not in memoized_results:
        memoized_results["generated_pdfs"] = []
    memoized_results["generated_pdfs"].append(pdf_url)
    logger.info(f"[FINAL] PDF generated: {pdf_url}")
    return pdf_url


def assemble_images(final_content, collected_images_from_web, collected_similar_images,
                     image_only_mode, memoized_results):
    existing_image_urls = set(re.findall(r'!\[[^\]]*\]\((https?://[^\)]+)\)', final_content))
    response_parts = [final_content]

    image_pool = collected_similar_images if (image_only_mode and collected_similar_images) else collected_images_from_web
    if image_pool:
        deduped_pool = []
        seen_urls = set()
        for img in image_pool:
            if img and img.startswith("http") and img not in seen_urls:
                seen_urls.add(img)
                deduped_pool.append(img)

        missing = [img for img in deduped_pool if img not in existing_image_urls]
        if missing:
            desired_total = min(10, max(4, len(deduped_pool)))
            to_add = max(0, desired_total - len(existing_image_urls))
            if to_add > 0:
                title = "Similar Images" if image_only_mode else "Related Images"
                label = "Similar Image" if image_only_mode else "Image"
                response_parts.append(f"\n\n**{title}:**\n")
                for img in missing[:to_add]:
                    response_parts.append(f"![{label}]({img})\n")

    generated_images = memoized_results.get("generated_images", [])
    if generated_images:
        gen_deduped = [img for img in generated_images if img not in existing_image_urls]
        if gen_deduped:
            response_parts.append("\n\n**Generated Images:**\n")
            for img in gen_deduped:
                response_parts.append(f"![Generated Image]({img})\n")

    return response_parts


def append_sources(response_parts, collected_sources):
    if collected_sources:
        from pipeline.utils import clean_source_list
        cleaned = clean_source_list(collected_sources)[:5]
        if cleaned:
            response_parts.append("\n\n---\n**Sources:**\n")
            for i, src in enumerate(cleaned):
                # Use domain as display name instead of the full URL
                try:
                    from urllib.parse import urlparse
                    _display = urlparse(src).netloc.replace("www.", "")
                except Exception:
                    _display = src
                response_parts.append(f"{i+1}. [{_display}]({src})\n")
    return "".join(response_parts)


def build_fallback_response(user_query, collected_sources, collected_images_from_web,
                             collected_similar_images, image_only_mode, memoized_results):
    content = f"I found relevant information about '{user_query}':"
    if collected_sources:
        content += f"\n\n{', '.join(collected_sources[:3])}"

    response_parts = [content]

    image_pool = collected_similar_images if (image_only_mode and collected_similar_images) else collected_images_from_web
    if image_pool:
        deduped = []
        seen = set()
        for img in image_pool:
            if img and img.startswith("http") and img not in seen:
                seen.add(img)
                deduped.append(img)
        if deduped:
            title = "Similar Images" if image_only_mode else "Related Images"
            label = "Similar Image" if image_only_mode else "Image"
            response_parts.append(f"\n\n**{title}:**\n")
            for img in deduped[:10]:
                response_parts.append(f"![{label}]({img})\n")

    generated = memoized_results.get("generated_images", [])
    if generated:
        response_parts.append("\n\n**Generated Images:**\n")
        for img in generated:
            response_parts.append(f"![Generated Image]({img})\n")

    return append_sources(response_parts, collected_sources)


async def save_to_caches(user_query, final_content, collected_sources, tool_call_count,
                          current_iteration, memoized_results, core_service, conversation_cache,
                          session_context, session_id):
    if conversation_cache is not None:
        try:
            _embedding = None
            if core_service:
                try:
                    _embedding = core_service.embed_single_text(user_query)
                except Exception:
                    pass
            conversation_cache.add_to_cache(
                query=user_query,
                response=final_content,
                metadata={
                    "sources": collected_sources[:5],
                    "tool_calls": tool_call_count,
                    "iteration": current_iteration,
                    "had_cache_hit": memoized_results.get("cache_hit", False)
                },
                query_embedding=_embedding,
            )
        except Exception as e:
            logger.warning(f"[Pipeline] Failed to save to cache: {e}")

    if session_context:
        try:
            session_context.add_message(role="assistant", content=final_content)
            memoized_results["_assistant_response_saved"] = True
        except Exception as e:
            logger.warning(f"[Pipeline] Failed to store reply in session: {e}")
