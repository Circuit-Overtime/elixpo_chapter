"""
HybridConversationCache – two-tier conversation storage.

Tier 1 (Hot):  Redis DB 2 – recent messages, fast O(1) access
Tier 2 (Cold): Disk       – full history, Huffman-compressed, persistent

Key behaviours:
- add_message()   → write to Redis hot window; track last_activity per session
- get_context()   → return hot window (recent); optionally enrich from disk
- get_full()      → load everything from disk (returns all turns)
- smart_context() → recent from Redis + semantic search from disk when needed
- LRU eviction    → background thread migrates inactive sessions to disk after 2h idle
- TTL cleanup     → sessions on disk are removed after 14 days inactive (checked on startup)

Design for throughput:
- Redis operations: O(1) with pipeline where possible
- Disk I/O only on cold path (eviction / full history load)
- Per-session threading locks for all write paths
- Background daemon thread for LRU eviction (non-blocking)
"""
import threading
import time
import json
from typing import Dict, List, Optional, Any

from loguru import logger

from sessions.conversation_archive import ConversationArchive
from pipeline.config import (
    SEMANTIC_CACHE_REDIS_HOST,
    SEMANTIC_CACHE_REDIS_PORT,
    SESSION_CONTEXT_WINDOW_REDIS_DB,
    SESSION_CONTEXT_WINDOW_TTL_SECONDS,
    SESSION_CONTEXT_WINDOW_SIZE,
    REDIS_KEY_PREFIX,
    REDIS_SOCKET_CONNECT_TIMEOUT,
    REDIS_SOCKET_KEEPALIVE,
    CONVERSATION_ARCHIVE_DIR,
    SESSION_DISK_TTL_DAYS,
    SESSION_LRU_EVICT_AFTER_MINUTES,
    HYBRID_HOT_WINDOW_SIZE,
    REDIS_PASSWORD,
    create_redis_client,
)

try:
    import redis as _redis
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False
    logger.error("[HybridCache] redis-py not installed – Redis tier unavailable")


# ────────────────────────────────────────────────────────────────────────────
#  Singleton archive (one per process – shared across all sessions)
# ────────────────────────────────────────────────────────────────────────────
_archive: Optional[ConversationArchive] = None
_archive_lock = threading.Lock()


def _get_archive() -> ConversationArchive:
    global _archive
    if _archive is None:
        with _archive_lock:
            if _archive is None:
                _archive = ConversationArchive(
                    archive_dir=CONVERSATION_ARCHIVE_DIR,
                    session_ttl_days=SESSION_DISK_TTL_DAYS,
                )
    return _archive


# ────────────────────────────────────────────────────────────────────────────
#  LRU eviction background thread
# ────────────────────────────────────────────────────────────────────────────
_eviction_registry: Dict[str, float] = {}   # session_id → last_activity ts
_eviction_registry_lock = threading.Lock()
_eviction_thread_started = False
_eviction_thread_lock = threading.Lock()


def _update_last_activity(session_id: str) -> None:
    with _eviction_registry_lock:
        _eviction_registry[session_id] = time.time()


def _eviction_loop(redis_client, evict_after_seconds: int, check_interval: int = 60) -> None:
    """Background daemon: migrate inactive sessions from Redis to disk."""
    logger.info(
        f"[HybridCache] LRU eviction loop started: evict after {evict_after_seconds}s, "
        f"check every {check_interval}s"
    )
    while True:
        try:
            time.sleep(check_interval)
            cutoff = time.time() - evict_after_seconds
            with _eviction_registry_lock:
                to_evict = [sid for sid, ts in _eviction_registry.items() if ts < cutoff]

            for session_id in to_evict:
                try:
                    _migrate_to_disk(session_id, redis_client)
                    with _eviction_registry_lock:
                        _eviction_registry.pop(session_id, None)
                except Exception as e:
                    logger.warning(
                        f"[HybridCache] Eviction failed for session={session_id}: {e}"
                    )
        except Exception as e:
            logger.error(f"[HybridCache] Eviction loop error: {e}")


