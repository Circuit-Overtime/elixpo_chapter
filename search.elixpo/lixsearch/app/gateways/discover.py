import logging
import uuid
import json
import os
import random
import asyncio
import requests
from datetime import datetime, timezone
from quart import request, jsonify
from commons.searching_based import webSearch, fetch_url_content_parallel
from pipeline.config import (
    POLLINATIONS_ENDPOINT, LLM_MODEL, X_REQ_ID_SLICE_SIZE
)
from pipeline.discover_prompt import (
    DISCOVER_CATEGORIES, CATEGORY_SEARCH_QUERIES,
    discover_system_prompt, discover_user_prompt
)

logger = logging.getLogger("lixsearch-api")

POLLINATIONS_TOKEN = os.getenv("TOKEN")


async def _generate_category_articles(category: str, request_id: str) -> list:
    search_query = CATEGORY_SEARCH_QUERIES.get(category)
    if not search_query:
        logger.warning(f"[{request_id}] discover: unknown category '{category}'")
        return []

    # 1. Web search for current news
    urls = await webSearch(search_query)
    if not urls:
        logger.warning(f"[{request_id}] discover: no URLs for category '{category}'")
        return []

    # 2. Fetch page content (top 5 URLs)
    web_content = await asyncio.to_thread(
        fetch_url_content_parallel, [], urls[:5], 5, request_id
    )
    if not web_content or len(web_content.strip()) < 200:
        logger.warning(f"[{request_id}] discover: insufficient content for '{category}'")
        return []

    # 3. LLM call to generate structured articles
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": discover_system_prompt()},
            {"role": "user", "content": discover_user_prompt(category, web_content)},
        ],
        "max_tokens": 2000,
        "stream": False,
        "temperature": 0.7,
        "seed": random.randint(1000, 9999),
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {POLLINATIONS_TOKEN}",
    }

    try:
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
        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Parse JSON from LLM response (may be wrapped in markdown code blocks)
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        articles = json.loads(content)
        if not isinstance(articles, list):
            logger.warning(f"[{request_id}] discover: LLM returned non-array for '{category}'")
            return []

        # Validate article structure
        valid_articles = []
        for article in articles[:6]:
            if isinstance(article, dict) and "title" in article and "excerpt" in article:
                valid_articles.append({
                    "title": str(article["title"])[:200],
                    "excerpt": str(article["excerpt"])[:500],
                    "sourceUrl": article.get("sourceUrl"),
                    "sourceTitle": article.get("sourceTitle"),
                })

        logger.info(f"[{request_id}] discover: generated {len(valid_articles)} articles for '{category}'")
        return valid_articles

    except json.JSONDecodeError as e:
        logger.error(f"[{request_id}] discover: JSON parse error for '{category}': {e}")
        return []
    except Exception as e:
        logger.error(f"[{request_id}] discover: LLM call failed for '{category}': {e}")
        return []


async def generate_discover(pipeline_initialized: bool):
    if not pipeline_initialized:
        return jsonify({"error": "Server not initialized"}), 503

    try:
        data = await request.get_json() if request.method == 'POST' else {}
        categories = data.get("categories", DISCOVER_CATEGORIES)

        # Validate categories
        categories = [c for c in categories if c in DISCOVER_CATEGORIES]
        if not categories:
            return jsonify({"error": "No valid categories provided"}), 400

        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:X_REQ_ID_SLICE_SIZE])
        day_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        logger.info(f"[{request_id}] discover/generate for {categories} dayKey={day_key}")

        # Generate for all categories concurrently
        tasks = {cat: _generate_category_articles(cat, request_id) for cat in categories}
        results = {}
        for cat, task in tasks.items():
            results[cat] = await task

        total = sum(len(articles) for articles in results.values())
        logger.info(f"[{request_id}] discover/generate completed: {total} articles across {len(categories)} categories")

        return jsonify({
            "status": "ok",
            "dayKey": day_key,
            "generated_count": total,
            "categories": {
                cat: articles for cat, articles in results.items()
            },
        })

    except Exception as e:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:X_REQ_ID_SLICE_SIZE])
        logger.error(f"[{request_id}] discover/generate error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500
