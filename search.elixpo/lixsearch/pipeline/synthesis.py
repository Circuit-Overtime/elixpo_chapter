import random
import asyncio
import requests
import json
import re
from loguru import logger

from pipeline.config import (
    POLLINATIONS_ENDPOINT,
    LLM_MODEL,
    RETRIEVAL_TOP_K,
    FETCH_MIN_USEFUL_CHARS,
    ERROR_MESSAGE_TRUNCATE,
    TOPIC_DECOMPOSITION_MAX_PARTS,
)
from pipeline.instruction import synthesis_instruction
from pipeline.helpers import (
    _scrub_tool_names,
    sanitize_final_response,
    _decompose_query_with_llm,
    _synthesize_subtopic,
)
from pipeline.utils import format_sse

MODEL = LLM_MODEL


async def run_standard_synthesis(messages, user_query, active_max_tokens, headers, is_detailed_mode,
                                  image_context_provided, collected_images_from_web, collected_similar_images):
    _has_images = image_context_provided or bool(collected_images_from_web) or bool(collected_similar_images)
    synthesis_prompt = {
        "role": "user",
        "content": synthesis_instruction(user_query, image_context=_has_images, is_detailed=is_detailed_mode)
    }

    if len(messages) > 14:
        _sys = [messages[0]]
        _tool_tail = messages[-6:]
        _mid = messages[1:-6]
        if len(_mid) > 6:
            _mid = _mid[-6:]
        messages = _sys + _mid + _tool_tail

    for m in messages:
        if m.get("role") == "assistant":
            m.pop("tool_calls", None)

    messages.append(synthesis_prompt)

    payload = {
        "model": MODEL,
        "messages": messages,
        "seed": random.randint(1000, 9999),
        "max_tokens": active_max_tokens,
        "stream": False,
        "tool_choice": "none",
    }

    for _attempt in range(1, 3):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    requests.post, POLLINATIONS_ENDPOINT,
                    json=payload, headers=headers, timeout=45
                ),
                timeout=50.0
            )
            response.raise_for_status()
            response_data = response.json()
            try:
                message = response_data["choices"][0]["message"]
                message.pop("reasoning_content", None)
                content = message.get("content", "").strip()

                if content and "<|tool_call" in content:
                    content = _scrub_tool_names(content)

                if content:
                    logger.info(f"[SYNTHESIS] Content extracted: {len(content)} chars")
                else:
                    logger.error(f"[SYNTHESIS] API returned empty content")
                return content
            except (KeyError, IndexError, TypeError) as e:
                logger.error(f"[SYNTHESIS] Failed to extract content: {e}")
                return None
        except asyncio.TimeoutError:
            logger.error(f"[SYNTHESIS TIMEOUT] attempt {_attempt}")
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"[SYNTHESIS HTTP ERROR] attempt {_attempt}: {str(http_err)[:ERROR_MESSAGE_TRUNCATE]}")
        except Exception as e:
            logger.error(f"[SYNTHESIS ERROR] attempt {_attempt}: {str(e)[:ERROR_MESSAGE_TRUNCATE]}")

        if _attempt < 2:
            await asyncio.sleep(1.5)

    return None


def build_synthesis_fallback(messages, user_query, rag_context, collected_sources):
    _tool_snippets = []
    for m in messages:
        if m.get("role") == "tool" and m.get("name") == "fetch_full_text":
            _content = m.get("content", "")
            if _content and not _content.startswith("[") and len(_content) >= FETCH_MIN_USEFUL_CHARS:
                _tool_snippets.append(_content[:300])

    if _tool_snippets:
        content = f"Here's what I found about **{user_query}**:\n\n"
        for snippet in _tool_snippets[:3]:
            content += f"> {snippet.strip()}\n\n"
        return content
    elif rag_context:
        content = f"Based on available context for **{user_query}**:\n\n"
        for chunk in rag_context.split("\n")[:5]:
            if chunk.strip():
                content += f"> {chunk.strip()[:250]}\n\n"
        return content
    else:
        content = f"I searched for information about **{user_query}** but couldn't generate a complete answer."
        if collected_sources:
            content += " Here are the sources I found that may help:"
        return content


async def re_retrieve_rag_context(user_query, current_rag_context):
    try:
        from searching.main import retrieve_from_vector_store
        updated = await asyncio.wait_for(
            asyncio.to_thread(retrieve_from_vector_store, user_query, top_k=RETRIEVAL_TOP_K),
            timeout=5.0
        )
        if updated:
            _results = updated.get("results", []) if isinstance(updated, dict) else updated
            rag_str = "\n".join([
                f"- {r.get('metadata', {}).get('text', '')[:200]}"
                for r in _results if isinstance(r, dict) and r.get('metadata', {}).get('text')
            ])
            if rag_str:
                return rag_str
    except Exception as e:
        logger.warning(f"[SYNTHESIS] Failed to re-retrieve context: {e}")
    return current_rag_context


async def run_detailed_synthesis(user_query, messages, headers, active_max_tokens,
                                  rag_context, collected_sources, event_id, emit_event):
    if event_id:
        yield format_sse("INFO", "<TASK>Decomposing topic</TASK>")

    subtopics = await _decompose_query_with_llm(user_query, headers, max_parts=TOPIC_DECOMPOSITION_MAX_PARTS)
    logger.info(f"[SYNTHESIS] Decomposed into {len(subtopics)} sub-topics")

    if len(messages) > 14:
        _sys = [messages[0]]
        _tool_tail = messages[-6:]
        _mid = messages[1:-6]
        if len(_mid) > 6:
            _mid = _mid[-6:]
        messages = _sys + _mid + _tool_tail

    all_responses = []
    per_part_tokens = max(800, active_max_tokens // len(subtopics))

    for idx, subtopic in enumerate(subtopics, 1):
        if event_id:
            yield format_sse("INFO", f"<TASK>Researching part {idx} of {len(subtopics)}</TASK>")

        try:
            response = await _synthesize_subtopic(
                subtopic=subtopic,
                original_query=user_query,
                messages_context=messages,
                headers=headers,
                max_tokens=per_part_tokens,
                rag_context=rag_context,
            )

            if response:
                response = await sanitize_final_response(response, subtopic, collected_sources, headers)
                response = _scrub_tool_names(response)
                all_responses.append(response)

                if idx == len(subtopics) and collected_sources:
                    source_block = "\n\n---\n**Sources:**\n"
                    unique_sources = sorted(list(set(collected_sources)))[:5]
                    for si, src in enumerate(unique_sources):
                        source_block += f"{si+1}. [{src}]({src})\n"
                    response += source_block

                if event_id:
                    yield format_sse("RESPONSE", response)
                else:
                    yield response

        except Exception as e:
            logger.error(f"[SYNTHESIS] Sub-topic {idx} failed: {e}")

    final = "\n\n".join(all_responses) if all_responses else None
    yield ("__FINAL__", final)