def _migrate_to_disk(session_id: str, redis_client) -> None:
    """Read Redis hot window for session and flush to disk archive."""
    archive = _get_archive()
    key = f"{REDIS_KEY_PREFIX}:session_context:{session_id}"
    order_key = f"{REDIS_KEY_PREFIX}:session_order:{session_id}"

    try:
        msg_ids = redis_client.lrange(order_key, 0, -1)
        if not msg_ids:
            return

        turns: List[Dict] = []
        for msg_id in reversed(msg_ids):
            msg_key = f"{key}:{msg_id}"
            raw = redis_client.get(msg_key)
            if raw:
                try:
                    msg = json.loads(raw)
                    turns.append(msg)
                except Exception:
                    pass

        if turns:
            archive.append_turns(session_id, turns)
            # Purge from Redis
            pipe = redis_client.pipeline()
            for msg_id in msg_ids:
                pipe.delete(f"{key}:{msg_id}")
            pipe.delete(order_key)
            pipe.execute()
            logger.info(
                f"[HybridCache] Migrated {len(turns)} turns for session={session_id} to disk"
            )
    except Exception as e:
        logger.error(f"[HybridCache] _migrate_to_disk session={session_id}: {e}")


def _start_eviction_thread(redis_client, evict_after_seconds: int) -> None:
    global _eviction_thread_started
    with _eviction_thread_lock:
        if not _eviction_thread_started:
            t = threading.Thread(
                target=_eviction_loop,
                args=(redis_client, evict_after_seconds),
                daemon=True,
                name="hybrid-cache-lru-evictor",
            )
            t.start()
            _eviction_thread_started = True
            logger.info("[HybridCache] LRU eviction daemon started")


# ────────────────────────────────────────────────────────────────────────────
#  HybridConversationCache
# ────────────────────────────────────────────────────────────────────────────

