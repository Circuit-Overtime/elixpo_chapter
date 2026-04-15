"""Session store — Cloudflare KV backed with in-memory fallback."""

import hashlib
import json
import logging
import time
from typing import Optional

from app.core.config import SESSION_TTL

logger = logging.getLogger(__name__)

_kv_available: bool | None = None
_memory_store: dict[str, dict] = {}


def _kv():
    """Lazy-check if Cloudflare KV is reachable."""
    global _kv_available
    if _kv_available is not None:
        return _kv_available
    try:
        from app.core.cloudflare import kv_get
        # Quick test — a miss is fine, we just need no exception
        kv_get("__ping__")
        _kv_available = True
        logger.info("Connected to Cloudflare KV")
    except Exception as e:
        _kv_available = False
        logger.warning("Cloudflare KV unavailable (%s) — using in-memory fallback", e)
    return _kv_available


def _text_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def cache_get(key: str) -> Optional[dict]:
    """Get a cached value by key."""
    if _kv():
        try:
            from app.core.cloudflare import kv_get_json
            return kv_get_json(f"rewrite:{key}")
        except Exception:
            pass

    entry = _memory_store.get(key)
    if entry and entry.get("_expires", 0) > time.time():
        return entry.get("data")
    elif entry:
        del _memory_store[key]
    return None


def cache_set(key: str, data: dict, ttl: int = SESSION_TTL):
    """Store a value with TTL."""
    if _kv():
        try:
            from app.core.cloudflare import kv_put_json
            kv_put_json(f"rewrite:{key}", data, expiration_ttl=ttl)
            return
        except Exception:
            pass

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
    """Store session data."""
    cache_set(f"session:{session_id}", data, ttl)


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve session data."""
    return cache_get(f"session:{session_id}")


def delete_session(session_id: str):
    """Delete a session."""
    if _kv():
        try:
            from app.core.cloudflare import kv_delete
            kv_delete(f"rewrite:session:{session_id}")
            return
        except Exception:
            pass
    _memory_store.pop(f"session:{session_id}", None)


def is_kv_available() -> bool:
    """Check if Cloudflare KV is connected."""
    return _kv() is True
