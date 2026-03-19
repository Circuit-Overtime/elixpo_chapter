"""Deep search pipeline — multi-query research with progressive synthesis."""

import json
import random
import asyncio
import requests
import os
from datetime import datetime, timezone
from loguru import logger
from dotenv import load_dotenv

from pipeline.config import *
from pipeline.instruction import (
    system_instruction,
    synthesis_instruction,
    deep_search_gating_instruction,
    deep_search_sub_query_instruction,
    deep_search_final_synthesis_instruction,
)
from pipeline.tools import tools
from pipeline.optimized_tool_execution import optimized_tool_execution
from pipeline.helpers import (
    _scrub_tool_names,
    _decompose_query_with_llm,
)
from pipeline.utils import format_sse
from sessions.conversation_cache import ConversationCacheManager
from ragService.semanticCacheRedis import SemanticCacheRedis as SemanticCache, SessionContextWindow

load_dotenv()

MODEL = LLM_MODEL
POLLINATIONS_TOKEN = os.getenv("TOKEN")


async def _evaluate_deep_search_need(query: str, headers: dict) -> bool:
    gating_messages = [
        {"role": "system", "content": "You are a query complexity evaluator. Return only JSON."},
        {"role": "user", "content": deep_search_gating_instruction(query)},
    ]
    payload = {
        "model": MODEL,
        "messages": gating_messages,
        "seed": random.randint(1000, 9999),
        "max_tokens": 200,
        "stream": False,
    }
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                requests.post,
                POLLINATIONS_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=8
            ),
            timeout=10.0
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        result = json.loads(content)
        needs = result.get("needs_deep_search", True)
        reason = result.get("reason", "")
        logger.info(f"[DeepSearch] Gating LLM verdict: needs_deep_search={needs}, reason={reason}")
        return bool(needs)
    except Exception as e:
        logger.warning(f"[DeepSearch] Gating LLM call failed ({e}), defaulting to complexity heuristic")
        return None


