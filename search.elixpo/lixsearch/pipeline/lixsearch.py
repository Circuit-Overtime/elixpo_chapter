from datetime import datetime, timezone
from loguru import logger
from ragService.semanticCacheRedis import SemanticCacheRedis as SemanticCache, SessionContextWindow
import random
import requests
import json
import re
from pipeline.tools import tools
from sessions.conversation_cache import ConversationCacheManager

import os
from dotenv import load_dotenv
from pipeline.config import *
from pipeline.instruction import system_instruction, user_instruction, synthesis_instruction
from pipeline.optimized_tool_execution import optimized_tool_execution
from pipeline.utils import format_sse, clean_url, clean_source_list
from pipeline.sse_messages import SSEStatusTracker
from pipeline.helpers import (
    _scrub_tool_names,
    get_user_message,
    _looks_like_internal_reasoning,
    _evaluate_fetch_quality,
    sanitize_final_response,
    extract_leaked_tool_call,
)
from pipeline.synthesis import (
    run_standard_synthesis,
    build_synthesis_fallback,
    re_retrieve_rag_context,
    run_detailed_synthesis,
)
from pipeline.response_builder import (
    is_placeholder_or_fallback,
    try_image_synthesis,
    assemble_images,
    append_sources,
    build_fallback_response,
    save_to_caches,
)
from pipeline.deep_search import _run_deep_search_pipeline
from functionCalls.getImagePrompt import describe_image, replyFromImage
import asyncio

load_dotenv()

POLLINATIONS_TOKEN = os.getenv("TOKEN")
MODEL = LLM_MODEL
MODEL_FALLBACK = LLM_MODEL_FALLBACK


async def _stream_llm_call(payload: dict, headers: dict):
    """Stream an LLM call from Pollinations. Yields ("content", str) for text
    deltas and ("done", assistant_message_dict) when finished. Tool call deltas
    are accumulated silently and returned in the final message.
    Yields ("keepalive", None) every few seconds while waiting for the first token."""
    loop = asyncio.get_event_loop()
    queue = asyncio.Queue()

    def _blocking_stream():
        try:
            with requests.post(
                POLLINATIONS_ENDPOINT, json={**payload, "stream": True},
                headers=headers, stream=True, timeout=55,
            ) as r:
                r.raise_for_status()
                for line in r.iter_lines(decode_unicode=True):
                    if line:
                        loop.call_soon_threadsafe(queue.put_nowait, line)
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, e)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    asyncio.ensure_future(asyncio.to_thread(_blocking_stream))

    content = ""
    tool_calls = []
    got_first_token = False
    _keepalive_count = 0

    while True:
        try:
            line = await asyncio.wait_for(queue.get(), timeout=8.0)
        except asyncio.TimeoutError:
            if not got_first_token and _keepalive_count < 7:
                _keepalive_count += 1
                yield ("keepalive", None)
                continue
            break
        if line is None:
            break
        if isinstance(line, Exception):
            raise line
        if not isinstance(line, str) or not line.startswith("data: "):
            continue
        data_str = line[6:]
        if data_str.strip() == "[DONE]":
            break
        try:
            obj = json.loads(data_str)
            choices = obj.get("choices", [])
            if not choices:
                continue
            delta = choices[0].get("delta", {})

            if "content" in delta and delta["content"]:
                got_first_token = True
                content += delta["content"]
                yield ("content", delta["content"])

            if "tool_calls" in delta:
                for tc_delta in delta["tool_calls"]:
                    idx = tc_delta.get("index", 0)
                    while len(tool_calls) <= idx:
                        tool_calls.append({"id": "", "type": "function",
                                           "function": {"name": "", "arguments": ""}})
                    if "id" in tc_delta:
                        tool_calls[idx]["id"] = tc_delta["id"]
                    if "function" in tc_delta:
                        fn = tc_delta["function"]
                        if "name" in fn:
                            tool_calls[idx]["function"]["name"] += fn["name"]
                        if "arguments" in fn:
                            tool_calls[idx]["function"]["arguments"] += fn["arguments"]

            if choices[0].get("finish_reason"):
                break
        except json.JSONDecodeError:
            continue

    message = {"role": "assistant", "content": content}
    if tool_calls:
        message["tool_calls"] = tool_calls
    yield ("done", message)

_DETAIL_RE = re.compile(
    r"\b(detail(?:ed|s)?|comprehensive|in[- ]?depth|thorough|extensive|elaborate|full|complete|everything about|deep dive|lengthy|long)\b",
    re.IGNORECASE,
)


