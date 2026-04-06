"""Session store — Redis with in-memory fallback."""

import hashlib
import json
import logging
import time
from typing import Optional

from app.core.config import REDIS_URL, SESSION_TTL

logger = logging.getLogger(__name__)

_redis_client = None
_redis_available = None
_memory_store: dict[str, dict] = {}


def _get_redis():
    """Lazy-connect to Redis. Returns client or None if unavailable."""
    global _redis_client, _redis_available

    if _redis_available is False:
        return None

    if _redis_client is not None:
        return _redis_client

    try:
        import redis
        client = redis.from_url(REDIS_URL, decode_responses=True)
        client.ping()
        _redis_client = client
        _redis_available = True
        logger.info("Connected to Redis at %s", REDIS_URL)
        return client
    except Exception as e:
        _redis_available = False
        logger.warning("Redis unavailable (%s) — using in-memory fallback", e)
        return None


def _text_hash(text: str) -> str:
    """Generate a hash key for text content."""
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def cache_get(key: str) -> Optional[dict]:
    """Get a cached value by key."""
    r = _get_redis()
    if r:
        try:
            data = r.get(f"rewrite:{key}")
            return json.loads(data) if data else None
        except Exception:
            pass

    # In-memory fallback
    entry = _memory_store.get(key)
    if entry and entry.get("_expires", 0) > time.time():
        return entry.get("data")
    elif entry:
        del _memory_store[key]
    return None


def cache_set(key: str, data: dict, ttl: int = SESSION_TTL):
    """Store a value with TTL."""
    r = _get_redis()
    if r:
        try:
            r.setex(f"rewrite:{key}", ttl, json.dumps(data))
            return
        except Exception:
            pass

    # In-memory fallback
    _memory_store[key] = {
        "data": data,
        "_expires": time.time() + ttl,
    }


def cache_detection(text: str, result: dict, ttl: int = SESSION_TTL):
    """Cache a detection result keyed by text hash."""
    key = f"detect:{_text_hash(text)}"
    cache_set(key, result, ttl)


def get_cached_detection(text: str) -> Optional[dict]:
    """Retrieve cached detection result for text."""
    key = f"detect:{_text_hash(text)}"
    return cache_get(key)


def store_session(session_id: str, data: dict, ttl: int = SESSION_TTL):
    """Store session data (document state, scores, rewrite history)."""
    cache_set(f"session:{session_id}", data, ttl)


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve session data."""
    return cache_get(f"session:{session_id}")


def delete_session(session_id: str):
    """Delete a session."""
    r = _get_redis()
    if r:
        try:
            r.delete(f"rewrite:session:{session_id}")
            return
        except Exception:
            pass
    _memory_store.pop(f"session:{session_id}", None)


def is_redis_available() -> bool:
    """Check if Redis is connected."""
    return _get_redis() is not None