async def _execute_deep_search_sub_query(
    sub_query: str,
    original_query: str,
    sub_query_index: int,
    total_sub_queries: int,
    headers: dict,
    memoized_results: dict,
    emit_event,
    core_service,
    current_utc_time,
):
    collected_sources = []
    collected_images = []

    rag_context = ""
    if core_service:
        try:
            retrieval_result = core_service.retrieve(sub_query, top_k=10)
            if retrieval_result.get("count", 0) > 0:
                rag_context = "\n".join(
                    [r["metadata"]["text"] for r in retrieval_result.get("results", [])]
                )
        except Exception:
            pass

    messages = [
        {
            "role": "system",
            "name": "elixposearch-agent-system",
            "content": system_instruction(rag_context, current_utc_time, is_detailed=True),
        },
        {
            "role": "user",
            "content": deep_search_sub_query_instruction(
                sub_query, original_query, sub_query_index, total_sub_queries
            ),
        },
    ]

    final_content = None
    tool_call_count = 0

    for iteration in range(1, DEEP_SEARCH_MAX_ITERATIONS_PER_SUB + 1):
        if len(messages) > 8:
            messages = messages[:2] + messages[-6:]

        for m in messages:
            if m.get("role") == "assistant" and not m.get("content"):
                if m.get("tool_calls"):
                    m["content"] = f"Executing {len(m['tool_calls'])} tool(s)..."
                else:
                    m["content"] = "Researching..."

        payload = {
            "model": MODEL,
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
            "seed": random.randint(1000, 9999),
            "max_tokens": DEEP_SEARCH_MAX_TOKENS_PER_SUB,
        }

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    requests.post,
                    POLLINATIONS_ENDPOINT,
                    json=payload,
                    headers=headers,
                    timeout=45
                ),
                timeout=50.0,
            )
            response.raise_for_status()
            response_data = response.json()
        except Exception as e:
            logger.error(f"[DeepSearch:Sub{sub_query_index}] API error at iteration {iteration}: {e}")
            break

        assistant_message = response_data["choices"][0]["message"]
        if not assistant_message.get("content"):
            if assistant_message.get("tool_calls"):
                assistant_message["content"] = "Gathering information..."
            else:
                assistant_message["content"] = "Researching..."

        messages.append(assistant_message)
        tool_calls = assistant_message.get("tool_calls")

        if not tool_calls:
            final_content = assistant_message.get("content")
            logger.info(f"[DeepSearch:Sub{sub_query_index}] Iteration {iteration}: no tool calls, final content ready ({len(final_content or '')} chars)")
            break

        logger.info(f"[DeepSearch:Sub{sub_query_index}] Iteration {iteration}: {len(tool_calls)} tool calls")
        tool_outputs = []
        fetch_calls = []
        web_search_calls = []
        other_calls = []

        for tc in tool_calls:
            fn_name = tc["function"]["name"]
            if fn_name == "fetch_full_text":
                fetch_calls.append(tc)
            elif fn_name == "web_search":
                web_search_calls.append(tc)
            else:
                other_calls.append(tc)

        fetch_calls = fetch_calls[:DEEP_SEARCH_MAX_LINKS_PER_SUB]
        tool_call_count += len(tool_calls)

        if web_search_calls:
            async def _exec_ws(idx, tc):
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"]["arguments"])
                logger.info(f"[DeepSearch:Sub{sub_query_index}] WebSearch #{idx+1}: {fn_args.get('query', '')[:50]}")
                tool_result = None
                async for result in optimized_tool_execution(fn_name, fn_args, memoized_results, emit_event):
                    if isinstance(result, tuple):
                        tool_result = result[0]
                    elif isinstance(result, str) and not result.startswith("event:"):
                        tool_result = result
                return {"tool_call_id": tc["id"], "name": fn_name, "result": tool_result}

            ws_results = await asyncio.gather(
                *[_exec_ws(idx, tc) for idx, tc in enumerate(web_search_calls)],
                return_exceptions=True,
            )
            for r in ws_results:
                if not isinstance(r, Exception):
                    if "current_search_urls" in memoized_results:
                        collected_sources.extend(memoized_results["current_search_urls"][:3])
                    tool_outputs.append({
                        "role": "tool",
                        "tool_call_id": r["tool_call_id"],
                        "name": r["name"],
                        "content": str(r["result"]) if r["result"] else "No result",
                    })

        for tc in other_calls:
            fn_name = tc["function"]["name"]
            fn_args = json.loads(tc["function"]["arguments"])
            logger.info(f"[DeepSearch:Sub{sub_query_index}] Tool: {fn_name}")
            tool_result = None
            image_urls = []
            tool_result_gen = optimized_tool_execution(fn_name, fn_args, memoized_results, emit_event)
            if hasattr(tool_result_gen, '__aiter__'):
                async for result in tool_result_gen:
                    if isinstance(result, tuple):
                        tool_result, image_urls = result
                    elif isinstance(result, str) and not result.startswith("event:"):
                        tool_result = result
            if fn_name == "image_search" and image_urls:
                collected_images.extend(image_urls)
            tool_outputs.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "name": fn_name,
                "content": str(tool_result) if tool_result else "No result",
            })

        if fetch_calls:
            async def _exec_fetch(idx, tc):
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"]["arguments"])
                url = fn_args.get("url", "")
                logger.info(f"[DeepSearch:Sub{sub_query_index}] Fetch #{idx+1}: {url[:60]}")
                tool_result = None
                async for result in optimized_tool_execution(fn_name, fn_args, memoized_results, emit_event):
                    if not isinstance(result, str) or not result.startswith("event:"):
                        tool_result = result
                return {"tool_call_id": tc["id"], "url": url, "result": tool_result}

            try:
                fetch_results = await asyncio.wait_for(
                    asyncio.gather(
                        *[_exec_fetch(idx, tc) for idx, tc in enumerate(fetch_calls)],
                        return_exceptions=True,
                    ),
                    timeout=8.0,
                )
            except (asyncio.TimeoutError, TimeoutError):
                logger.warning(f"[DeepSearch:Sub{sub_query_index}] Fetch timeout")
                fetch_results = []

            for fr in fetch_results:
                if isinstance(fr, Exception):
                    continue
                url = fr.get("url", "")
                if url and len(collected_sources) < 6:
                    collected_sources.append(url)
                tool_outputs.append({
                    "role": "tool",
                    "tool_call_id": fr["tool_call_id"],
                    "name": "fetch_full_text",
                    "content": str(fr["result"])[:500] if fr["result"] else "No result",
                })

        messages.extend(tool_outputs)

    if not final_content:
        logger.info(f"[DeepSearch:Sub{sub_query_index}] Forcing synthesis after {DEEP_SEARCH_MAX_ITERATIONS_PER_SUB} iterations")
        synthesis_messages = messages[:2] + messages[-4:] if len(messages) > 6 else messages
        synthesis_messages.append({
            "role": "user",
            "content": synthesis_instruction(sub_query, is_detailed=True),
        })
        try:
            resp = await asyncio.wait_for(
                asyncio.to_thread(
                    requests.post,
                    POLLINATIONS_ENDPOINT,
                    json={
                        "model": MODEL,
                        "messages": synthesis_messages,
                        "seed": random.randint(1000, 9999),
                        "max_tokens": DEEP_SEARCH_MAX_TOKENS_PER_SUB,
                        "stream": False,
                    },
                    headers=headers,
                    timeout=20,
                ),
                timeout=22.0,
            )
            resp.raise_for_status()
            final_content = resp.json()["choices"][0]["message"].get("content", "").strip()
        except Exception as e:
            logger.error(f"[DeepSearch:Sub{sub_query_index}] Forced synthesis failed: {e}")
            final_content = f"Research on '{sub_query}' gathered {len(collected_sources)} sources."

    logger.info(
        f"[DeepSearch:Sub{sub_query_index}] Complete: {len(final_content or '')} chars, "
        f"{len(collected_sources)} sources, {tool_call_count} tool calls"
    )
    return final_content or "", collected_sources, collected_images


