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
from pipeline.utils import format_sse
from pipeline.sse_messages import SSEStatusTracker
from pipeline.helpers import (
    _scrub_tool_names,
    get_user_message,
    _looks_like_internal_reasoning,
    _evaluate_fetch_quality,
    sanitize_final_response,
    _decompose_query,
    _decompose_query_with_llm,
    _synthesize_subtopic,
)
from pipeline.deep_search import _run_deep_search_pipeline
from functionCalls.getImagePrompt import describe_image, replyFromImage
import asyncio

load_dotenv()

POLLINATIONS_TOKEN = os.getenv("TOKEN")
MODEL = LLM_MODEL
logger.debug(f"Model configured: {MODEL}")


async def run_elixposearch_pipeline(user_query: str, user_image: str, event_id: str = None, session_id: str = None, user_images: list = None, chat_history: list = None):
    # Normalize: user_images is the canonical list (max 3), user_image is first for backward compat
    if user_images is None:
        user_images = [user_image] if user_image else []
    if not user_image and user_images:
        user_image = user_images[0]

    logger.info(
        f"[pipeline] session={session_id} Starting ElixpoSearch: "
        f"query='{user_query[:LOG_MESSAGE_QUERY_TRUNCATE]}...' images={len(user_images)}"
    )

    # Register session in SessionManager so /api/session/* routes can find it
    if session_id:
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

    # Send the first SSE immediately so the client knows we're alive
    initial_event = emit_event("INFO", get_user_message("processing"))
    if initial_event:
        yield initial_event

    # --- Standard pipeline (deep search is triggered via deep_research tool call) ---
    _detail_keywords = re.compile(
        r"\b(detail(?:ed|s)?|comprehensive|in[- ]?depth|thorough|extensive|elaborate|full|complete|everything about|deep dive|lengthy|long)\b",
        re.IGNORECASE,
    )
    is_detailed_mode = bool(_detail_keywords.search(original_user_query))
    active_min_links = MIN_LINKS_TO_TAKE_DETAILED if is_detailed_mode else MIN_LINKS_TO_TAKE
    active_max_links = MAX_LINKS_TO_TAKE_DETAILED if is_detailed_mode else MAX_LINKS_TO_TAKE
    active_max_tokens = LLM_MAX_TOKENS_DETAILED if is_detailed_mode else LLM_MAX_TOKENS
    active_max_sources = MAX_SOURCES_DETAILED if is_detailed_mode else MAX_SOURCES_STANDARD
    active_sources_per_search = SOURCES_PER_SEARCH
    if is_detailed_mode:
        logger.info(f"[Pipeline] Detailed mode ON: links={active_min_links}-{active_max_links}, max_tokens={active_max_tokens}, max_sources={active_max_sources}")
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
            logger.info("[Pipeline] Connected to shared CoreEmbeddingService singleton via IPC")
        except Exception:
            logger.warning("[Pipeline] Could not connect to IPC CoreEmbeddingService")
            core_service = None

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

        # --- Session context ---
        session_context = None
        if session_id:
            try:
                session_context = SessionContextWindow(session_id=session_id)
                memoized_results["session_context"] = session_context
                previous_messages = session_context.get_context()
                session_context.add_message(role="user", content=user_query)
                logger.info(
                    f"[Pipeline] Initialized SessionContextWindow for {session_id}: "
                    f"loaded {len(previous_messages)} hot messages, added current query"
                )
            except Exception:
                logger.warning("[Pipeline] Failed to initialize SessionContextWindow")
                session_context = None

        # --- Conversation cache ---
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
        logger.info(f"[Pipeline] Initialized Conversation Cache Manager (window_size={CACHE_WINDOW_SIZE}, max_entries={CACHE_MAX_ENTRIES}, embed={'ipc' if _embed_fn else 'local'})")

        if session_id:
            if conversation_cache.load_from_disk(session_id=session_id):
                logger.info(f"[Pipeline] Loaded conversation cache from disk (session: {session_id})")

        # --- Semantic cache ---
        semantic_cache = SemanticCache(
            session_id=session_id or "pipeline",
            ttl_seconds=SEMANTIC_CACHE_TTL_SECONDS,
            similarity_threshold=SEMANTIC_CACHE_SIMILARITY_THRESHOLD,
            redis_host=SEMANTIC_CACHE_REDIS_HOST,
            redis_port=SEMANTIC_CACHE_REDIS_PORT,
            redis_db=SEMANTIC_CACHE_REDIS_DB
        )
        if session_id:
            semantic_cache.load_for_request(session_id)
            logger.info(f"[Pipeline] Loaded persistent Redis cache for session {session_id}")

        # --- Image handling (supports up to 3 images) ---
        image_context_provided = False
        image_analysis_result = None
        _active_images = user_images if user_images else ([user_image] if user_image else [])
        _num_images = len(_active_images)

        if image_only_mode:
            logger.info(f"[Pipeline] Image-only mode: describing {_num_images} image(s) via vision model")
            try:
                image_event = emit_event("INFO", f"<TASK>Analyzing {_num_images} image{'s' if _num_images > 1 else ''}</TASK>")
                if image_event:
                    yield image_event
                # Process all images concurrently
                descriptions = await asyncio.gather(
                    *[describe_image(img) for img in _active_images],
                    return_exceptions=True,
                )
                parts = []
                for idx, desc in enumerate(descriptions):
                    if isinstance(desc, Exception):
                        logger.warning(f"[Pipeline] Failed to describe image {idx+1}: {desc}")
                        continue
                    if _num_images > 1:
                        parts.append(f"### Image {idx+1}\n\n{desc}")
                    else:
                        parts.append(desc)
                image_description = "\n\n".join(parts) if parts else ""
                if not image_description:
                    raise RuntimeError("All image descriptions failed")
                logger.info(f"[Pipeline] Image description generated: {len(image_description)} chars")
                done_event = emit_event("INFO", "<TASK>Image analysis complete</TASK>")
                if done_event:
                    yield done_event
                if event_id:
                    chunk_size = 80
                    for i in range(0, len(image_description), chunk_size):
                        yield format_sse("RESPONSE", image_description[i:i+chunk_size])
                    yield format_sse("INFO", "<TASK>DONE</TASK>")
                else:
                    yield image_description
                memoized_results["final_response"] = image_description
                if session_id and semantic_cache is not None:
                    semantic_cache.save_for_request(session_id)
                return
            except Exception:
                logger.warning("[Pipeline] Failed to describe image(s)")
                user_query = "describe this image"
        elif _active_images and user_query.strip():
            logger.info(f"[Pipeline] Image + Query mode: analyzing {_num_images} image(s) in context of query")
            try:
                image_event = emit_event("INFO", f"<TASK>Analyzing {_num_images} image{'s' if _num_images > 1 else ''}</TASK>")
                if image_event:
                    yield image_event
                # Process all images concurrently
                analyses = await asyncio.gather(
                    *[replyFromImage(img, user_query) for img in _active_images],
                    return_exceptions=True,
                )
                parts = []
                for idx, analysis in enumerate(analyses):
                    if isinstance(analysis, Exception):
                        logger.warning(f"[Pipeline] Failed to analyze image {idx+1}: {analysis}")
                        continue
                    if _num_images > 1:
                        parts.append(f"[Image {idx+1} Analysis]\n{analysis}")
                    else:
                        parts.append(analysis)
                image_analysis_result = "\n\n".join(parts) if parts else None
                if image_analysis_result:
                    image_context_provided = True
                    logger.info(f"[Pipeline] Image analysis done: {len(image_analysis_result)} chars")
                done_event = emit_event("INFO", f"<TASK>Image{'s' if _num_images > 1 else ''} analyzed in context of your question</TASK>")
                if done_event:
                    yield done_event
            except Exception:
                logger.warning("[Pipeline] Failed to analyze image(s)")
                image_context_provided = False

        # --- Tool loop setup ---
        max_iterations = 3
        current_iteration = 0
        collected_sources = []
        collected_images_from_web = []
        collected_similar_images = []
        final_message_content = None
        tool_call_count = 0

        query_components = _decompose_query(user_query)
        if len(query_components) > 1:
            logger.info(f"[DECOMPOSITION] Query decomposed into {len(query_components)} components for parallel processing")
            memoized_results["query_components"] = query_components
        else:
            logger.info("[DECOMPOSITION] Query is single component, no decomposition needed")
            memoized_results["query_components"] = [user_query]

        # --- RAG retrieval ---
        rag_context = ""
        if core_service:
            try:
                active_top_k = RETRIEVAL_TOP_K * 2 if is_detailed_mode else RETRIEVAL_TOP_K
                retrieval_result = await asyncio.wait_for(
                    asyncio.to_thread(core_service.retrieve, user_query, active_top_k),
                    timeout=3.0
                )
                if retrieval_result.get("count", 0) > 0:
                    rag_context = "\n".join([r["metadata"]["text"] for r in retrieval_result.get("results", [])])
                    _rag_count = retrieval_result.get("count", 0)
                    logger.info(f"[Pipeline] Retrieved {_rag_count} chunks from vector store")
                    rag_event = emit_event("INFO", f"<TASK>Recalling {_rag_count} related snippet{'s' if _rag_count != 1 else ''} from memory</TASK>")
                    if rag_event:
                        yield rag_event
            except asyncio.TimeoutError:
                logger.warning("[Pipeline] Vector store retrieval timed out (3s), continuing without context")
            except Exception:
                logger.warning("[Pipeline] Vector store retrieval failed, continuing without context")
        else:
            logger.info("[Pipeline] Skipping vector store retrieval (model_server unavailable)")

        logger.info(f"[Pipeline] RAG context prepared: {len(rag_context)} chars")

        # --- Build initial messages ---
        user_msg_content = user_instruction(user_query, user_image if not image_analysis_result else None, is_detailed=is_detailed_mode)
        if image_analysis_result:
            user_msg_content += f"\n\n[Image Analysis]\n{image_analysis_result}"

        messages = [
            {
                "role": "system",
                "name": "elixposearch-agent-system",
                "content": system_instruction(rag_context, current_utc_time, is_detailed=is_detailed_mode)
            },
        ]

        # Inject conversation history — from external chat_history (OpenAI messages)
        # or from session context (Redis/disk), with adaptive token budget
        _injected_history = 0
        _history_token_budget = HISTORY_TOKEN_BUDGET_DETAILED if is_detailed_mode else HISTORY_TOKEN_BUDGET
        _history_tokens_used = 0

        if chat_history:
            # External history from OpenAI-format messages array (excludes system + current user msg)
            for msg in chat_history:
                _role = msg.get("role", "user")
                _content = msg.get("content", "")
                if _role in ("user", "assistant") and _content:
                    _msg_tokens = len(_content) // 4  # fast estimate
                    if _history_tokens_used + _msg_tokens > _history_token_budget:
                        break
                    messages.append({"role": _role, "content": _content})
                    _history_tokens_used += _msg_tokens
                    _injected_history += 1
            if _injected_history:
                logger.info(f"[Pipeline] Injected {_injected_history} messages from external chat_history (~{_history_tokens_used} tokens)")
        elif session_id and session_context:
            try:
                _prev = session_context.get_context()
                # Drop the last item if it's the current query we just added
                if _prev and _prev[-1].get("role") == "user" and _prev[-1].get("content") == user_query:
                    _prev = _prev[:-1]
                # Dynamic sizing: keep adding messages until token budget is exhausted
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
                    if _role in ("user", "assistant") and _content:
                        messages.append({"role": _role, "content": _content})
                        _injected_history += 1
                if _injected_history:
                    logger.info(f"[Pipeline] Injected {_injected_history} session history messages (~{_history_tokens_used} tokens)")
            except Exception as e:
                logger.warning(f"[Pipeline] Failed to inject conversation history: {e}")

        messages.append({
            "role": "user",
            "content": user_msg_content
        })
        force_synthesis = False

        # Detect conversation-about-itself queries: summaries, recaps, "what did we discuss"
        _query_lower = user_query.lower()
        _is_meta_query = _injected_history >= 2 and any(kw in _query_lower for kw in [
            "summarize", "summary", "recap", "what did we", "what have we",
            "conversation so far", "previous conversation", "our conversation",
            "what we discussed", "what we talked", "chat history",
        ])
        if _is_meta_query:
            logger.info(f"[Pipeline] Meta-query detected with {_injected_history} history messages — skipping tools, answering from context")
            force_synthesis = True  # This prevents tools from being offered

        while current_iteration < max_iterations:
            current_iteration += 1
            for m in messages:
                if m.get("role") == "assistant":
                    if not m.get("content"):
                        if m.get("tool_calls"):
                            m["content"] = f"Executing {len(m['tool_calls'])} tool(s)..."
                        else:
                            m["content"] = "Processing your request..."

            if len(messages) > 20:
                # Keep system prompt (1st), last 8 conversation history msgs, and last 6 tool interaction msgs
                _system = [messages[0]]
                # Find where tool interactions start (after the last user query)
                _tool_msgs = messages[-6:]
                _history_msgs = messages[1:-6]
                if len(_history_msgs) > 8:
                    _history_msgs = _history_msgs[-8:]
                trimmed = _system + _history_msgs + _tool_msgs
                logger.info(f"[OPTIMIZATION] Trimmed messages from {len(messages)} to {len(trimmed)}")
                messages = trimmed

            payload = {
                "model": MODEL,
                "messages": messages,
                "seed": random.randint(1000, 9999),
                "max_tokens": active_max_tokens,
            }
            if not force_synthesis:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"

            _stale_event = status_tracker.refresh_if_stale()
            if _stale_event:
                yield _stale_event

            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        requests.post,
                        POLLINATIONS_ENDPOINT,
                        json=payload,
                        headers=headers,
                        timeout=55
                    ),
                    timeout=60.0
                )
                response.raise_for_status()
                response_data = response.json()
                status_tracker.touch()
            except asyncio.TimeoutError:
                logger.error(f"API timeout at iteration {current_iteration}")
                break
            except requests.exceptions.HTTPError as http_err:
                logger.error(f"Pollinations API HTTP error at iteration {current_iteration}: {http_err}")
                logger.error(f"Response content: {http_err.response.text}")
                break
            except requests.exceptions.RequestException as e:
                logger.error(f"Pollinations API request failed at iteration {current_iteration}: {e}")
                break
            except Exception as e:
                logger.error(f"Unexpected API error at iteration {current_iteration}: {e}", exc_info=True)
                break

            choice = response_data.get("choices", [{}])[0]
            assistant_message = choice.get("message") or choice.get("delta")
            if not assistant_message:
                logger.error(f"Unexpected API response structure: {response_data}")
                break

            # Strip reasoning_content — it's internal model thinking, never user-facing
            assistant_message.pop("reasoning_content", None)

            if not assistant_message.get("content"):
                if assistant_message.get("tool_calls"):
                    assistant_message["content"] = "I'll help you with that. Let me gather the information you need."
                else:
                    assistant_message["content"] = "Processing your request..."

            if assistant_message.get("content") is None:
                assistant_message["content"] = ""

            messages.append(assistant_message)
            tool_calls = assistant_message.get("tool_calls")
            logger.info(f"Tool calls suggested by model: {len(tool_calls) if tool_calls else 0} tools")

            if not tool_calls:
                raw_content = assistant_message.get("content", "")
                is_reasoning_leak = _looks_like_internal_reasoning(raw_content)
                is_placeholder = raw_content.strip() in (
                    "Processing your request...",
                    "I'll help you with that. Let me gather the information you need.",
                    "",
                )
                has_useful_context = bool(collected_sources) or tool_call_count > 0

                if (is_reasoning_leak or is_placeholder) and has_useful_context and current_iteration < max_iterations:
                    logger.warning(
                        f"[COMPLETION] Iteration {current_iteration}: LLM returned reasoning/placeholder text "
                        f"(leak={is_reasoning_leak}, placeholder={is_placeholder}). Forcing synthesis instead of using raw content."
                    )
                    if event_id:
                        yield format_sse("INFO", get_user_message("synthesizing"))
                        status_tracker.touch()
                    _has_images = image_context_provided or bool(collected_images_from_web) or bool(collected_similar_images)
                    messages.append({
                        "role": "user",
                        "content": synthesis_instruction(user_query, image_context=_has_images, is_detailed=is_detailed_mode)
                    })
                    force_synthesis = True
                    continue

                final_message_content = raw_content
                logger.info(f"[COMPLETION] No tool calls found, setting final message: {final_message_content[:LOG_MESSAGE_PREVIEW_TRUNCATE] if final_message_content else 'EMPTY'}")
                break

            # --- Process tool calls ---
            tool_outputs = []
            logger.info(f"Processing {len(tool_calls)} tool call(s):")

            fetch_calls = []
            web_search_calls = []
            other_calls = []
            _deep_research_call = None
            for tool_call in tool_calls:
                fn_name = tool_call["function"]["name"]
                if fn_name == "deep_research":
                    _deep_research_call = tool_call
                elif fn_name == "fetch_full_text":
                    fetch_calls.append(tool_call)
                elif fn_name == "web_search":
                    web_search_calls.append(tool_call)
                    try:
                        _ws_args = json.loads(tool_call["function"]["arguments"])
                        _depth = _ws_args.get("search_depth")
                        if _depth and not is_detailed_mode:
                            _bounds = SEARCH_DEPTH_BOUNDS.get(_depth)
                            if _bounds:
                                active_min_links = _bounds["min"]
                                active_max_links = _bounds["max"]
                                logger.info(f"[URL-LIMITS] search_depth='{_depth}' -> links={active_min_links}-{active_max_links}")
                    except (json.JSONDecodeError, KeyError):
                        pass
                else:
                    other_calls.append(tool_call)

            # --- deep_research tool: hand off to deep search pipeline ---
            if _deep_research_call:
                try:
                    _dr_args = json.loads(_deep_research_call["function"]["arguments"])
                    _dr_query = _dr_args.get("query", original_user_query)
                except Exception:
                    _dr_query = original_user_query
                logger.info(f"[Pipeline] Model triggered deep_research for: '{_dr_query[:80]}'")
                async for event in _run_deep_search_pipeline(
                    user_query=_dr_query,
                    user_image=user_image,
                    event_id=event_id,
                    session_id=session_id,
                    emit_event=emit_event,
                ):
                    yield event
                return

            if web_search_calls and len(fetch_calls) < active_min_links:
                logger.info(f"[URL-LIMITS] Web search detected but only {len(fetch_calls)} URLs to fetch. Need {active_min_links - len(fetch_calls)} more to meet minimum of {active_min_links}")

            if len(fetch_calls) > active_max_links:
                logger.info(f"[URL-LIMITS] Capping fetch_calls from {len(fetch_calls)} to {active_max_links}")
                fetch_calls = fetch_calls[:active_max_links]

            logger.info(f"[URL-LIMITS] Final URL fetch plan: {len(fetch_calls)} URLs (min={active_min_links}, max={active_max_links})")

            async def execute_tool_async(idx, tool_call, is_web_search=False):
                function_name = tool_call["function"]["name"]
                function_args = json.loads(tool_call["function"]["arguments"])
                logger.info(f"[Async Tool #{idx+1}] {function_name}")
                tool_result_gen = optimized_tool_execution(function_name, function_args, memoized_results, emit_event)
                tool_result = None
                image_urls = []
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
                return {
                    "tool_call_id": tool_call["id"],
                    "name": function_name,
                    "result": tool_result,
                    "image_urls": image_urls
                }

            # --- Web search ---
            if web_search_calls:
                try:
                    first_query = json.loads(web_search_calls[0]["function"]["arguments"]).get("query", "")
                    search_label = f"Searching for: {first_query[:80]}"
                except Exception:
                    search_label = "Searching the web"
                emit_sse = emit_event("INFO", f"<TASK>{search_label}</TASK>")
                if emit_sse:
                    yield emit_sse
                status_tracker.touch()
                web_search_results = await asyncio.gather(
                    *[execute_tool_async(idx, tc, True) for idx, tc in enumerate(web_search_calls)],
                    return_exceptions=True
                )
                for result in web_search_results:
                    if not isinstance(result, Exception):
                        if result["name"] == "web_search" and "current_search_urls" in memoized_results:
                            collected_sources.extend(memoized_results["current_search_urls"][:active_sources_per_search])
                        tool_outputs.append({
                            "role": "tool",
                            "tool_call_id": result["tool_call_id"],
                            "name": result["name"],
                            "content": str(result["result"]) if result["result"] else "No result"
                        })
                successful_searches = sum(1 for r in web_search_results if not isinstance(r, Exception))
                logger.info(f"[Pipeline] Web search complete: {successful_searches} successful, {len(collected_sources)} sources")
                if event_id and collected_sources:
                    yield format_sse("INFO", f"<TASK>Found {len(collected_sources)} sources</TASK>")
                    status_tracker.touch()

            # --- Other tools ---
            for idx, tool_call in enumerate(other_calls):
                function_name = tool_call["function"]["name"]
                function_args = json.loads(tool_call["function"]["arguments"])
                logger.info(f"[Sequential Tool #{idx+1}] {function_name}")

                # Emit tool-specific status
                _tool_labels = {
                    "image_search": "Searching for images",
                    "youtubeMetadata": "Looking up YouTube videos",
                    "transcribe_audio": "Transcribing audio",
                    "get_local_time": "Getting local time",
                    "create_image": "Generating image",
                }
                _tool_label = _tool_labels.get(function_name)
                if _tool_label and event_id:
                    yield format_sse("INFO", f"<TASK>{_tool_label}</TASK>")
                    status_tracker.touch()

                tool_result_gen = optimized_tool_execution(function_name, function_args, memoized_results, emit_event)
                if hasattr(tool_result_gen, '__aiter__'):
                    tool_result = None
                    image_urls = []
                    async for result in tool_result_gen:
                        if isinstance(result, str) and result.startswith("event:"):
                            yield result
                        elif isinstance(result, tuple):
                            tool_result, image_urls = result
                        else:
                            tool_result = result
                    if function_name == "image_search" and image_urls:
                        if image_only_mode:
                            collected_similar_images.extend(image_urls)
                        else:
                            collected_images_from_web.extend(image_urls)
                        if event_id:
                            yield format_sse("INFO", f"<TASK>Found {len(image_urls)} images</TASK>")
                            status_tracker.touch()
                else:
                    tool_result = await tool_result_gen if asyncio.iscoroutine(tool_result_gen) else tool_result_gen

                if function_name in ["transcribe_audio"]:
                    collected_sources.append(function_args.get("url"))

                tool_outputs.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "name": function_name,
                    "content": str(tool_result) if tool_result else "No result"
                })

            tool_call_count += len(tool_calls)

            # --- Fetch URLs ---
            if fetch_calls:
                _stale_event = status_tracker.refresh_if_stale()
                if _stale_event:
                    yield _stale_event
                logger.info(f"[Pipeline] Fetching {len(fetch_calls)} sources in parallel")
                if event_id:
                    yield format_sse("INFO", f"<TASK>Reading {len(fetch_calls)} source{'s' if len(fetch_calls) != 1 else ''} for information</TASK>")
                    status_tracker.touch()

                async def execute_fetch(idx, tool_call):
                    function_name = tool_call["function"]["name"]
                    function_args = json.loads(tool_call["function"]["arguments"])
                    url = function_args.get('url', 'N/A')
                    logger.info(f"[PARALLEL FETCH #{idx+1}] {url[:60]}")
                    tool_result_gen = optimized_tool_execution(function_name, function_args, memoized_results, emit_event)
                    tool_result = None
                    async for result in tool_result_gen:
                        if not isinstance(result, str) or not result.startswith("event:"):
                            tool_result = result
                    return {
                        "tool_call_id": tool_call["id"],
                        "function_name": function_name,
                        "url": url,
                        "result": tool_result
                    }

                try:
                    fetch_results = await asyncio.wait_for(
                        asyncio.gather(
                            *[execute_fetch(idx, tc) for idx, tc in enumerate(fetch_calls)],
                            return_exceptions=True
                        ),
                        timeout=8.0
                    )
                except (asyncio.TimeoutError, TimeoutError):
                    logger.warning("[PARALLEL FETCH] Timeout after 8s – continuing with results collected so far")
                    fetch_results = []

                ingest_tasks = []
                for fetch_result in fetch_results:
                    if isinstance(fetch_result, Exception):
                        logger.error(f"Fetch failed: {fetch_result}")
                        continue

                    url = fetch_result["url"]

                    if len(collected_sources) < active_max_sources:
                        collected_sources.append(url)

                    if core_service:
                        async def ingest_url_async(url_to_ingest):
                            try:
                                from ipcService.coreServiceManager import get_core_embedding_service
                                core_svc = get_core_embedding_service()
                                ingest_result = await asyncio.wait_for(
                                    asyncio.to_thread(core_svc.ingest_url, url_to_ingest),
                                    timeout=3.0
                                )
                                chunks = ingest_result.get('chunks_ingested', 0)
                                logger.info(f"[INGEST] {chunks} chunks from {url_to_ingest[:40]}")
                            except asyncio.TimeoutError:
                                logger.warning(f"[INGEST TIMEOUT] {url_to_ingest[:40]}")
                            except Exception as e:
                                logger.warning(f"[INGEST FAILED] {url_to_ingest[:40]}: {e}")
                        ingest_tasks.append(ingest_url_async(url))

                    tool_outputs.append({
                        "role": "tool",
                        "tool_call_id": fetch_result["tool_call_id"],
                        "name": "fetch_full_text",
                        "content": str(fetch_result["result"])[:500] if fetch_result["result"] else "No result"
                    })

                if ingest_tasks:
                    try:
                        ingest_results = await asyncio.wait_for(
                            asyncio.gather(*ingest_tasks, return_exceptions=True),
                            timeout=5.0
                        )
                        _ingested_count = sum(1 for r in ingest_results if not isinstance(r, Exception))
                        if event_id and _ingested_count > 0:
                            yield format_sse("INFO", f"<TASK>Memorizing {_ingested_count} source{'s' if _ingested_count != 1 else ''} for context</TASK>")
                            status_tracker.touch()
                    except asyncio.TimeoutError:
                        logger.warning("[INGESTION] Timeout reached, continuing anyway")

                good_fetches, total_fetches = _evaluate_fetch_quality(tool_outputs)
                if total_fetches > 0:
                    logger.info(f"[FETCH QUALITY] {good_fetches}/{total_fetches} fetches returned usable content")
                    if event_id and good_fetches > 0:
                        # Count sentences extracted from fetched content
                        _fetched_content_len = sum(
                            len(o.get("content", ""))
                            for o in tool_outputs if o.get("name") == "fetch_full_text" and len(o.get("content", "")) >= FETCH_MIN_USEFUL_CHARS
                        )
                        _approx_sentences = max(1, _fetched_content_len // 80)
                        yield format_sse("INFO", f"<TASK>Extracted ~{_approx_sentences} sentences from {good_fetches} source{'s' if good_fetches != 1 else ''}</TASK>")
                        status_tracker.touch()

            messages.extend(tool_outputs)
            logger.info(f"Completed iteration {current_iteration}. Messages: {len(messages)}, Total tools: {tool_call_count}")

        # ==============================
        # FORCED SYNTHESIS (max iterations reached)
        # ==============================
        if not final_message_content and current_iteration >= max_iterations:
            logger.info(f"[SYNTHESIS CONDITION MET] final_message_content={bool(final_message_content)}, current_iteration={current_iteration}, max_iterations={max_iterations}")
            if event_id:
                yield format_sse("INFO", get_user_message("synthesizing"))
                status_tracker.touch()

            # Re-retrieve context from vector store after ingestion
            logger.info("[SYNTHESIS] Re-retrieving context from vector store after ingestion...")
            try:
                from searching.main import retrieve_from_vector_store
                updated_rag_context = await asyncio.wait_for(
                    asyncio.to_thread(retrieve_from_vector_store, user_query, top_k=RETRIEVAL_TOP_K),
                    timeout=5.0
                )
                if updated_rag_context:
                    _results = updated_rag_context.get("results", []) if isinstance(updated_rag_context, dict) else updated_rag_context
                    rag_context_str = "\n".join([
                        f"- {r.get('metadata', {}).get('text', '')[:200]}"
                        for r in _results if isinstance(r, dict) and r.get('metadata', {}).get('text')
                    ])
                    logger.info(f"[SYNTHESIS] Retrieved {len(_results)} chunks after ingestion ({len(rag_context_str)} chars)")
                    if rag_context_str:
                        rag_context = rag_context_str
                else:
                    logger.warning("[SYNTHESIS] No additional context retrieved from vector store")
            except (asyncio.TimeoutError, Exception) as e:
                logger.warning(f"[SYNTHESIS] Failed to re-retrieve context: {e}")

            query_components = memoized_results.get("query_components", [user_query])
            if len(query_components) > 1:
                logger.info("[SYNTHESIS] Multi-component query synthesis:")
                logger.info(f"[SYNTHESIS] Synthesizing {len(collected_sources)} total sources across {len(query_components)} components")

            # --- Detailed mode: decompose and synthesize per subtopic ---
            if is_detailed_mode:
                if event_id:
                    yield format_sse("INFO", "<TASK>Decomposing topic</TASK>")

                subtopics = await _decompose_query_with_llm(user_query, headers, max_parts=TOPIC_DECOMPOSITION_MAX_PARTS)
                logger.info(f"[SYNTHESIS] Decomposed into {len(subtopics)} sub-topics: {subtopics}")

                original_msg_count = len(messages)
                if len(messages) > 14:
                    _sys = [messages[0]]
                    _tool_tail = messages[-6:]
                    _mid = messages[1:-6]
                    if len(_mid) > 6:
                        _mid = _mid[-6:]
                    messages = _sys + _mid + _tool_tail
                    logger.info(f"[SYNTHESIS] Trimmed messages from {original_msg_count} to {len(messages)}")

                all_subtopic_responses = []
                per_part_tokens = max(800, active_max_tokens // len(subtopics))

                for idx, subtopic in enumerate(subtopics, 1):
                    if event_id:
                        yield format_sse("INFO", f"<TASK>Researching part {idx} of {len(subtopics)}</TASK>")

                    try:
                        subtopic_response = await _synthesize_subtopic(
                            subtopic=subtopic,
                            original_query=user_query,
                            messages_context=messages,
                            headers=headers,
                            max_tokens=per_part_tokens,
                            rag_context=rag_context,
                        )

                        if subtopic_response:
                            subtopic_response = await sanitize_final_response(subtopic_response, subtopic, collected_sources, headers)
                            subtopic_response = _scrub_tool_names(subtopic_response)
                            all_subtopic_responses.append(subtopic_response)

                            if idx == len(subtopics) and collected_sources:
                                source_block = "\n\n---\n**Sources:**\n"
                                unique_sources = sorted(list(set(collected_sources)))[:5]
                                for si, src in enumerate(unique_sources):
                                    source_block += f"{si+1}. [{src}]({src})\n"
                                subtopic_response += source_block

                            if event_id:
                                yield format_sse("RESPONSE", subtopic_response)
                            else:
                                yield subtopic_response

                    except Exception as e:
                        logger.error(f"[SYNTHESIS] Sub-topic {idx} failed: {e}")

                final_message_content = "\n\n".join(all_subtopic_responses) if all_subtopic_responses else None
                if final_message_content:
                    try:
                        _cache_embedding = None
                        if core_service:
                            try:
                                _cache_embedding = core_service.embed_single_text(user_query)
                            except Exception:
                                pass
                        conversation_cache.add_to_cache(
                            query=user_query,
                            response=final_message_content,
                            metadata={
                                "sources": collected_sources[:5],
                                "tool_calls": tool_call_count,
                                "iteration": current_iteration,
                                "had_cache_hit": memoized_results.get("cache_hit", False),
                                "decomposed": True,
                            },
                            query_embedding=_cache_embedding,
                        )
                    except Exception as e:
                        logger.warning(f"[Pipeline] Failed to save decomposed response to cache: {e}")

                    if session_context:
                        try:
                            session_context.add_message(role="assistant", content=final_message_content)
                            memoized_results["_assistant_response_saved"] = True
                        except Exception as e:
                            logger.warning(f"[Pipeline] Failed to store decomposed reply in hybrid cache: {e}")

                    memoized_results["final_response"] = final_message_content

                if event_id:
                    yield format_sse("INFO", "<TASK>DONE</TASK>")
                return

            # --- Standard synthesis ---
            logger.info("[SYNTHESIS] Starting synthesis of gathered information")
            _has_images = image_context_provided or bool(collected_images_from_web) or bool(collected_similar_images)
            synthesis_prompt = {
                "role": "user",
                "content": synthesis_instruction(user_query, image_context=_has_images, is_detailed=is_detailed_mode)
            }

            original_msg_count = len(messages)
            if len(messages) > 14:
                # Keep system prompt, some conversation history, and the last 6 tool interaction messages
                _sys = [messages[0]]
                _tool_tail = messages[-6:]
                _mid = messages[1:-6]
                if len(_mid) > 6:
                    _mid = _mid[-6:]
                messages = _sys + _mid + _tool_tail
                logger.info(f"[SYNTHESIS] Trimmed messages from {original_msg_count} to {len(messages)}")
            else:
                logger.info(f"[SYNTHESIS] Messages count: {len(messages)} (no trim needed)")

            # Strip tool_calls from assistant messages so the model doesn't try to continue tool usage
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

            _stale_event = status_tracker.refresh_if_stale()
            if _stale_event:
                yield _stale_event

            # Try synthesis up to 2 times (retry once on network failure)
            _synthesis_attempts = 2
            for _attempt in range(1, _synthesis_attempts + 1):
                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            requests.post,
                            POLLINATIONS_ENDPOINT,
                            json=payload,
                            headers=headers,
                            timeout=45
                        ),
                        timeout=50.0
                    )
                    response.raise_for_status()
                    response_data = response.json()
                    logger.info(f"[SYNTHESIS] Raw API response status: {response.status_code}, response keys: {response_data.keys() if isinstance(response_data, dict) else 'unknown'}")
                    logger.debug(f"[SYNTHESIS] Full response data: {json.dumps(response_data, indent=2)[:500]}")
                    try:
                        message = response_data["choices"][0]["message"]
                        logger.debug(f"[SYNTHESIS] Message keys: {message.keys()}")
                        logger.debug(f"[SYNTHESIS] Content value: {repr(message.get('content'))}")
                        logger.debug(f"[SYNTHESIS] Tool calls: {message.get('tool_calls')}")

                        final_message_content = message.get("content", "").strip()

                        if not final_message_content and "reasoning_content" in message:
                            logger.warning("[SYNTHESIS] Model returned reasoning_content but empty content — ignoring internal reasoning")

                        # If model returned tool_calls during synthesis, the content (if any) is an
                        # intermediate "I'll search more..." message, not a real synthesis. Discard it.
                        if message.get("tool_calls"):
                            logger.warning(f"[SYNTHESIS] Model returned tool_calls during synthesis — discarding intermediate content: {final_message_content[:100] if final_message_content else 'EMPTY'}")
                            final_message_content = ""

                        if not final_message_content:
                            logger.error(f"[SYNTHESIS] API returned empty content after all fallbacks. Full response: {response_data}")
                        else:
                            logger.info(f"[SYNTHESIS] Successfully extracted content. Length: {len(final_message_content)}")
                    except (KeyError, IndexError, TypeError) as e:
                        logger.error(f"[SYNTHESIS] Failed to extract content from response: {e}")
                        logger.error(f"[SYNTHESIS] Full response: {response_data}")
                    # If we got here (no exception from request), break out of retry loop
                    break
                except asyncio.TimeoutError:
                    logger.error(f"[SYNTHESIS TIMEOUT] Request timed out (attempt {_attempt}/{_synthesis_attempts})")
                except requests.exceptions.HTTPError as http_err:
                    logger.error(f"[SYNTHESIS HTTP ERROR] attempt {_attempt}: {http_err.response.status_code} - {str(http_err)[:ERROR_MESSAGE_TRUNCATE]}")
                except requests.exceptions.RequestException as req_err:
                    logger.error(f"[SYNTHESIS REQUEST ERROR] attempt {_attempt}: {type(req_err).__name__}: {str(req_err)[:ERROR_MESSAGE_TRUNCATE]}")
                except Exception as e:
                    logger.error(f"[SYNTHESIS ERROR] attempt {_attempt}: {type(e).__name__}: {str(e)[:ERROR_MESSAGE_TRUNCATE]}", exc_info=True)

                # If first attempt failed, wait briefly before retry
                if _attempt < _synthesis_attempts:
                    logger.info("[SYNTHESIS] Retrying synthesis after brief delay...")
                    await asyncio.sleep(1.5)

            # Build meaningful fallback from tool outputs if synthesis produced nothing
            if not final_message_content:
                logger.warning("[SYNTHESIS] All attempts failed — building fallback from gathered tool context")
                _tool_snippets = []
                for m in messages:
                    if m.get("role") == "tool" and m.get("name") == "fetch_full_text":
                        _content = m.get("content", "")
                        if _content and not _content.startswith("[") and len(_content) >= FETCH_MIN_USEFUL_CHARS:
                            _tool_snippets.append(_content[:300])
                    elif m.get("role") == "tool" and m.get("name") == "web_search":
                        pass  # URLs are already in collected_sources

                if _tool_snippets:
                    # We have actual content from fetched pages — stitch a minimal answer
                    final_message_content = f"Here's what I found about **{user_query}**:\n\n"
                    for snippet in _tool_snippets[:3]:
                        final_message_content += f"> {snippet.strip()}\n\n"
                elif rag_context:
                    final_message_content = f"Based on available context for **{user_query}**:\n\n"
                    for chunk in rag_context.split("\n")[:5]:
                        if chunk.strip():
                            final_message_content += f"> {chunk.strip()[:250]}\n\n"
                else:
                    final_message_content = f"I searched for information about **{user_query}** but couldn't generate a complete answer."
                    if collected_sources:
                        final_message_content += " Here are the sources I found that may help:"

        # ==============================
        # FINAL RESPONSE FORMATTING
        # ==============================
        if final_message_content:
            final_message_content = await sanitize_final_response(final_message_content, user_query, collected_sources, headers)
            final_message_content = _scrub_tool_names(final_message_content)
            logger.info("Preparing optimized final response")
            logger.info(f"[FINAL] final_message_content starts with: {final_message_content[:LOG_MESSAGE_PREVIEW_TRUNCATE] if final_message_content else 'None'}")

            _is_placeholder_or_fallback = (
                final_message_content in [
                    "Processing your request...",
                    "I'll help you with that. Let me gather the information you need.",
                ]
                or final_message_content.startswith("I found relevant information about")
                or final_message_content.startswith("I gathered")
                or final_message_content.startswith("I searched for information about")
                or final_message_content.startswith("I processed your query about")
            )
            if (collected_images_from_web or collected_similar_images) and _is_placeholder_or_fallback:
                logger.info("[FINAL] Detected placeholder/fallback content with collected images. Triggering synthesis...")
                _image_pool = collected_similar_images if (image_only_mode and collected_similar_images) else collected_images_from_web
                _image_list = "\n".join(f"![Image]({url})" for url in _image_pool[:10] if url and url.startswith("http"))
                synthesis_prompt = {
                    "role": "user",
                    "content": (
                        f"Based on the search results, provide a final comprehensive answer to: {user_query}\n\n"
                        f"Include these images in your response using markdown:\n{_image_list}"
                    )
                }
                messages.append(synthesis_prompt)

                payload = {
                    "model": MODEL,
                    "messages": messages,
                    "seed": random.randint(1000, 9999),
                    "max_tokens": 2500,
                    "stream": False,
                }

                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            requests.post,
                            POLLINATIONS_ENDPOINT,
                            json=payload,
                            headers=headers,
                            timeout=55
                        ),
                        timeout=60.0
                    )
                    response.raise_for_status()
                    response_data = response.json()
                    synthesis_response = response_data["choices"][0]["message"].get("content", "")
                    if synthesis_response:
                        final_message_content = synthesis_response
                        logger.info(f"[FINAL] Synthesis generated new content, length: {len(final_message_content)}")
                except Exception as e:
                    logger.warning(f"[FINAL] Synthesis generation failed: {e}, using existing content")

            # --- Image assembly ---
            has_image_markdown = bool(re.search(r'!\[([^\]]*)\]\(https?://[^\)]+\)', final_message_content))
            image_count_in_synthesis = len(re.findall(r'!\[', final_message_content))
            logger.info(f"[FINAL] Synthesis content has embedded images: {has_image_markdown} ({image_count_in_synthesis} found)")
            existing_image_urls = set(re.findall(r'!\[[^\]]*\]\((https?://[^\)]+)\)', final_message_content))

            response_parts = [final_message_content]
            images_added = 0

            image_pool = collected_similar_images if (image_only_mode and collected_similar_images) else collected_images_from_web
            if image_pool:
                deduped_pool = []
                seen_urls = set()
                for img in image_pool:
                    if img and img.startswith("http") and img not in seen_urls:
                        seen_urls.add(img)
                        deduped_pool.append(img)

                missing_images = [img for img in deduped_pool if img not in existing_image_urls]
                if missing_images:
                    desired_total = min(10, max(4, len(deduped_pool)))
                    images_to_add = max(0, desired_total - len(existing_image_urls))
                    if images_to_add > 0:
                        title = "Similar Images" if image_only_mode else "Related Images"
                        label = "Similar Image" if image_only_mode else "Image"
                        response_parts.append(f"\n\n**{title}:**\n")
                        for img in missing_images[:images_to_add]:
                            response_parts.append(f"![{label}]({img})\n")
                            images_added += 1
                logger.info(f"[FINAL] Added {images_added} images from collected results (existing in synthesis: {len(existing_image_urls)})")
            elif has_image_markdown:
                logger.info(f"[FINAL] No collected image pool; using {image_count_in_synthesis} image references from synthesis")

            generated_images = memoized_results.get("generated_images", [])
            if generated_images:
                gen_deduped = [img for img in generated_images if img not in existing_image_urls]
                if gen_deduped:
                    response_parts.append("\n\n**Generated Images:**\n")
                    for img in gen_deduped:
                        response_parts.append(f"![Generated Image]({img})\n")
                    logger.info(f"[FINAL] Added {len(gen_deduped)} generated images")

            if collected_sources:
                response_parts.append("\n\n---\n**Sources:**\n")
                unique_sources = sorted(list(set(collected_sources)))[:5]
                for i, src in enumerate(unique_sources):
                    response_parts.append(f"{i+1}. [{src}]({src})\n")
            response_with_sources = "".join(response_parts)

            # --- Save to caches ---
            try:
                _cache_embedding = None
                if core_service:
                    try:
                        _cache_embedding = core_service.embed_single_text(user_query)
                    except Exception:
                        pass
                conversation_cache.add_to_cache(
                    query=user_query,
                    response=final_message_content,
                    metadata={
                        "sources": collected_sources[:5],
                        "tool_calls": tool_call_count,
                        "iteration": current_iteration,
                        "had_cache_hit": memoized_results.get("cache_hit", False)
                    },
                    query_embedding=_cache_embedding,
                )
                logger.info(f"[Pipeline] Saved to conversation cache. Stats: {conversation_cache.get_cache_stats()}")
            except Exception as e:
                logger.warning(f"[Pipeline] Failed to save to conversation cache: {e}")

            if session_context:
                try:
                    session_context.add_message(role="assistant", content=final_message_content)
                    memoized_results["_assistant_response_saved"] = True
                    logger.debug(f"[Pipeline] Stored assistant reply in hybrid cache for session={session_id}")
                except Exception as e:
                    logger.warning(f"[Pipeline] Failed to store assistant reply in hybrid cache: {e}")

            memoized_results["final_response"] = response_with_sources

            if event_id:
                yield format_sse("RESPONSE", response_with_sources)
                yield format_sse("INFO", "<TASK>DONE</TASK>")
            else:
                yield response_with_sources
            return
        else:
            error_msg = f"[ERROR] ElixpoSearch failed - no final content after {max_iterations} iterations (tool_calls: {tool_call_count})"
            logger.error(error_msg)
            logger.error(f"[DIAGNOSTIC] collected_sources: {collected_sources}, tool_call_count: {tool_call_count}")
            if collected_sources or tool_call_count > 0:
                logger.warning(f"[FALLBACK] Generating response from {len(collected_sources)} sources and {tool_call_count} tools")
                final_message_content = f"I found relevant information about '{user_query}':"
                if collected_sources:
                    final_message_content += f"\n\n{', '.join(collected_sources[:3])}"

                response_parts = [final_message_content]

                image_pool = collected_similar_images if (image_only_mode and collected_similar_images) else collected_images_from_web
                if image_pool:
                    deduped_pool = []
                    seen_urls = set()
                    for img in image_pool:
                        if img and img.startswith("http") and img not in seen_urls:
                            seen_urls.add(img)
                            deduped_pool.append(img)
                    if deduped_pool:
                        title = "Similar Images" if image_only_mode else "Related Images"
                        label = "Similar Image" if image_only_mode else "Image"
                        response_parts.append(f"\n\n**{title}:**\n")
                        for img in deduped_pool[:10]:
                            response_parts.append(f"![{label}]({img})\n")
                        logger.info(f"[FALLBACK] Added {min(len(deduped_pool), 10)} images to fallback response")

                generated_images = memoized_results.get("generated_images", [])
                if generated_images:
                    response_parts.append("\n\n**Generated Images:**\n")
                    for img in generated_images:
                        response_parts.append(f"![Generated Image]({img})\n")

                if collected_sources:
                    response_parts.append("\n\n---\n**Sources:**\n")
                    unique_sources = sorted(list(set(collected_sources)))[:5]
                    for i, src in enumerate(unique_sources):
                        response_parts.append(f"{i+1}. [{src}]({src})\n")
                response_with_fallback = "".join(response_parts)

                memoized_results["final_response"] = response_with_fallback

                if event_id:
                    yield format_sse("INFO", get_user_message("finalizing"))
                    chunk_size = 8000
                    for i in range(0, len(response_with_fallback), chunk_size):
                        yield format_sse("RESPONSE", response_with_fallback[i:i+chunk_size])
                    yield format_sse("INFO", "<TASK>DONE</TASK>")
                else:
                    yield response_with_fallback
                return
            else:
                if event_id:
                    yield format_sse("INFO", "<TASK>DONE</TASK>")
                return
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        if event_id:
            yield format_sse("INFO", "<TASK>DONE</TASK>")
    finally:
        if session_id and "session_context" in memoized_results and memoized_results["session_context"]:
            try:
                session_context = memoized_results["session_context"]
                if "final_response" in memoized_results and memoized_results["final_response"]:
                    if not memoized_results.get("_assistant_response_saved"):
                        session_context.add_message(role="assistant", content=memoized_results["final_response"])
                        logger.info(f"[Pipeline] Saved assistant response to SessionContextWindow for {session_id} (finally)")
            except Exception as e:
                logger.warning(f"[Pipeline] Failed to save response to SessionContextWindow: {e}")

        if session_id and semantic_cache is not None:
            semantic_cache.save_for_request(session_id)
            logger.info(f"[Pipeline] Saved persistent cache for session {session_id}")

            try:
                if "conversation_cache" in memoized_results:
                    conversation_cache.save_to_disk(session_id=session_id)
                    logger.info(f"[Pipeline] Saved conversation cache to disk: {conversation_cache.get_cache_stats()}")
            except Exception as e:
                logger.warning(f"[Pipeline] Failed to save conversation cache: {e}")

        logger.info("Optimized Search Completed")