async def run_elixposearch_pipeline(user_query: str, user_image: str, event_id: str = None,
                                     session_id: str = None, user_images: list = None,
                                     chat_history: list = None, is_ephemeral: bool = False):
    if user_images is None:
        user_images = [user_image] if user_image else []
    if not user_image and user_images:
        user_image = user_images[0]

    logger.info(f"[pipeline] session={session_id} model={MODEL} fallback={MODEL_FALLBACK} query='{user_query[:LOG_MESSAGE_QUERY_TRUNCATE]}...' images={len(user_images)}")

    if session_id and not is_ephemeral:
        try:
            from sessions.main import get_session_manager
            sm = get_session_manager()
            if not sm.get_session(session_id):
                sm.create_session(user_query or "(image query)", session_id=session_id)
        except Exception:
            pass

    def emit_event(event_type, message):
        if event_id:
            return format_sse(event_type, message)
        return None

    original_user_query = user_query or ""
    image_only_mode = bool(user_image and not original_user_query.strip())

    initial_event = emit_event("INFO", get_user_message("processing"))
    if initial_event:
        yield initial_event

    is_detailed_mode = bool(_DETAIL_RE.search(original_user_query))
    active_min_links = MIN_LINKS_TO_TAKE_DETAILED if is_detailed_mode else MIN_LINKS_TO_TAKE
    active_max_links = MAX_LINKS_TO_TAKE_DETAILED if is_detailed_mode else MAX_LINKS_TO_TAKE
    active_max_tokens = LLM_MAX_TOKENS_DETAILED if is_detailed_mode else LLM_MAX_TOKENS
    active_max_sources = MAX_SOURCES_DETAILED if is_detailed_mode else MAX_SOURCES_STANDARD
    active_sources_per_search = SOURCES_PER_SEARCH

    status_tracker = SSEStatusTracker(emit_fn=emit_event, stale_threshold=10.0)
    semantic_cache = None
    memoized_results = {}

    try:
        current_utc_time = datetime.now(timezone.utc)
        headers = {"Content-Type": "application/json",
                   "Authorization": f"Bearer {POLLINATIONS_TOKEN}"}

        try:
            from ipcService.coreServiceManager import get_core_embedding_service
            core_service = get_core_embedding_service()
        except Exception:
            core_service = None

        memoized_results = {
            "timezone_info": {}, "web_searches": {}, "fetched_urls": {},
            "youtube_metadata": {}, "youtube_transcripts": {}, "base64_cache": {},
            "context_sufficient": False, "cache_hit": False, "cached_response": None,
            "session_id": session_id or "", "generated_images": [],
        }

        # --- Session context (skip for ephemeral — no history to load or persist) ---
        session_context = None
        if session_id and not is_ephemeral:
            try:
                session_context = SessionContextWindow(session_id=session_id)
                memoized_results["session_context"] = session_context
                previous_messages = session_context.get_context()
                session_context.add_message(role="user", content=user_query)
                logger.info(f"[Pipeline] Session {session_id}: {len(previous_messages)} hot messages")
            except Exception:
                session_context = None

        # --- Conversation cache + Semantic cache (skip for ephemeral — no history) ---
        conversation_cache = None
        if session_id and not is_ephemeral:
            _embed_fn = core_service.embed_single_text if core_service else None
            conversation_cache = ConversationCacheManager(
                window_size=CACHE_WINDOW_SIZE, max_entries=CACHE_MAX_ENTRIES,
                ttl_seconds=CACHE_TTL_SECONDS, compression_method=CACHE_COMPRESSION_METHOD,
                embedding_model=CACHE_EMBEDDING_MODEL, similarity_threshold=CACHE_SIMILARITY_THRESHOLD,
                cache_dir=CONVERSATION_CACHE_DIR, embed_fn=_embed_fn,
            )
            memoized_results["conversation_cache"] = conversation_cache
            conversation_cache.load_from_disk(session_id=session_id)

            semantic_cache = SemanticCache(
                session_id=session_id,
                ttl_seconds=SEMANTIC_CACHE_TTL_SECONDS,
                similarity_threshold=SEMANTIC_CACHE_SIMILARITY_THRESHOLD,
                redis_host=SEMANTIC_CACHE_REDIS_HOST,
                redis_port=SEMANTIC_CACHE_REDIS_PORT,
                redis_db=SEMANTIC_CACHE_REDIS_DB
            )
            semantic_cache.load_for_request(session_id)

        # --- Image handling ---
        image_context_provided = False
        image_analysis_result = None
        _active_images = user_images if user_images else ([user_image] if user_image else [])
        _num_images = len(_active_images)

        if image_only_mode:
            try:
                image_event = emit_event("INFO", f"<TASK>Analyzing {_num_images} image{'s' if _num_images > 1 else ''}</TASK>")
                if image_event:
                    yield image_event
                descriptions = await asyncio.gather(
                    *[describe_image(img) for img in _active_images], return_exceptions=True,
                )
                parts = []
                for idx, desc in enumerate(descriptions):
                    if isinstance(desc, Exception):
                        continue
                    parts.append(f"### Image {idx+1}\n\n{desc}" if _num_images > 1 else desc)
                image_description = "\n\n".join(parts) if parts else ""
                if not image_description:
                    raise RuntimeError("All image descriptions failed")
                done_event = emit_event("INFO", "<TASK>Image analysis complete</TASK>")
                if done_event:
                    yield done_event
                if event_id:
                    for i in range(0, len(image_description), 80):
                        yield format_sse("RESPONSE", image_description[i:i+80])
                    yield format_sse("INFO", "<TASK>DONE</TASK>")
                else:
                    yield image_description
                memoized_results["final_response"] = image_description
                if session_id and semantic_cache is not None:
                    semantic_cache.save_for_request(session_id)
                return
            except Exception:
                user_query = "describe this image"
        elif _active_images and user_query.strip():
            try:
                image_event = emit_event("INFO", f"<TASK>Analyzing {_num_images} image{'s' if _num_images > 1 else ''}</TASK>")
                if image_event:
                    yield image_event
                analyses = await asyncio.gather(
                    *[replyFromImage(img, user_query) for img in _active_images], return_exceptions=True,
                )
                parts = []
                for idx, analysis in enumerate(analyses):
                    if isinstance(analysis, Exception):
                        continue
                    parts.append(f"[Image {idx+1} Analysis]\n{analysis}" if _num_images > 1 else analysis)
                image_analysis_result = "\n\n".join(parts) if parts else None
                if image_analysis_result:
                    image_context_provided = True
                done_event = emit_event("INFO", f"<TASK>Image{'s' if _num_images > 1 else ''} analyzed</TASK>")
                if done_event:
                    yield done_event
            except Exception:
                image_context_provided = False

        # --- Tool loop ---
        max_iterations = 3
        current_iteration = 0
        collected_sources = []
        collected_images_from_web = []
        collected_similar_images = []
        final_message_content = None
        tool_call_count = 0

        # --- RAG retrieval (only include chunks that are actually relevant) ---
        rag_context = ""
        _RAG_MIN_SCORE = 0.25
        if core_service:
            try:
                active_top_k = RETRIEVAL_TOP_K * 2 if is_detailed_mode else RETRIEVAL_TOP_K
                retrieval_result = await asyncio.wait_for(
                    asyncio.to_thread(core_service.retrieve, user_query, active_top_k), timeout=2.0
                )
                if retrieval_result.get("count", 0) > 0:
                    relevant = [r for r in retrieval_result.get("results", []) if r.get("score", 0) >= _RAG_MIN_SCORE]
                    if relevant:
                        _rag_chunks = [r["metadata"]["text"] for r in relevant]
                        rag_context = "\n".join(_rag_chunks)
                        if len(rag_context) > 8000:
                            rag_context = rag_context[:8000]
                        rag_event = emit_event("INFO", f"<TASK>Recalling {len(relevant)} related snippet{'s' if len(relevant) != 1 else ''} from memory</TASK>")
                        if rag_event:
                            yield rag_event
            except asyncio.TimeoutError:
                logger.warning("[Pipeline] Vector store retrieval timed out")
            except Exception:
                logger.warning("[Pipeline] Vector store retrieval failed")

        # --- Build initial messages ---
        user_msg_content = user_instruction(user_query, user_image if not image_analysis_result else None, is_detailed=is_detailed_mode)
        if image_analysis_result:
            user_msg_content += f"\n\n[Image Analysis]\n{image_analysis_result}"

        messages = [
            {"role": "system", "name": "elixposearch-agent-system",
             "content": system_instruction(rag_context, current_utc_time, is_detailed=is_detailed_mode, session_id=session_id)},
        ]

        # --- Inject conversation history ---
        _injected_history = 0
        _history_token_budget = HISTORY_TOKEN_BUDGET_DETAILED if is_detailed_mode else HISTORY_TOKEN_BUDGET
        _history_tokens_used = 0
        _last_msg_ts = None

        if chat_history:
            for msg in chat_history:
                _role = msg.get("role", "user")
                _content = msg.get("content", "")
                if _role in ("user", "assistant") and _content:
                    _msg_tokens = len(_content) // 4
                    if _history_tokens_used + _msg_tokens > _history_token_budget:
                        break
                    messages.append({"role": _role, "content": _content})
                    _history_tokens_used += _msg_tokens
                    _injected_history += 1
        elif session_id and session_context:
            try:
                _prev = session_context.get_context()
                if _prev and _prev[-1].get("role") == "user" and _prev[-1].get("content") == user_query:
                    _prev = _prev[:-1]
                _trimmed = []
                for msg in reversed(_prev):
                    _content = msg.get("content", "")
                    _msg_tokens = len(_content) // 4
                    if _history_tokens_used + _msg_tokens > _history_token_budget:
                        break
                    _trimmed.insert(0, msg)
                    _history_tokens_used += _msg_tokens
                for msg in _trimmed:
                    _role = msg.get("role", "user")
                    _content = msg.get("content", "")
                    _ts = msg.get("timestamp")
                    if _role in ("user", "assistant") and _content:
                        messages.append({"role": _role, "content": _content})
                        _injected_history += 1
                        if _ts:
                            _last_msg_ts = float(_ts)
            except Exception as e:
                logger.warning(f"[Pipeline] Failed to inject conversation history: {e}")

        # Inject timing context for returning users
        if _injected_history > 0 and _last_msg_ts:
            try:
                _gap = current_utc_time.timestamp() - _last_msg_ts
                _note = None
                if _gap > 86400:
                    _note = f"The user is returning after {int(_gap // 86400)} day(s) away."
                elif _gap > 3600:
                    _note = f"The user is returning after {int(_gap // 3600)} hour(s) away."
                if _note:
                    messages.append({
                        "role": "system",
                        "content": f"[Private context — do NOT mention this in your response] {_note}"
                    })
            except Exception:
                pass

        messages.append({"role": "user", "content": user_msg_content})
        force_synthesis = False

        # Detect meta-queries (summaries, recaps)
        _query_lower = user_query.lower()
        _meta_keywords = ["summarize", "summary", "recap", "what did we", "what have we",
                          "conversation so far", "previous conversation", "our conversation",
                          "what we discussed", "what we talked", "chat history"]
        if _injected_history >= 2 and any(kw in _query_lower for kw in _meta_keywords):
            force_synthesis = True

        # ==================== TOOL LOOP ====================
        _streamed_content = ""
        while current_iteration < max_iterations:
            current_iteration += 1

            # Ensure all assistant messages have content
            for m in messages:
                if m.get("role") == "assistant" and not m.get("content"):
                    m["content"] = f"Executing {len(m.get('tool_calls', []))} tool(s)..." if m.get("tool_calls") else "Processing..."

            # Trim context if too long
            if len(messages) > 20:
                _system = [messages[0]]
                _tool_msgs = messages[-6:]
                _history_msgs = messages[1:-6]
                if len(_history_msgs) > 8:
                    _history_msgs = _history_msgs[-8:]
                messages = _system + _history_msgs + _tool_msgs

            # When force_synthesis is set, strip tool_calls from assistant messages
            # and remove tool-role messages to avoid API errors (no tools in payload).
            if force_synthesis:
                _synth_messages = []
                for m in messages:
                    if m.get("role") == "tool":
                        # Convert tool results to system context so the LLM still sees them
                        _tool_content = m.get("content", "")
                        if _tool_content and _tool_content != "No result":
                            _synth_messages.append({
                                "role": "user",
                                "content": f"[Search result from {m.get('name', 'tool')}]: {_tool_content}"
                            })
                        continue
                    _mc = dict(m)
                    if _mc.get("role") == "assistant":
                        _mc.pop("tool_calls", None)
                    _synth_messages.append(_mc)
                payload = {"model": MODEL, "messages": _synth_messages, "seed": random.randint(1000, 9999), "max_tokens": active_max_tokens}
            else:
                payload = {"model": MODEL, "messages": messages, "seed": random.randint(1000, 9999), "max_tokens": active_max_tokens}
                payload["tools"] = tools
                payload["tool_choice"] = "auto"

            _stale_event = status_tracker.refresh_if_stale()
            if _stale_event:
                yield _stale_event

            # --- Streaming path: stream content tokens when synthesizing ---
            _use_streaming = force_synthesis and event_id
            _streamed_content = ""

            if _use_streaming:
                assistant_message = None
                for _stream_model in (payload.get("model", MODEL), MODEL_FALLBACK):
                    try:
                        _stream_payload = {**payload, "model": _stream_model}
                        _streamed_content = ""
                        async for _stype, _sdata in _stream_llm_call(_stream_payload, headers):
                            if _stype == "keepalive":
                                _ke = emit_event("INFO", "<TASK>Thinking</TASK>")
                                if _ke:
                                    yield _ke
                                status_tracker.touch()
                            elif _stype == "content":
                                _streamed_content += _sdata
                                yield format_sse("RESPONSE", _sdata)
                                status_tracker.touch()
                            elif _stype == "done":
                                assistant_message = _sdata
                        if assistant_message and assistant_message.get("content"):
                            break  # success
                        logger.warning(f"Streaming model={_stream_model} returned empty, trying fallback")
                    except Exception as e:
                        logger.warning(f"Streaming API error with model={_stream_model}: {e}")
                        if _stream_model == MODEL_FALLBACK:
                            logger.error(f"Streaming fallback also failed at iteration {current_iteration}")
                        continue
                if not assistant_message:
                    break
            else:
                # --- Non-streaming path: blocking call with keepalive + fallback ---
                response_data = None
                for _model_attempt in (payload.get("model", MODEL), MODEL_FALLBACK):
                    _attempt_payload = {**payload, "model": _model_attempt}
                    try:
                        _api_task = asyncio.ensure_future(
                            asyncio.to_thread(requests.post, POLLINATIONS_ENDPOINT, json=_attempt_payload, headers=headers, timeout=55)
                        )
                        while not _api_task.done():
                            await asyncio.wait({_api_task}, timeout=5.0)
                            if not _api_task.done() and event_id:
                                _thinking_event = status_tracker.refresh_if_stale()
                                if _thinking_event:
                                    yield _thinking_event
                                else:
                                    _ke = emit_event("INFO", "<TASK>Thinking</TASK>")
                                    if _ke:
                                        yield _ke
                                    status_tracker.touch()
                        response = _api_task.result()
                        response.raise_for_status()
                        response_data = response.json()
                        status_tracker.touch()
                        break  # success — no need for fallback
                    except (requests.exceptions.RequestException, asyncio.TimeoutError) as e:
                        logger.warning(f"API error with model={_model_attempt} at iteration {current_iteration}: {e}")
                        if _model_attempt == MODEL_FALLBACK:
                            logger.error(f"Fallback model also failed at iteration {current_iteration}")
                        continue
                    except Exception as e:
                        logger.error(f"Unexpected API error at iteration {current_iteration}: {e}")
                        break

                if not response_data:
                    break

                choice = response_data.get("choices", [{}])[0]
                assistant_message = choice.get("message") or choice.get("delta")
                if not assistant_message:
                    break

            assistant_message.pop("reasoning_content", None)
            if not assistant_message.get("content"):
                assistant_message["content"] = "I'll help you with that." if assistant_message.get("tool_calls") else "Processing..."

            messages.append(assistant_message)
            tool_calls = assistant_message.get("tool_calls")

            if not tool_calls:
                raw_content = assistant_message.get("content", "")

                # Recovery: detect leaked tool call tokens
                leaked_fn, leaked_args = extract_leaked_tool_call(raw_content)
                if leaked_fn:
                    import uuid as _uuid
                    tool_calls = [{"id": f"recovered-{_uuid.uuid4().hex[:8]}", "type": "function",
                                   "function": {"name": leaked_fn, "arguments": json.dumps(leaked_args)}}]
                    assistant_message["content"] = f"Calling {leaked_fn}..."
                    assistant_message["tool_calls"] = tool_calls

                if not tool_calls:
                    is_reasoning_leak = _looks_like_internal_reasoning(raw_content)
                    is_placeholder = raw_content.strip() in ("Processing your request...", "I'll help you with that.", "")
                    has_useful_context = bool(collected_sources) or tool_call_count > 0

                    # If PDF was already generated, don't force synthesis — just use the response or build one
                    if (is_reasoning_leak or is_placeholder) and memoized_results.get("generated_pdfs"):
                        _pdf_url = memoized_results["generated_pdfs"][-1]
                        final_message_content = raw_content if not (is_reasoning_leak or is_placeholder) else ""
                        break

                    if (is_reasoning_leak or is_placeholder) and has_useful_context and current_iteration < max_iterations:
                        if event_id:
                            yield format_sse("INFO", get_user_message("synthesizing"))
                            status_tracker.touch()
                        _has_images = image_context_provided or bool(collected_images_from_web) or bool(collected_similar_images)
                        _pdf_done = bool(memoized_results.get("generated_pdfs"))
                        messages.append({"role": "user", "content": synthesis_instruction(user_query, image_context=_has_images, is_detailed=is_detailed_mode, pdf_already_generated=_pdf_done)})
                        force_synthesis = True
                        continue

                    if (is_reasoning_leak or is_placeholder) and not has_useful_context and current_iteration == 1:
                        messages.append({"role": "user", "content": "Your previous response was empty. Re-read the query and either call the appropriate tool or answer directly."})
                        continue

                    final_message_content = raw_content
                    break

            # --- Process tool calls ---
            tool_outputs = []
            fetch_calls, web_search_calls, other_calls = [], [], []
            _deep_research_call = None

            for tc in tool_calls:
                fn_name = tc["function"]["name"]
                if fn_name == "deep_research":
                    _deep_research_call = tc
                elif fn_name == "fetch_full_text":
                    fetch_calls.append(tc)
                elif fn_name == "web_search":
                    web_search_calls.append(tc)
                    try:
                        _ws_args = json.loads(tc["function"]["arguments"])
                        _depth = _ws_args.get("search_depth")
                        if _depth and not is_detailed_mode:
                            _bounds = SEARCH_DEPTH_BOUNDS.get(_depth)
                            if _bounds:
                                active_min_links = _bounds["min"]
                                active_max_links = _bounds["max"]
                    except (json.JSONDecodeError, KeyError):
                        pass
                else:
                    other_calls.append(tc)

            # Deep research handoff
            if _deep_research_call:
                try:
                    _dr_args = json.loads(_deep_research_call["function"]["arguments"])
                    _dr_query = _dr_args.get("query", original_user_query)
                except Exception:
                    _dr_query = original_user_query
                async for event in _run_deep_search_pipeline(
                    user_query=_dr_query, user_image=user_image,
                    event_id=event_id, session_id=session_id, emit_event=emit_event,
                ):
                    yield event
                return

            if len(fetch_calls) > active_max_links:
                fetch_calls = fetch_calls[:active_max_links]

            async def execute_tool_async(idx, tool_call, is_web_search=False):
                fn_name = tool_call["function"]["name"]
                fn_args = json.loads(tool_call["function"]["arguments"])
                tool_result_gen = optimized_tool_execution(fn_name, fn_args, memoized_results, emit_event)
                tool_result, image_urls = None, []
                if hasattr(tool_result_gen, '__aiter__'):
                    async for result in tool_result_gen:
                        if isinstance(result, str) and result.startswith("event:"):
                            pass
                        elif isinstance(result, tuple):
                            tool_result, image_urls = result
                        else:
                            tool_result = result
                else:
                    tool_result = await tool_result_gen if asyncio.iscoroutine(tool_result_gen) else tool_result_gen
                return {"tool_call_id": tool_call["id"], "name": fn_name, "result": tool_result, "image_urls": image_urls}

            # --- Web search ---
            if web_search_calls:
                try:
                    search_label = f"Searching for: {json.loads(web_search_calls[0]['function']['arguments']).get('query', '')[:80]}"
                except Exception:
                    search_label = "Searching the web"
                emit_sse = emit_event("INFO", f"<TASK>{search_label}</TASK>")
                if emit_sse:
                    yield emit_sse
                status_tracker.touch()
                ws_results = await asyncio.gather(
                    *[execute_tool_async(idx, tc, True) for idx, tc in enumerate(web_search_calls)],
                    return_exceptions=True
                )
                for result in ws_results:
                    if not isinstance(result, Exception):
                        if result["name"] == "web_search" and "current_search_urls" in memoized_results:
                            _raw_urls = memoized_results["current_search_urls"][:active_sources_per_search]
                            collected_sources.extend(clean_source_list(_raw_urls))
                        tool_outputs.append({"role": "tool", "tool_call_id": result["tool_call_id"],
                                             "name": result["name"], "content": str(result["result"]) if result["result"] else "No result"})
                if event_id and collected_sources:
                    yield format_sse("INFO", f"<TASK>Found {len(collected_sources)} sources</TASK>")
                    status_tracker.touch()

            # --- Other tools ---
            _tool_labels = {"image_search": "Searching for images", "youtubeMetadata": "Looking up YouTube videos",
                            "transcribe_audio": "Transcribing audio", "get_local_time": "Getting local time", "create_image": "Generating image"}
            for idx, tc in enumerate(other_calls):
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"]["arguments"])
                _label = _tool_labels.get(fn_name)
                if _label and event_id:
                    yield format_sse("INFO", f"<TASK>{_label}</TASK>")
                    status_tracker.touch()

                tool_result_gen = optimized_tool_execution(fn_name, fn_args, memoized_results, emit_event)
                if hasattr(tool_result_gen, '__aiter__'):
                    tool_result, image_urls = None, []
                    async for result in tool_result_gen:
                        if isinstance(result, str) and result.startswith("event:"):
                            yield result
                        elif isinstance(result, tuple):
                            tool_result, image_urls = result
                        else:
                            tool_result = result
                    if fn_name == "image_search" and image_urls:
                        (collected_similar_images if image_only_mode else collected_images_from_web).extend(image_urls)
                        if event_id:
                            yield format_sse("INFO", f"<TASK>Found {len(image_urls)} images</TASK>")
                            status_tracker.touch()
                else:
                    tool_result = await tool_result_gen if asyncio.iscoroutine(tool_result_gen) else tool_result_gen

                if fn_name == "transcribe_audio":
                    collected_sources.append(fn_args.get("url"))
                tool_outputs.append({"role": "tool", "tool_call_id": tc["id"], "name": fn_name,
                                     "content": str(tool_result) if tool_result else "No result"})

            tool_call_count += len(tool_calls)

            # --- Fetch URLs ---
            if fetch_calls:
                _stale_event = status_tracker.refresh_if_stale()
                if _stale_event:
                    yield _stale_event
                if event_id:
                    yield format_sse("INFO", f"<TASK>Reading {len(fetch_calls)} source{'s' if len(fetch_calls) != 1 else ''}</TASK>")
                    status_tracker.touch()

                async def execute_fetch(idx, tc):
                    fn_args = json.loads(tc["function"]["arguments"])
                    url = fn_args.get('url', 'N/A')
                    tool_result = None
                    async for result in optimized_tool_execution(tc["function"]["name"], fn_args, memoized_results, emit_event):
                        if not isinstance(result, str) or not result.startswith("event:"):
                            tool_result = result
                    return {"tool_call_id": tc["id"], "url": url, "result": tool_result}

                try:
                    fetch_results = await asyncio.wait_for(
                        asyncio.gather(*[execute_fetch(idx, tc) for idx, tc in enumerate(fetch_calls)], return_exceptions=True),
                        timeout=8.0
                    )
                except (asyncio.TimeoutError, TimeoutError):
                    fetch_results = []

                ingest_tasks = []
                for fr in fetch_results:
                    if isinstance(fr, Exception):
                        continue
                    url = clean_url(fr["url"]) or fr["url"]
                    if len(collected_sources) < active_max_sources:
                        collected_sources.append(url)
                    if core_service:
                        async def ingest_url_async(u):
                            try:
                                from ipcService.coreServiceManager import get_core_embedding_service
                                svc = get_core_embedding_service()
                                await asyncio.wait_for(asyncio.to_thread(svc.ingest_url, u), timeout=3.0)
                            except Exception:
                                pass
                        ingest_tasks.append(ingest_url_async(url))
                    tool_outputs.append({"role": "tool", "tool_call_id": fr["tool_call_id"], "name": "fetch_full_text",
                                         "content": str(fr["result"])[:500] if fr["result"] else "No result"})

                # Fire-and-forget: ingest into vector store without blocking the response
                if ingest_tasks:
                    asyncio.gather(*ingest_tasks, return_exceptions=True)

                good, total = _evaluate_fetch_quality(tool_outputs)
                if total > 0 and event_id and good > 0:
                    _len = sum(len(o.get("content", "")) for o in tool_outputs
                               if o.get("name") == "fetch_full_text" and len(o.get("content", "")) >= FETCH_MIN_USEFUL_CHARS)
                    yield format_sse("INFO", f"<TASK>Extracted ~{max(1, _len // 80)} sentences from {good} source{'s' if good != 1 else ''}</TASK>")
                    status_tracker.touch()

            messages.extend(tool_outputs)

        # ==================== FORCED SYNTHESIS ====================
        if not final_message_content and current_iteration >= max_iterations:
            if event_id:
                yield format_sse("INFO", get_user_message("synthesizing"))
                status_tracker.touch()

            # RAG context already retrieved at pipeline start — skip redundant re-retrieval

            if is_detailed_mode:
                async for item in run_detailed_synthesis(
                    user_query, messages, headers, active_max_tokens,
                    rag_context, collected_sources, event_id, emit_event,
                ):
                    if isinstance(item, tuple) and item[0] == "__FINAL__":
                        final_message_content = item[1]
                    else:
                        yield item

                if final_message_content and conversation_cache is not None:
                    try:
                        _emb = core_service.embed_single_text(user_query) if core_service else None
                        conversation_cache.add_to_cache(
                            query=user_query, response=final_message_content,
                            metadata={"sources": collected_sources[:5], "tool_calls": tool_call_count,
                                      "iteration": current_iteration, "decomposed": True},
                            query_embedding=_emb,
                        )
                    except Exception:
                        pass
                    if session_context:
                        try:
                            session_context.add_message(role="assistant", content=final_message_content)
                            memoized_results["_assistant_response_saved"] = True
                        except Exception:
                            pass
                    memoized_results["final_response"] = final_message_content

                if event_id:
                    yield format_sse("INFO", "<TASK>DONE</TASK>")
                return

            # Standard synthesis — use streaming to keep connection alive
            _has_images = image_context_provided or bool(collected_images_from_web) or bool(collected_similar_images)
            _pdf_done = bool(memoized_results.get("generated_pdfs"))

            # Clean messages for synthesis (strip tool_calls/tool-role messages)
            _synth_msgs = []
            for m in messages:
                if m.get("role") == "tool":
                    _tool_content = m.get("content", "")
                    if _tool_content and _tool_content != "No result":
                        _synth_msgs.append({
                            "role": "user",
                            "content": f"[Search result from {m.get('name', 'tool')}]: {_tool_content}"
                        })
                    continue
                _mc = dict(m)
                if _mc.get("role") == "assistant":
                    _mc.pop("tool_calls", None)
                _synth_msgs.append(_mc)

            _synth_msgs.append({
                "role": "user",
                "content": synthesis_instruction(user_query, image_context=_has_images, is_detailed=is_detailed_mode, pdf_already_generated=_pdf_done)
            })

            _synth_payload = {
                "model": MODEL, "messages": _synth_msgs,
                "seed": random.randint(1000, 9999), "max_tokens": active_max_tokens,
            }

            if event_id:
                # Stream synthesis to keep connection alive and deliver content progressively
                _synth_streamed = ""
                _synth_ok = False
                for _synth_model in (MODEL, MODEL_FALLBACK):
                    try:
                        _sp = {**_synth_payload, "model": _synth_model}
                        _synth_streamed = ""
                        async for _stype, _sdata in _stream_llm_call(_sp, headers):
                            if _stype == "keepalive":
                                _ke = emit_event("INFO", "<TASK>Thinking</TASK>")
                                if _ke:
                                    yield _ke
                                status_tracker.touch()
                            elif _stype == "content":
                                _synth_streamed += _sdata
                                yield format_sse("RESPONSE", _sdata)
                                status_tracker.touch()
                            elif _stype == "done":
                                pass
                        if _synth_streamed.strip():
                            final_message_content = _scrub_tool_names(_synth_streamed.strip())
                            _streamed_content = final_message_content
                            _synth_ok = True
                            break
                        logger.warning(f"[FORCED SYNTHESIS] model={_synth_model} returned empty, trying fallback")
                    except Exception as e:
                        logger.warning(f"[FORCED SYNTHESIS] Streaming error with model={_synth_model}: {e}")
                        continue

                if not _synth_ok:
                    final_message_content = build_synthesis_fallback(messages, user_query, rag_context, collected_sources)
            else:
                final_message_content = await run_standard_synthesis(
                    messages, user_query, active_max_tokens, headers, is_detailed_mode,
                    image_context_provided, collected_images_from_web, collected_similar_images,
                )
                if not final_message_content:
                    final_message_content = build_synthesis_fallback(messages, user_query, rag_context, collected_sources)

        # ==================== FINAL RESPONSE FORMATTING ====================
        # If PDF was generated but LLM gave a placeholder/empty response, construct one
        if not final_message_content and memoized_results.get("generated_pdfs"):
            _pdf_url = memoized_results["generated_pdfs"][-1]
            final_message_content = f"Here's your PDF, ready to download:\n\n[Download PDF]({_pdf_url})"

        if final_message_content:
            # Check if content was already streamed to the user
            _already_streamed = bool(_streamed_content) and _streamed_content == final_message_content

            if not _already_streamed:
                final_message_content = await sanitize_final_response(final_message_content, user_query, collected_sources, headers)
            final_message_content = _scrub_tool_names(final_message_content)

            # If we got placeholder content with images, try one more synthesis
            if not _already_streamed and is_placeholder_or_fallback(final_message_content) and (collected_images_from_web or collected_similar_images):
                _pool = collected_similar_images if (image_only_mode and collected_similar_images) else collected_images_from_web
                better = await try_image_synthesis(messages, user_query, _pool, headers, event_id)
                if better:
                    final_message_content = better

            # Append PDF link if tool generated one during the loop
            if memoized_results.get("generated_pdfs"):
                _pdf_url = memoized_results["generated_pdfs"][-1]
                if _pdf_url not in final_message_content:
                    final_message_content += f"\n\n---\n\n[Download PDF]({_pdf_url})"

            # Assemble images and sources
            response_parts = assemble_images(final_message_content, collected_images_from_web,
                                              collected_similar_images, image_only_mode, memoized_results)
            response_with_sources = append_sources(response_parts, collected_sources)

            # Save to caches (skip for ephemeral sessions)
            if not is_ephemeral:
                await save_to_caches(user_query, final_message_content, collected_sources, tool_call_count,
                                      current_iteration, memoized_results, core_service, conversation_cache,
                                      session_context, session_id)

            memoized_results["final_response"] = response_with_sources

            if _already_streamed and event_id:
                # Content was already streamed — only send extras (sources, images, PDF)
                _extras = response_with_sources[len(final_message_content):]
                if _extras.strip():
                    yield format_sse("RESPONSE", _extras)
                yield format_sse("INFO", "<TASK>DONE</TASK>")
            elif event_id:
                yield format_sse("RESPONSE", response_with_sources)
                yield format_sse("INFO", "<TASK>DONE</TASK>")
            else:
                yield response_with_sources
            return
        else:
            logger.error(f"[ERROR] No final content after {max_iterations} iterations")
            if collected_sources or tool_call_count > 0:
                response = build_fallback_response(user_query, collected_sources, collected_images_from_web,
                                                    collected_similar_images, image_only_mode, memoized_results)
                memoized_results["final_response"] = response
                if event_id:
                    yield format_sse("INFO", get_user_message("finalizing"))
                    yield format_sse("RESPONSE", response)
                    yield format_sse("INFO", "<TASK>DONE</TASK>")
                else:
                    yield response
                return
            _error_msg = (
                "Hmm, I hit a snag — my brain (the LLM upstream) seems to be "
                "taking a nap right now. This usually resolves in a few seconds. "
                "Give it another shot and I should be back to my usual brilliant self."
            )
            if event_id:
                yield format_sse("RESPONSE", _error_msg)
                yield format_sse("INFO", "<TASK>DONE</TASK>")
            else:
                yield _error_msg
            return

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        _error_msg = (
            "Oops — something unexpected went wrong on my end. "
            "It's not you, it's me (probably a temporary hiccup). "
            "Try again in a moment?"
        )
        if event_id:
            yield format_sse("RESPONSE", _error_msg)
            yield format_sse("INFO", "<TASK>DONE</TASK>")
        else:
            yield _error_msg
    finally:
        # Skip all persistence for ephemeral sessions — nothing to save
        if not is_ephemeral:
            if session_id and "session_context" in memoized_results and memoized_results["session_context"]:
                try:
                    ctx = memoized_results["session_context"]
                    if memoized_results.get("final_response") and not memoized_results.get("_assistant_response_saved"):
                        ctx.add_message(role="assistant", content=memoized_results["final_response"])
                except Exception:
                    pass

            if session_id and semantic_cache is not None:
                semantic_cache.save_for_request(session_id)
                try:
                    if "conversation_cache" in memoized_results:
                        conversation_cache.save_to_disk(session_id=session_id)
                except Exception:
                    pass