async def _deep_search_final_synthesis(
    original_query: str,
    sub_results: list,
    headers: dict,
) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are lixSearch. Combine multiple research findings into a single "
                "comprehensive, well-structured answer. Never mention sub-queries, "
                "research threads, or internal processes. "
                "NEVER mention internal tool names, function calls, or cache operations."
            ),
        },
        {
            "role": "user",
            "content": deep_search_final_synthesis_instruction(original_query, sub_results),
        },
    ]

    payload = {
        "model": MODEL,
        "messages": messages,
        "seed": random.randint(1000, 9999),
        "max_tokens": DEEP_SEARCH_FINAL_SYNTHESIS_MAX_TOKENS,
        "stream": False,
    }

    response = await asyncio.wait_for(
        asyncio.to_thread(
            requests.post,
            POLLINATIONS_ENDPOINT,
            json=payload,
            headers=headers,
            timeout=30,
        ),
        timeout=35.0,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"].get("content", "").strip()


async def _run_deep_search_pipeline(
    user_query: str,
    user_image: str,
    event_id: str,
    session_id: str,
    emit_event,
):
    logger.info(f"[DeepSearch] Starting deep search for: '{user_query[:80]}'")

    current_utc_time = datetime.now(timezone.utc)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {POLLINATIONS_TOKEN}",
    }

    core_service = None
    try:
        from ipcService.coreServiceManager import get_core_embedding_service
        core_service = get_core_embedding_service()
    except Exception as e:
        logger.warning(f"[DeepSearch] IPC CoreEmbeddingService unavailable: {e}")

    session_context = None
    if session_id:
        try:
            session_context = SessionContextWindow(session_id=session_id)
            session_context.add_message(role="user", content=user_query)
        except Exception as e:
            logger.warning(f"[DeepSearch] SessionContextWindow init failed: {e}")

    memoized_results = {
        "timezone_info": {},
        "web_searches": {},
        "fetched_urls": {},
        "youtube_metadata": {},
        "youtube_transcripts": {},
        "base64_cache": {},
        "context_sufficient": False,
        "cache_hit": False,
        "cached_response": None,
        "session_id": session_id or "",
        "generated_images": [],
    }

    _embed_fn = core_service.embed_single_text if core_service else None
    conversation_cache = ConversationCacheManager(
        window_size=CACHE_WINDOW_SIZE,
        max_entries=CACHE_MAX_ENTRIES,
        ttl_seconds=CACHE_TTL_SECONDS,
        compression_method=CACHE_COMPRESSION_METHOD,
        embedding_model=CACHE_EMBEDDING_MODEL,
        similarity_threshold=CACHE_SIMILARITY_THRESHOLD,
        cache_dir=CONVERSATION_CACHE_DIR,
        embed_fn=_embed_fn,
    )
    memoized_results["conversation_cache"] = conversation_cache
    if session_id:
        try:
            conversation_cache.load_from_disk(session_id=session_id)
        except Exception as e:
            logger.warning(f"[DeepSearch] Failed to load conversation cache: {e}")

    semantic_cache = None
    try:
        semantic_cache = SemanticCache(
            session_id=session_id or "pipeline",
            ttl_seconds=SEMANTIC_CACHE_TTL_SECONDS,
            similarity_threshold=SEMANTIC_CACHE_SIMILARITY_THRESHOLD,
            redis_host=SEMANTIC_CACHE_REDIS_HOST,
            redis_port=SEMANTIC_CACHE_REDIS_PORT,
            redis_db=SEMANTIC_CACHE_REDIS_DB,
        )
        if session_id:
            semantic_cache.load_for_request(session_id)
    except Exception as e:
        logger.warning(f"[DeepSearch] Semantic cache init failed: {e}")

    decompose_event = emit_event("INFO", "<TASK>Analyzing query for deep search</TASK>")
    if decompose_event:
        yield decompose_event

    sub_queries = await _decompose_query_with_llm(
        user_query, headers, max_parts=DEEP_SEARCH_MAX_SUB_QUERIES
    )
    logger.info(f"[DeepSearch] Decomposed into {len(sub_queries)} sub-queries: {sub_queries}")

    if len(sub_queries) <= 1:
        from pipeline.queryDecomposition import QueryAnalyzer
        analyzer = QueryAnalyzer()
        proposed = analyzer.propose_decomposition(user_query)
        if len(proposed) > 1:
            sub_queries = [sq.text for sq in proposed[:DEEP_SEARCH_MAX_SUB_QUERIES]]
            logger.info(f"[DeepSearch] Aspect-based fallback: {len(sub_queries)} sub-queries")

    plan_event = emit_event(
        "INFO",
        f"<TASK>Deep searching {len(sub_queries)} aspects of your question</TASK>",
    )
    if plan_event:
        yield plan_event

    all_sub_results = []
    all_collected_sources = []
    all_collected_images = []

    for sq_idx, sub_query in enumerate(sub_queries, 1):
        logger.info(f"[DeepSearch] Sub-query {sq_idx}/{len(sub_queries)}: '{sub_query[:80]}'")

        sq_event = emit_event(
            "INFO",
            f"<TASK>Researching ({sq_idx}/{len(sub_queries)}): {sub_query[:60]}</TASK>",
        )
        if sq_event:
            yield sq_event

        try:
            sq_response, sq_sources, sq_images = await asyncio.wait_for(
                _execute_deep_search_sub_query(
                    sub_query=sub_query,
                    original_query=user_query,
                    sub_query_index=sq_idx,
                    total_sub_queries=len(sub_queries),
                    headers=headers,
                    memoized_results=memoized_results,
                    emit_event=emit_event,
                    core_service=core_service,
                    current_utc_time=current_utc_time,
                ),
                timeout=float(DEEP_SEARCH_TIMEOUT_PER_SUB),
            )

            if sq_response:
                sq_response = _scrub_tool_names(sq_response)
                all_sub_results.append((sub_query, sq_response, sq_sources))
                all_collected_sources.extend(sq_sources)
                all_collected_images.extend(sq_images)

                if event_id:
                    yield format_sse("RESPONSE", sq_response)
                else:
                    yield sq_response

                logger.info(
                    f"[DeepSearch] Sub-query {sq_idx} complete: "
                    f"{len(sq_response)} chars, {len(sq_sources)} sources"
                )
            else:
                logger.warning(f"[DeepSearch] Sub-query {sq_idx} returned empty response")

        except asyncio.TimeoutError:
            logger.error(f"[DeepSearch] Sub-query {sq_idx} timed out after {DEEP_SEARCH_TIMEOUT_PER_SUB}s")
            timeout_event = emit_event(
                "INFO",
                f"<TASK>Research thread {sq_idx} timed out, continuing</TASK>",
            )
            if timeout_event:
                yield timeout_event
        except Exception as e:
            logger.error(f"[DeepSearch] Sub-query {sq_idx} failed: {e}", exc_info=True)

    if len(all_sub_results) > 1:
        synth_event = emit_event("INFO", "<TASK>Combining all research into final answer</TASK>")
        if synth_event:
            yield synth_event

        try:
            final_response = await _deep_search_final_synthesis(
                original_query=user_query,
                sub_results=all_sub_results,
                headers=headers,
            )

            if final_response:
                final_response = _scrub_tool_names(final_response)

                if all_collected_sources:
                    unique_sources = sorted(set(all_collected_sources))[:8]
                    source_block = "\n\n---\n**Sources:**\n"
                    for i, src in enumerate(unique_sources, 1):
                        source_block += f"{i}. [{src}]({src})\n"
                    final_response += source_block

                if event_id:
                    yield format_sse("RESPONSE", final_response)
                else:
                    yield final_response

        except Exception as e:
            logger.error(f"[DeepSearch] Final synthesis failed: {e}", exc_info=True)

    elif len(all_sub_results) == 1:
        _sq, _resp, _srcs = all_sub_results[0]
        if _srcs:
            unique_sources = sorted(set(_srcs))[:5]
            source_block = "\n\n---\n**Sources:**\n"
            for i, src in enumerate(unique_sources, 1):
                source_block += f"{i}. [{src}]({src})\n"
            source_response = _resp + source_block
            if event_id:
                yield format_sse("RESPONSE", source_response)
            else:
                yield source_response

    combined_content = "\n\n".join(r[1] for r in all_sub_results) if all_sub_results else None
    if combined_content:
        memoized_results["final_response"] = combined_content
        try:
            cache_metadata = {
                "sources": all_collected_sources[:8],
                "deep_search": True,
                "sub_queries": len(all_sub_results),
            }
            _cache_embedding = None
            if core_service:
                try:
                    _cache_embedding = core_service.embed_single_text(user_query)
                except Exception:
                    pass
            conversation_cache.add_to_cache(
                query=user_query,
                response=combined_content,
                metadata=cache_metadata,
                query_embedding=_cache_embedding,
            )
        except Exception as e:
            logger.warning(f"[DeepSearch] Cache save failed: {e}")

        if session_context:
            try:
                session_context.add_message(role="assistant", content=combined_content)
                memoized_results["_assistant_response_saved"] = True
            except Exception as e:
                logger.warning(f"[DeepSearch] Session context save failed: {e}")

    if session_id and semantic_cache is not None:
        try:
            semantic_cache.save_for_request(session_id)
        except Exception:
            pass

    if session_id:
        try:
            conversation_cache.save_to_disk(session_id=session_id)
        except Exception:
            pass

    done_event = emit_event("INFO", "<TASK>DONE</TASK>")
    if done_event:
        yield done_event

    logger.info(
        f"[DeepSearch] Complete: {len(all_sub_results)} sub-queries answered, "
        f"{len(all_collected_sources)} total sources"
    )
