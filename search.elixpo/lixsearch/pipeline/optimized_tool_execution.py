from loguru import logger 
from commons.minimal import cleanQuery
from pipeline.tools import tools
from functionCalls.getTimeZone import get_local_time
from functionCalls.getImagePrompt import generate_prompt_from_image, replyFromImage
from functionCalls.generateImage import create_image_from_prompt
from functionCalls.generatePDF import create_pdf_from_content
import asyncio
import time
import json
from commons.searching_based import fetch_url_content_parallel, webSearch, imageSearch
from commons.minimal import cleanQuery
from functionCalls.getYoutubeDetails import transcribe_audio, youtubeMetadata
from pipeline.utils import get_model_server, cached_web_search_key
from pipeline.config import MAX_IMAGES_TO_INCLUDE, LOG_MESSAGE_QUERY_TRUNCATE, LOG_MESSAGE_PREVIEW_TRUNCATE, ERROR_MESSAGE_TRUNCATE, REQUEST_ID_HEX_SLICE_SIZE
from pipeline.queryDecomposition import QueryAnalyzer, DecompositionEvaluator
from pipeline.formalOptimization import ConstrainedOptimizer
from commons.robustnessFramework import ToolOutputSanitizer, SanitizationPolicy
from urllib.parse import urlparse


def _display_url(url: str, max_len: int = 40) -> str:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "")
        path = parsed.path.rstrip("/")
        short = domain + path
        if len(short) > max_len:
            short = short[:max_len] + "…"
        return short
    except Exception:
        return url[:max_len] + "…" if len(url) > max_len else url


