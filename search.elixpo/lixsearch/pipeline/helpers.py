"""Pipeline helper functions — text processing, sanitization, query decomposition, and fetch evaluation."""

import re
import json
import random
import asyncio
import requests
import os
from loguru import logger
from dotenv import load_dotenv

from pipeline.config import (
    LEAKED_TOOL_RE,
    FETCH_MIN_USEFUL_CHARS,
    INTERNAL_LEAK_PATTERNS,
    LLM_MODEL,
    POLLINATIONS_ENDPOINT,
    TOPIC_DECOMPOSITION_MAX_PARTS,
    TOPIC_DECOMPOSITION_TIMEOUT,
)
from pipeline.sse_messages import get_status_message

load_dotenv()

MODEL = LLM_MODEL
POLLINATIONS_TOKEN = os.getenv("TOKEN")


def _scrub_tool_names(text: str) -> str:
    if not text:
        return text
    return LEAKED_TOOL_RE.sub("", text).strip()


def get_user_message(operation: str) -> str:
    return get_status_message(operation)


def _looks_like_internal_reasoning(content: str) -> bool:
    if not content:
        return False
    probe = content[:2500].lower()
    matches = sum(1 for p in INTERNAL_LEAK_PATTERNS if re.search(p, probe, re.MULTILINE))
    if matches >= 2:
        return True
    first_line = content.strip().split("\n")[0].lower()
    strong_starts = (
        "the user wants", "the user is asking", "i should", "i need to",
        "let me", "based on the", "step 1", "first,",
    )
    if any(first_line.startswith(s) for s in strong_starts):
        return True
    return False


def _strip_internal_lines(content: str) -> str:
    if not content:
        return ""
    cleaned = []
    for line in content.splitlines():
        low = line.strip().lower()
        if (
            low.startswith("the user wants")
            or low.startswith("the user is asking")
            or low.startswith("i should")
            or low.startswith("i need to")
            or low.startswith("i will search")
            or low.startswith("i will fetch")
            or low.startswith("i will look")
            or low.startswith("let me")
            or low.startswith("based on the rag")
            or low.startswith("based on the web search")
            or low.startswith("based on the search results")
            or re.match(r"^\d+\.\s+(first|second|third|then|next|finally)\b", low)
            or re.match(r"^(first,|second,|next,|finally,|step \d+)", low)
        ):
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


_FETCH_FAIL_PATTERNS = re.compile(
    r"^\[(?:TIMEOUT|ERROR|CACHED)\]|^No result$|^\[No content fetched",
    re.IGNORECASE,
)


def _evaluate_fetch_quality(tool_outputs: list) -> tuple[int, int]:
    total = 0
    good = 0
    for out in tool_outputs:
        if out.get("name") != "fetch_full_text":
            continue
        total += 1
        content = out.get("content", "")
        if not content or _FETCH_FAIL_PATTERNS.match(content) or len(content) < FETCH_MIN_USEFUL_CHARS:
            continue
        good += 1
    return good, total


async def sanitize_final_response(content: str, query: str, sources: list[str], headers: dict) -> str:
    if not _looks_like_internal_reasoning(content):
        return content

    logger.warning("[FINAL] Detected internal reasoning leakage; rewriting final response")
    rewrite_prompt = [
        {
            "role": "system",
            "content": (
                "You are lixSearch. Rewrite drafts into final user-facing answers only. "
                "Never reveal internal reasoning, planning, tool strategy, cache logic, or step-by-step deliberation."
            ),
        },
        {
            "role": "user",
            "content": (
                f"User query: {query}\n\n"
                "Draft response (contains internal notes, remove them):\n"
                f"{content}\n\n"
                "Return only the final answer in markdown."
            ),
        },
    ]
    if sources:
        rewrite_prompt.append({
            "role": "user",
            "content": "Optional sources:\n" + "\n".join(sources[:5])
        })

    payload = {
        "model": MODEL,
        "messages": rewrite_prompt,
        "seed": random.randint(1000, 9999),
        "max_tokens": 1600,
        "stream": False,
    }
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                requests.post,
                POLLINATIONS_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=20
            ),
            timeout=22.0
        )
        response.raise_for_status()
        response_data = response.json()
        rewritten = response_data["choices"][0]["message"].get("content", "").strip()
        if rewritten and not _looks_like_internal_reasoning(rewritten):
            return rewritten
    except Exception as e:
        logger.warning(f"[FINAL] Rewrite failed, applying local sanitization fallback: {e}")

    stripped = _strip_internal_lines(content)
    if stripped and not _looks_like_internal_reasoning(stripped):
        return stripped

    fallback = f"Here is a concise update on '{query}'."
    if sources:
        fallback += "\n\n**Sources:**\n" + "\n".join([f"- {s}" for s in sources[:3]])
    return fallback