class HybridConversationCache:
    """
    Per-session hybrid conversation cache (Redis hot + disk cold).

    Usage:
        cache = HybridConversationCache(session_id)
        cache.add_message("user", "hello")
        msgs = cache.get_context()          # recent from Redis
        all_msgs = cache.get_full()         # all from disk
        best = cache.smart_context(query)   # recent + semantic disk search
    """

    def __init__(
        self,
        session_id: str,
        redis_host: str = SEMANTIC_CACHE_REDIS_HOST,
        redis_port: int = SEMANTIC_CACHE_REDIS_PORT,
        redis_db: int = SESSION_CONTEXT_WINDOW_REDIS_DB,
        hot_window_size: int = HYBRID_HOT_WINDOW_SIZE,
        redis_ttl: int = SESSION_CONTEXT_WINDOW_TTL_SECONDS,
        evict_after_minutes: int = SESSION_LRU_EVICT_AFTER_MINUTES,
    ):
        self.session_id = session_id
        self.hot_window_size = hot_window_size
        self.redis_ttl = redis_ttl
        self.archive = _get_archive()
        self._lock = threading.RLock()

        self._redis: Optional[Any] = None
        if _REDIS_AVAILABLE:
            try:
                self._redis = create_redis_client(host=redis_host, port=redis_port, db=redis_db)
                # Start eviction background thread (once per process)
                _start_eviction_thread(self._redis, evict_after_minutes * 60)
                logger.debug(
                    f"[HybridCache] session={session_id} Redis connected "
                    f"(db={redis_db}, hot_window={hot_window_size})"
                )
            except Exception as e:
                logger.warning(
                    f"[HybridCache] session={session_id} Redis unavailable ({e}), "
                    f"falling back to disk-only"
                )
                self._redis = None

        # Register in eviction registry
        _update_last_activity(session_id)

    # ── Key helpers ──────────────────────────────────────────────────────

    @property
    def _ctx_key(self) -> str:
        return f"{REDIS_KEY_PREFIX}:session_context:{self.session_id}"

    @property
    def _order_key(self) -> str:
        return f"{REDIS_KEY_PREFIX}:session_order:{self.session_id}"

    # ── Core write ───────────────────────────────────────────────────────

    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None, embedding=None) -> int:
        """
        Add a message to the hot Redis window.
        Returns current hot window size.
        """
        _update_last_activity(self.session_id)
        ts = time.time()
        turn_id = int(ts * 1000) % (2**31)

        msg = {
            "role": role,
            "content": content,
            "timestamp": ts,
            "metadata": metadata or {},
        }
        if embedding is not None:
            try:
                import numpy as np
                msg["embedding"] = embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
            except Exception:
                pass

        with self._lock:
            if self._redis:
                return self._add_to_redis(msg, turn_id)
            else:
                # Disk-only fallback
                self.archive.append_turn(self.session_id, msg)
                return 1

    def _add_to_redis(self, msg: Dict, turn_id: int) -> int:
        """Write message to Redis with LRU window enforcement."""
        try:
            ctx_key = self._ctx_key
            order_key = self._order_key
            msg_key = f"{ctx_key}:{turn_id}"

            pipe = self._redis.pipeline()
            pipe.setex(msg_key, self.redis_ttl, json.dumps(msg).encode("utf-8"))
            pipe.lpush(order_key, turn_id)
            pipe.expire(order_key, self.redis_ttl)
            pipe.execute()

            # Enforce window size – evict oldest to disk
            window_len = self._redis.llen(order_key)
            if window_len > self.hot_window_size:
                excess = window_len - self.hot_window_size
                for _ in range(excess):
                    old_id = self._redis.rpop(order_key)
                    if old_id:
                        old_key = f"{ctx_key}:{old_id.decode() if isinstance(old_id, bytes) else old_id}"
                        raw = self._redis.get(old_key)
                        if raw:
                            try:
                                old_msg = json.loads(raw)
                                self.archive.append_turn(self.session_id, old_msg)
                            except Exception:
                                pass
                            self._redis.delete(old_key)

            return min(window_len, self.hot_window_size)
        except Exception as e:
            logger.warning(
                f"[HybridCache] session={self.session_id} _add_to_redis failed: {e}"
            )
            # Fallback: persist directly to disk
            self.archive.append_turn(self.session_id, msg)
            return 0

    # ── Context retrieval ────────────────────────────────────────────────

    def get_context(self) -> List[Dict]:
        """Return recent messages from Redis hot window (chronological order).
        Falls back to full disk archive if Redis is empty (e.g. after LRU eviction),
        and re-hydrates the Redis hot window so subsequent requests are fast."""
        _update_last_activity(self.session_id)
        if self._redis:
            messages = self._get_from_redis()
            if messages:
                # Refresh TTL on access so active sessions never expire
                self._refresh_redis_ttl()
                return messages
            # Redis available but empty — session was evicted to disk
            # Load from disk and re-hydrate Redis hot window
            disk_messages = self.archive.load_all(self.session_id) or []
            if disk_messages:
                logger.info(
                    f"[HybridCache] session={self.session_id} Redis empty, "
                    f"recovered {len(disk_messages)} messages from disk — re-hydrating Redis"
                )
                # Re-populate Redis with the most recent messages (up to hot_window_size)
                recent = disk_messages[-self.hot_window_size:]
                for msg in recent:
                    try:
                        ts = msg.get("timestamp", time.time())
                        turn_id = int(ts * 1000) % (2**31)
                        ctx_key = self._ctx_key
                        msg_key = f"{ctx_key}:{turn_id}"
                        pipe = self._redis.pipeline()
                        pipe.setex(msg_key, self.redis_ttl, json.dumps(msg).encode("utf-8"))
                        pipe.lpush(self._order_key, turn_id)
                        pipe.expire(self._order_key, self.redis_ttl)
                        pipe.execute()
                    except Exception as e:
                        logger.debug(f"[HybridCache] Re-hydrate failed for msg: {e}")
                        break
            return disk_messages
        # Redis unavailable — disk-only fallback (full archive)
        return self.archive.load_all(self.session_id) or []

    def _get_from_redis(self) -> List[Dict]:
        """Read hot window from Redis."""
        try:
            ctx_key = self._ctx_key
            order_key = self._order_key
            msg_ids = self._redis.lrange(order_key, 0, -1)
            messages: List[Dict] = []
            for msg_id in reversed(msg_ids):
                mid = msg_id.decode() if isinstance(msg_id, bytes) else msg_id
                raw = self._redis.get(f"{ctx_key}:{mid}")
                if raw:
                    try:
                        messages.append(json.loads(raw))
                    except Exception:
                        pass
            return messages
        except Exception as e:
            logger.warning(
                f"[HybridCache] session={self.session_id} _get_from_redis failed: {e}"
            )
            return []

    def _refresh_redis_ttl(self) -> None:
        """Refresh TTL on all Redis keys for this session so active sessions never expire."""
        try:
            ctx_key = self._ctx_key
            order_key = self._order_key
            msg_ids = self._redis.lrange(order_key, 0, -1)
            if not msg_ids:
                return
            pipe = self._redis.pipeline()
            pipe.expire(order_key, self.redis_ttl)
            for msg_id in msg_ids:
                mid = msg_id.decode() if isinstance(msg_id, bytes) else msg_id
                pipe.expire(f"{ctx_key}:{mid}", self.redis_ttl)
            pipe.execute()
        except Exception as e:
            logger.debug(f"[HybridCache] session={self.session_id} TTL refresh failed: {e}")

    def get_full(self) -> List[Dict]:
        """
        Return complete conversation history (Redis hot + disk cold).

        Persists any Redis-only messages to disk first so nothing is
        lost if the eviction daemon hasn't run yet.
        """
        disk_turns = self.archive.load_all(self.session_id) or []
        hot_turns = self._get_from_redis() if self._redis else []

        # Find hot messages not yet on disk (by timestamp) and persist them
        disk_ts: set = {t.get("timestamp") for t in disk_turns}
        new_turns = [t for t in hot_turns if t.get("timestamp") not in disk_ts]
        if new_turns:
            try:
                self.archive.append_turns(self.session_id, new_turns)
            except Exception as e:
                logger.debug(f"[HybridCache] session={self.session_id} persist in get_full: {e}")

        # Merge all
        for turn in new_turns:
            disk_turns.append(turn)

        disk_turns.sort(key=lambda t: t.get("timestamp", 0))
        return disk_turns

    def smart_context(self, query: str, query_embedding=None, recent_k: int = 10, disk_k: int = 5) -> Dict[str, List[Dict]]:
        """
        Intelligent context assembly:
        1. Always include recent_k hot messages from Redis (or disk if evicted)
        2. If query_embedding provided or recent messages are sparse,
           also retrieve disk_k semantically relevant turns from disk

        Returns {"recent": [...], "relevant": [...]}
        """
        recent = self.get_context()[-recent_k:]
        relevant: List[Dict] = []

        # Always try disk search when we have a query embedding or few recent messages
        has_disk_archive = self.archive.session_exists(self.session_id)

        if query_embedding is not None and has_disk_archive:
            try:
                relevant = self.archive.search_by_embedding(
                    self.session_id, query_embedding, top_k=disk_k
                )
            except Exception as e:
                logger.debug(
                    f"[HybridCache] session={self.session_id} smart_context embedding search: {e}"
                )
                relevant = self.archive.search_by_text(self.session_id, query, top_k=disk_k)
        elif has_disk_archive and (len(recent) < recent_k):
            # Fewer messages than requested — enrich from disk
            relevant = self.archive.search_by_text(self.session_id, query, top_k=disk_k)

        return {"recent": recent, "relevant": relevant}

    def get_formatted_context(self, max_lines: int = 50) -> str:
        """Formatted string of recent messages (for logging/display)."""
        messages = self.get_context()
        lines = []
        for msg in messages:
            role = msg.get("role", "unknown").capitalize()
            content = msg.get("content", "")
            if content:
                lines.append(f"{role}: {content[:200]}")
        if len(lines) > max_lines:
            lines = lines[-max_lines:]
        return "\n".join(lines)

    # ── Flush / evict ────────────────────────────────────────────────────

    def flush_to_disk(self) -> bool:
        """Manually flush the hot window to disk and clear Redis."""
        if not self._redis:
            return True
        try:
            _migrate_to_disk(self.session_id, self._redis)
            return True
        except Exception as e:
            logger.error(
                f"[HybridCache] session={self.session_id} flush_to_disk failed: {e}"
            )
            return False

    def clear(self) -> bool:
        """Clear Redis hot window for this session (disk is preserved)."""
        try:
            if self._redis:
                ctx_key = self._ctx_key
                order_key = self._order_key
                msg_ids = self._redis.lrange(order_key, 0, -1)
                pipe = self._redis.pipeline()
                for mid in msg_ids:
                    mid_str = mid.decode() if isinstance(mid, bytes) else mid
                    pipe.delete(f"{ctx_key}:{mid_str}")
                pipe.delete(order_key)
                pipe.execute()
            logger.info(
                f"[HybridCache] session={self.session_id} Redis hot window cleared"
            )
            return True
        except Exception as e:
            logger.warning(
                f"[HybridCache] session={self.session_id} clear failed: {e}"
            )
            return False

    def delete_session(self) -> bool:
        """Remove all data for this session (Redis + disk)."""
        self.clear()
        return self.archive.delete_session(self.session_id)

    # ── Stats ────────────────────────────────────────────────────────────

    def get_stats(self) -> Dict:
        hot_count = 0
        try:
            if self._redis:
                hot_count = self._redis.llen(self._order_key)
        except Exception:
            pass

        disk_meta = self.archive.get_metadata(self.session_id) or {}
        return {
            "session_id": self.session_id,
            "hot_messages": hot_count,
            "hot_window_size": self.hot_window_size,
            "disk_turns": disk_meta.get("num_turns", 0),
            "disk_size_bytes": disk_meta.get("size_bytes", 0),
            "disk_created_at": disk_meta.get("created_at"),
            "disk_updated_at": disk_meta.get("updated_at"),
        }
