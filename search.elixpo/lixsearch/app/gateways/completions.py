import logging
import uuid
import json
import hashlib
from datetime import datetime, timezone
from quart import request, jsonify, Response
from pipeline.searchPipeline import run_elixposearch_pipeline
from pipeline.config import (
    X_REQ_ID_SLICE_SIZE,
    REQUEST_ID_HEX_SLICE_SIZE,
    LOG_MESSAGE_QUERY_TRUNCATE,
    RESPONSE_MODEL,
)

logger = logging.getLogger("lixsearch-api")


def _generate_session_id(messages: list) -> str:

    first_user = ""
    for msg in messages:
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, str):
                first_user = content[:200]
            break
    if first_user:
        digest = hashlib.sha256(first_user.encode()).hexdigest()[:16]
        return f"oai-{digest}"
    return f"oai-{uuid.uuid4().hex[:16]}"


def _format_chunk(request_id: str, content: str, finish_reason=None, event_type: str = "RESPONSE") -> str:
    chunk = {
        "id": request_id,
        "object": "chat.completion.chunk",
        "created": int(datetime.now(timezone.utc).timestamp()),
        "model": RESPONSE_MODEL,
        "choices": [
            {
                "index": 0,
                "delta": {"content": content} if content else {},
                "finish_reason": finish_reason,
            }
        ],
    }
    if event_type != "RESPONSE":
        chunk["event_type"] = event_type
    return f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"


def _format_completion(request_id: str, content: str, prompt_tokens: int = 0) -> dict:
    completion_tokens = len(content) // 4
    return {
        "id": request_id,
        "object": "chat.completion",
        "created": int(datetime.now(timezone.utc).timestamp()),
        "model": RESPONSE_MODEL,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }


async def chat_completions(pipeline_initialized: bool):

    if not pipeline_initialized:
        return jsonify({"error": {"message": "Server not initialized", "type": "server_error"}}), 503

    request_id = f"chatcmpl-{uuid.uuid4().hex[:REQUEST_ID_HEX_SLICE_SIZE]}"

    try:
        data = await request.get_json()
        if not data:
            return jsonify({"error": {"message": "Request body required", "type": "invalid_request_error"}}), 400

        messages = data.get("messages")
        if not messages or not isinstance(messages, list):
            return jsonify({"error": {"message": "messages array is required", "type": "invalid_request_error"}}), 400

        stream = data.get("stream", False)
        session_id = data.get("session_id", "").strip() if data.get("session_id") else ""

        # Extract the last user message as the query
        user_query = ""
        image_urls = []
        for msg in reversed(messages):
            if msg.get("role") == "user":
                content = msg.get("content", "")
                if isinstance(content, str):
                    user_query = content.strip()
                elif isinstance(content, list):
                    # OpenAI vision format: [{"type": "text", "text": "..."}, {"type": "image_url", ...}]
                    for part in content:
                        if part.get("type") == "text":
                            user_query = part.get("text", "").strip()
                        elif part.get("type") == "image_url":
                            url = part.get("image_url", {}).get("url", "")
                            if url:
                                image_urls.append(url)
                break

        if not user_query and not image_urls:
            return jsonify({"error": {"message": "No user message found in messages", "type": "invalid_request_error"}}), 400

        # Build chat history: all messages before the last user message (exclude system)
        chat_history = []
        for msg in messages[:-1] if messages else []:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                if isinstance(content, list):
                    # Flatten vision-format content to text
                    text_parts = [p.get("text", "") for p in content if p.get("type") == "text"]
                    content = " ".join(text_parts)
                chat_history.append({"role": role, "content": content})

        # Auto-generate session_id if not provided
        if not session_id:
            session_id = _generate_session_id(messages)

        image_url = image_urls[0] if image_urls else None

        logger.info(
            f"[{request_id}] /v1/chat/completions session={session_id} "
            f"query={user_query[:LOG_MESSAGE_QUERY_TRUNCATE]}... "
            f"stream={stream} history={len(chat_history)} images={len(image_urls)}"
        )

        if stream:
            async def stream_generator():
                # Send initial role chunk
                role_chunk = {
                    "id": request_id,
                    "object": "chat.completion.chunk",
                    "created": int(datetime.now(timezone.utc).timestamp()),
                    "model": RESPONSE_MODEL,
                    "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}],
                }
                yield f"data: {json.dumps(role_chunk)}\n\n"

                async for chunk in run_elixposearch_pipeline(
                    user_query=user_query,
                    user_image=image_url,
                    user_images=image_urls if image_urls else None,
                    event_id=request_id,
                    session_id=session_id,
                    chat_history=chat_history if chat_history else None,
                ):
                    chunk_str = chunk if isinstance(chunk, str) else chunk.decode("utf-8")

                    # Parse pipeline SSE events
                    lines = chunk_str.strip().split("\n")
                    event_type = None
                    event_data_lines = []
                    for line in lines:
                        if line.startswith("event:"):
                            event_type = line.replace("event:", "").strip()
                        elif line.startswith("data:"):
                            event_data_lines.append(line.replace("data:", "", 1).lstrip())

                    event_data = "\n".join(event_data_lines) if event_data_lines else None

                    if event_type == "RESPONSE" and event_data:
                        yield _format_chunk(request_id, event_data)
                    elif event_type == "INFO" and event_data and "<TASK>DONE</TASK>" in event_data:
                        yield _format_chunk(request_id, "", finish_reason="stop")
                        yield "data: [DONE]\n\n"

                # Safety: always send [DONE] if not already sent
                # (pipeline may not yield DONE in all paths)

            return Response(
                stream_generator(),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream",
                    "X-Request-ID": request_id,
                },
            )
        else:
            # Non-streaming: collect full response
            response_content = ""
            async for chunk in run_elixposearch_pipeline(
                user_query=user_query,
                user_image=image_url,
                user_images=image_urls if image_urls else None,
                event_id=None,
                session_id=session_id,
                chat_history=chat_history if chat_history else None,
            ):
                if chunk:
                    response_content = chunk  # non-streaming: pipeline yields final text

            if not response_content:
                return jsonify({"error": {"message": "No response generated", "type": "server_error"}}), 500

            prompt_tokens = sum(len(m.get("content", "")) // 4 for m in messages)
            result = _format_completion(request_id, response_content, prompt_tokens)

            return Response(
                json.dumps(result, ensure_ascii=False),
                mimetype="application/json",
                headers={"Content-Type": "application/json", "X-Request-ID": request_id},
            )

    except Exception as e:
        logger.error(f"[{request_id}] /v1/chat/completions error: {e}", exc_info=True)
        return jsonify({"error": {"message": "Internal server error", "type": "server_error"}}), 500