def _decompose_query(query: str) -> list[str]:
    if not query or len(query) < 50:
        return [query]

    parts = re.split(r'\s+(?:and|or|also|additionally|furthermore)\s+', query, maxsplit=2)
    if len(parts) > 1:
        logger.info(f"[DECOMPOSITION] Split query into {len(parts)} parts")
        return [p.strip() for p in parts if p.strip()]

    if '?' in query:
        parts = query.split('?')
        if len(parts) > 1:
            questions = [p.strip() + '?' for p in parts[:-1] if p.strip()]
            if len(questions) > 1:
                logger.info(f"[DECOMPOSITION] Found {len(questions)} questions in query")
                return questions

    return [query]


async def _decompose_query_with_llm(query: str, headers: dict, max_parts: int = TOPIC_DECOMPOSITION_MAX_PARTS) -> list[str]:
    decomposition_prompt = [
        {
            "role": "system",
            "content": (
                f"You are a query decomposition engine. Break the following query into "
                f"2 to {max_parts} focused sub-topics for comprehensive research. "
                f"Return ONLY a JSON array of strings, each being a focused sub-question. "
                f'Example: ["What is X?", "How does X compare to Y?", "Recent developments in X"]'
            )
        },
        {
            "role": "user",
            "content": query
        }
    ]

    payload = {
        "model": MODEL,
        "messages": decomposition_prompt,
        "seed": random.randint(1000, 9999),
        "max_tokens": 500,
        "stream": False,
    }

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                requests.post,
                POLLINATIONS_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=20
            ),
            timeout=float(TOPIC_DECOMPOSITION_TIMEOUT)
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()

        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        parts = json.loads(content)
        if isinstance(parts, list) and all(isinstance(p, str) for p in parts):
            valid = [p.strip() for p in parts if 10 <= len(p.strip()) <= 200]
            if valid:
                logger.info(f"[DECOMPOSITION] LLM decomposed query into {len(valid)} sub-topics")
                return valid[:max_parts]
    except Exception as e:
        logger.warning(f"[DECOMPOSITION] LLM decomposition failed: {e}")

    return [query]


async def _synthesize_subtopic(
    subtopic: str,
    original_query: str,
    messages_context: list,
    headers: dict,
    max_tokens: int,
    rag_context: str = "",
) -> str:
    synthesis_messages = messages_context[:2]

    focused_prompt = {
        "role": "user",
        "content": (
            f"Focus specifically on this aspect of the query '{original_query}':\n\n"
            f"Sub-topic: {subtopic}\n\n"
            f"Provide a focused, detailed response for this specific aspect. "
            f"Use markdown formatting with \\n for line breaks. "
            f"Do not repeat information that would belong to other sub-topics. "
            f"Be thorough but concise for this specific angle.\n"
            f"NEVER mention internal tool names, function calls, or cache operations."
        )
    }
    synthesis_messages.append(focused_prompt)

    payload = {
        "model": MODEL,
        "messages": synthesis_messages,
        "seed": random.randint(1000, 9999),
        "max_tokens": max_tokens,
        "stream": False,
    }

    response = await asyncio.wait_for(
        asyncio.to_thread(
            requests.post,
            POLLINATIONS_ENDPOINT,
            json=payload,
            headers=headers,
            timeout=20
        ),
        timeout=22.0
    )
    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"].strip()
    return content