async def optimized_tool_execution(function_name: str, function_args: dict, memoized_results: dict, emit_event_func):
    try:
        VALID_TOOL_NAMES = {tool["function"]["name"] for tool in tools}
        if function_name not in VALID_TOOL_NAMES:
            error_msg = f"Tool '{function_name}' is not available. Valid tools are: {', '.join(sorted(VALID_TOOL_NAMES))}"
            logger.error(f"Unknown tool called: {function_name}")
            yield error_msg
            return
        
        if function_name == "cleanQuery":
            websites, youtube, cleaned_query = cleanQuery(function_args.get("query"))
            yield f"Cleaned Query: {cleaned_query}\nWebsites: {websites}\nYouTube URLs: {youtube}"

        elif function_name == "query_conversation_cache":
            logger.info("[Pipeline] Query conversation cache tool called")
            query = function_args.get("query")
            use_window = function_args.get("use_window", True)
            threshold = function_args.get("similarity_threshold")

            web_event = emit_event_func("INFO", "<TASK>Checking previous conversations</TASK>")
            if web_event:
                yield web_event

            if "conversation_cache" not in memoized_results:
                yield "[CACHE] No conversation cache available"
                return
            precomputed_embedding = None
            try:
                from ipcService.coreServiceManager import get_core_embedding_service
                _core = get_core_embedding_service()
                precomputed_embedding = _core.embed_single_text(query)
            except Exception as _e:
                logger.warning(f"[CACHE] IPC embed failed, will fall back to local model: {_e}")

            cache_manager = memoized_results["conversation_cache"]
            cache_hit, similarity_score = cache_manager.query_cache(
                query=query,
                use_window=use_window,
                similarity_threshold=threshold,
                return_compressed=False,
                query_embedding=precomputed_embedding,
            )
            
            if cache_hit:
                cached_response = cache_hit.get("response", "")
                cache_metadata = cache_hit.get("metadata", {})
                result = f"""[CACHE HIT] Found relevant previous answer (similarity: {similarity_score:.2%})

Original Query: {cache_hit.get('query')}

Cached Response:
{cached_response}

---
Sources: {cache_metadata.get('sources', 'N/A')}"""
                memoized_results["cache_hit"] = True
                memoized_results["cached_response"] = cached_response
                logger.info(f"[Pipeline] Cache hit with similarity: {similarity_score:.2%}")
                hit_event = emit_event_func("INFO", "<TASK>Found a relevant previous answer</TASK>")
                if hit_event:
                    yield hit_event
                yield result
            else:
                msg = f"[CACHE] No match found (best similarity: {similarity_score:.2%}). Proceeding with RAG/web search..."
                logger.info(msg)
                memoized_results["cache_hit"] = False
                yield msg

        elif function_name == "get_session_conversation_history":
            logger.info("[Pipeline] Get session conversation history tool called")
            history_event = emit_event_func("INFO", "<TASK>Reviewing conversation history</TASK>")
            if history_event:
                yield history_event
            # Always use the pipeline's real session_id — never trust the model's argument
            session_id = memoized_results.get("session_id") or function_args.get("session_id")
            logger.info(f"[Pipeline] Using session_id={session_id} (pipeline override)")
            include_metadata = function_args.get("include_metadata", True)
            use_full_history = function_args.get("use_full_history", False)
            query_for_search = function_args.get("query", "")

            try:
                if "session_context" in memoized_results and memoized_results["session_context"]:
                    session_context = memoized_results["session_context"]

                    if use_full_history and hasattr(session_context, "get_full_history"):
                        conversation_history = session_context.get_full_history()
                        source_label = "Full History (hot + disk)"
                    elif query_for_search and hasattr(session_context, "smart_context"):
                        ctx = session_context.smart_context(query_for_search)
                        recent = ctx.get("recent", [])
                        relevant = ctx.get("relevant", [])
                        conversation_history = recent
                        source_label = f"Smart Context (recent={len(recent)}, relevant={len(relevant)})"
                        if relevant:
                            conversation_history = relevant + recent
                    else:
                        conversation_history = session_context.get_context()
                        source_label = "Hot Window"

                    if conversation_history:
                        formatted_history = f"## Conversation History [{source_label}]\n\n"
                        for i, msg in enumerate(conversation_history, 1):
                            role = msg.get("role", "unknown").upper()
                            content = msg.get("content", "")
                            timestamp = msg.get("timestamp", "")

                            if include_metadata and timestamp:
                                from datetime import datetime
                                ts_str = datetime.fromtimestamp(timestamp).strftime("%H:%M:%S")
                                formatted_history += f"**{i}. {role}** ({ts_str}):\n{content}\n\n"
                            else:
                                formatted_history += f"**{i}. {role}**:\n{content}\n\n"

                        logger.info(f"[Pipeline] Retrieved {len(conversation_history)} messages for session {session_id} [{source_label}]")
                        yield formatted_history
                    else:
                        logger.info(f"[Pipeline] No conversation history found for session {session_id}")
                        yield f"[SESSION] No previous conversation found for session {session_id}"
                else:
                    logger.warning("[Pipeline] Session context not initialized in this request")
                    yield "[SESSION] Session context unavailable - no previous messages in this session"
            except Exception as e:
                logger.error(f"[Pipeline] Error retrieving session history: {e}")
                yield f"[ERROR] Failed to retrieve conversation history: {str(e)}"

        elif function_name == "get_local_time":
            location_name = function_args.get("location_name")
            if location_name in memoized_results["timezone_info"]:
                yield memoized_results["timezone_info"][location_name]
            localTime = get_local_time(location_name)
            result = f"Location: {location_name} and Local Time is: {localTime}, Please mention the location and time when making the final response!"
            memoized_results["timezone_info"][location_name] = result
            yield result

        elif function_name == "web_search":
            start_time = time.time()
            search_query = function_args.get("query")
            search_depth = function_args.get("search_depth", "standard")
            memoized_results["search_query"] = search_query
            memoized_results["search_depth"] = search_depth
            logger.info(f"[web_search] search_depth='{search_depth}' query='{search_query}'")
            web_event = emit_event_func("INFO", f"<TASK>Searching for '{search_query[:60]}'</TASK>")
            if web_event:
                yield web_event
            cache_key = cached_web_search_key(search_query)
            if cache_key in memoized_results["web_searches"]:
                logger.info(f"Using cached web search for: {search_query}")
                yield memoized_results["web_searches"][cache_key]
                return
            logger.info(f"Performing optimized web search for: {search_query}")
            tool_result = await webSearch(search_query)
            elapsed = time.time() - start_time
            source_urls = tool_result
            memoized_results["web_searches"][cache_key] = tool_result
            if "current_search_urls" not in memoized_results:
                memoized_results["current_search_urls"] = []
            memoized_results["current_search_urls"] = source_urls
            url_count = len(source_urls) if isinstance(source_urls, list) else 0
            done_event = emit_event_func("INFO", f"<TASK>Found {url_count} results in {elapsed:.1f}s</TASK>")
            if done_event:
                yield done_event
            yield tool_result

        elif function_name == "generate_prompt_from_image":
            image_url = function_args.get("imageURL")
            web_event = emit_event_func("INFO", f"<TASK>Analyzing image from {_display_url(image_url)}</TASK>")
            if web_event:
                yield web_event
            try:
                get_prompt = await generate_prompt_from_image(image_url)
                result = f"Generated Search Query: {get_prompt}"
                logger.info(f"Generated prompt: {get_prompt}")
                yield result
            except Exception as e:
                logger.error(f"Image analysis error: {e}")
                yield f"[ERROR] Image analysis failed: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "replyFromImage":
            image_url = function_args.get("imageURL")
            query = function_args.get("query")
            web_event = emit_event_func("INFO", f"<TASK>Analyzing image: '{query[:50]}'</TASK>")
            if web_event:
                yield web_event
            try:
                reply = await replyFromImage(image_url, query)
                result = f"Reply from Image: {reply}"
                logger.info(f"Reply from image for query '{query}': {reply[:LOG_MESSAGE_PREVIEW_TRUNCATE]}...")
                yield result
            except Exception as e:
                logger.error(f"Image query error: {e}")
                yield f"[ERROR] Image query failed: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "create_image":
            prompt = function_args.get("prompt")
            from pipeline.sse_messages import get_status_message
            web_event = emit_event_func("INFO", get_status_message("generating_image"))
            if web_event:
                yield web_event
            try:
                image_url = await create_image_from_prompt(prompt)
                if "generated_images" not in memoized_results:
                    memoized_results["generated_images"] = []
                memoized_results["generated_images"].append(image_url)
                result = f"Generated image for prompt: '{prompt}'\nImage URL: {image_url}"
                logger.info(f"Generated image: {image_url}")
                done_event = emit_event_func("INFO", get_status_message("image_generated"))
                if done_event:
                    yield done_event
                yield result
            except Exception as e:
                logger.error(f"Image generation error: {e}")
                yield f"[ERROR] Image generation failed: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "export_to_pdf":
            content = function_args.get("content", "")
            title = function_args.get("title")
            if not content or not content.strip():
                yield "[ERROR] No content provided for PDF export. Provide the markdown content to export."
                return
            web_event = emit_event_func("INFO", "<TASK>Generating PDF document</TASK>")
            if web_event:
                yield web_event
            try:
                pdf_url = await create_pdf_from_content(content, title)
                if "generated_pdfs" not in memoized_results:
                    memoized_results["generated_pdfs"] = []
                memoized_results["generated_pdfs"].append(pdf_url)
                result = f"PDF exported successfully.\nDownload: {pdf_url}"
                logger.info(f"[Pipeline] Generated PDF: {pdf_url}")
                done_event = emit_event_func("INFO", "<TASK>PDF ready for download</TASK>")
                if done_event:
                    yield done_event
                yield result
            except Exception as e:
                logger.error(f"PDF generation error: {e}")
                yield f"[ERROR] PDF generation failed: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "image_search":
            start_time = time.time()
            image_query = function_args.get("image_query")
            web_event = emit_event_func("INFO", f"<TASK>Finding images for '{image_query[:50]}'</TASK>")
            if web_event:
                yield web_event
            elapsed = time.time() - start_time
            if elapsed > 10:
                web_event = emit_event_func("INFO", f"<TASK>Still searching images… hang on</TASK>")
                if web_event:
                    yield web_event
            max_images = function_args.get("max_images", MAX_IMAGES_TO_INCLUDE)
            search_results_raw = await imageSearch(image_query, max_images=max_images)
            logger.info(f"Image search for '{image_query[:LOG_MESSAGE_QUERY_TRUNCATE]}...' completed.")
            image_urls = []
            url_context = ""
            try:
                if isinstance(search_results_raw, list):
                    image_urls = search_results_raw[:max_images]
                elif isinstance(search_results_raw, str):
                    try:
                        image_dict = json.loads(search_results_raw)
                        if isinstance(image_dict, dict):
                            for src_url, imgs in image_dict.items():
                                if not imgs:
                                    continue
                                for img_url in imgs[:REQUEST_ID_HEX_SLICE_SIZE]:
                                    if img_url and img_url.startswith("http"):
                                        image_urls.append(img_url)
                    except json.JSONDecodeError:
                        logger.warning(f"Could not parse image search results as JSON")
                
                for url in image_urls:
                    if url.startswith("http"):
                        url_context += f"\t{url}\n"
                
                done_event = emit_event_func("INFO", f"<TASK>Found {len(image_urls)} image{'s' if len(image_urls) != 1 else ''}</TASK>")
                if done_event:
                    yield done_event
                yield (f"Found {len(image_urls)} relevant images:\n{url_context}\n", image_urls)
            except Exception as e:
                logger.error(f"Failed to process image search results: {e}")
                yield ("Image search completed but results processing failed", [])

        elif function_name == "youtubeMetadata":
            url = function_args.get("url")
            web_event = emit_event_func("INFO", f"<TASK>Fetching YouTube info: {_display_url(url)}</TASK>")
            if web_event:
                yield web_event
            metadata = await youtubeMetadata(url)
            result = f"YouTube Metadata:\n{metadata if metadata else '[No metadata available]'}"
            memoized_results["youtube_metadata"][url] = result
            if metadata:
                done_event = emit_event_func("INFO", f"<TASK>Retrieved video details</TASK>")
                if done_event:
                    yield done_event
            yield result

        elif function_name == "transcribe_audio":
            logger.info("Getting YouTube transcript")
            _yt_url = function_args.get("url", "")
            web_event = emit_event_func("INFO", f"<TASK>Transcribing video: {_display_url(_yt_url)}</TASK>")
            if web_event:
                yield web_event
            try:
                url = function_args.get("url")
                search_query = memoized_results.get("search_query", "")
                result = await transcribe_audio(url, full_transcript=False, query=search_query)
                transcript_text = f"YouTube Transcript:\n{result if result else '[No transcript available]'}"
                memoized_results["youtube_transcripts"][url] = transcript_text
                _word_count = len(result.split()) if result else 0
                done_event = emit_event_func("INFO", f"<TASK>Transcribed ~{_word_count} words from video</TASK>")
                if done_event:
                    yield done_event
                yield transcript_text
            except asyncio.TimeoutError:
                logger.warning("Transcribe audio timed out")
                timeout_event = emit_event_func("INFO", f"<TASK>Video transcription timed out</TASK>")
                if timeout_event:
                    yield timeout_event
                yield "[TIMEOUT] Video transcription took too long"
            except Exception as e:
                logger.error(f"Transcription error: {e}")
                yield f"[ERROR] Failed to transcribe: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "fetch_full_text":
            url = function_args.get("url")
            fetch_start = time.time()
            logger.info(f"Fetching webpage content: {url[:60]}")
            web_event = emit_event_func("INFO", f"<TASK>Reading {_display_url(url)}</TASK>")
            if web_event:
                yield web_event

            try:
                queries = memoized_results.get("search_query", "")
                if isinstance(queries, str):
                    queries = [queries]
                collecting_event = emit_event_func("INFO", f"<TASK>Collecting content from {_display_url(url)}</TASK>")
                if collecting_event:
                    yield collecting_event
                parallel_results = await asyncio.wait_for(
                    asyncio.to_thread(fetch_url_content_parallel, queries, [url]),
                    timeout=10.0
                )
                content_len = len(parallel_results) if parallel_results else 0

                # Browser fallback: if plain HTTP got <120 chars, try Playwright
                if content_len < FETCH_MIN_USEFUL_CHARS:
                    logger.info(f"[fetch_full_text] Plain fetch too short ({content_len} chars), trying browser fallback for {url[:60]}")
                    try:
                        from ipcService.coreServiceManager import CoreServiceManager
                        search_agents = CoreServiceManager.get_instance().get_search_agents()
                        browser_text = await asyncio.wait_for(
                            asyncio.to_thread(search_agents.browser_fetch, url),
                            timeout=18.0
                        )
                        if browser_text and len(browser_text) > content_len:
                            parallel_results = f"URL: {url}\n{browser_text}"
                            content_len = len(parallel_results)
                            logger.info(f"[fetch_full_text] Browser fallback got {content_len} chars from {url[:50]}")
                    except Exception as e:
                        logger.warning(f"[fetch_full_text] Browser fallback failed for {url[:50]}: {e}")

                fetch_elapsed = time.time() - fetch_start
                logger.info(f"[fetch_full_text] Fetched {content_len} chars from {url[:50]} in {fetch_elapsed:.1f}s")

                yield parallel_results if parallel_results else "[No content fetched from URL]"
            except asyncio.TimeoutError:
                logger.warning(f"URL fetch timed out for {url}")
                timeout_event = emit_event_func("INFO", f"<TASK>Source timed out, moving on</TASK>")
                if timeout_event:
                    yield timeout_event
                yield f"[TIMEOUT] Fetching {url} took too long"
            except Exception as e:
                logger.error(f"URL fetch error for {url}: {e}")
                yield f"[ERROR] Failed to fetch {url}: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "analyze_query_complexity":
            logger.info("[Pipeline] Analyzing query complexity")
            query = function_args.get("query")
            try:
                analyzer = QueryAnalyzer()
                should_decompose, reason, confidence = analyzer.should_decompose(query)
                complexity = analyzer.detect_query_complexity(query)
                aspects = analyzer._detect_aspects(query)
                
                result = {
                    "query": query,
                    "complexity_level": complexity.value,
                    "aspects_detected": list(aspects),
                    "should_decompose": should_decompose,
                    "reasoning": reason,
                    "confidence": confidence
                }
                
                logger.info(f"[Pipeline] Query analysis: complexity={complexity.value}, decompose={should_decompose}")
                yield json.dumps(result, indent=2)
            except Exception as e:
                logger.error(f"Query complexity analysis error: {e}")
                yield f"[ERROR] Failed to analyze query: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "evaluate_response_quality":
            logger.info("[Pipeline] Evaluating response quality")
            query = function_args.get("query")
            response = function_args.get("response")
            sources = function_args.get("sources", [])
            
            try:
                optimizer = ConstrainedOptimizer()
                
                completeness = optimizer.aspect_evaluator.compute_coverage_ratio(query, response, sources)
                factuality = optimizer.factuality_evaluator.evaluate_citations(response, sources)
                freshness = optimizer.freshness_evaluator.compute_freshness([])
                
                overall_score = (completeness + factuality + freshness) / 3.0
                
                result = {
                    "query": query[:LOG_MESSAGE_QUERY_TRUNCATE],
                    "response_length": len(response),
                    "quality_metrics": {
                        "completeness": round(completeness, 3),
                        "factuality": round(factuality, 3),
                        "freshness": round(freshness, 3),
                        "overall_score": round(overall_score, 3)
                    },
                    "sources_used": len(sources),
                    "assessment": "PASS" if overall_score >= 0.65 else "NEEDS_IMPROVEMENT",
                    "recommendations": []
                }
                
                if completeness < 0.75:
                    result["recommendations"].append("Increase aspect coverage (completeness)")
                if factuality < 0.70:
                    result["recommendations"].append("Improve citation correctness (factuality)")
                if freshness < 0.60:
                    result["recommendations"].append("Use more recent sources (freshness)")
                
                logger.info(f"[Pipeline] Response quality: completeness={completeness:.2f}, factuality={factuality:.2f}")
                yield json.dumps(result, indent=2)
            except Exception as e:
                logger.error(f"Response quality evaluation error: {e}")
                yield f"[ERROR] Failed to evaluate response: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"

        elif function_name == "sanitize_output":
            logger.info("[Pipeline] Sanitizing output")
            output = function_args.get("output")
            source = function_args.get("source", "unknown")
            
            try:
                sanitizer = ToolOutputSanitizer(SanitizationPolicy())
                sanitized_output, report = sanitizer.sanitize(output, source=source)
                
                result = {
                    "source": source,
                    "original_length": report["original_length"],
                    "sanitized_length": report["sanitized_length"],
                    "risk_level": report["risk_level"],
                    "issues_found": report["issues"],
                    "transformations_applied": report["transformations_applied"],
                    "is_safe": report["risk_level"] in ["low", "medium"],
                    "sanitized_output": sanitized_output
                }
                
                logger.info(f"[Pipeline] Output sanitization: risk_level={report['risk_level']}, issues={len(report['issues'])}")
                yield json.dumps(result, indent=2)
            except Exception as e:
                logger.error(f"Output sanitization error: {e}")
                yield f"[ERROR] Failed to sanitize output: {str(e)[:ERROR_MESSAGE_TRUNCATE]}"
    
    except asyncio.TimeoutError:
        logger.warning(f"Tool {function_name} timed out")
        yield f"[TIMEOUT] Tool {function_name} took too long to execute"
