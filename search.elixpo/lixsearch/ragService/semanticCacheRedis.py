import hashlib
import threading
import time
from typing import Dict, Optional, List, Tuple, Any
from loguru import logger
import numpy as np
import json
from datetime import datetime

# Import centralized config
from pipeline.config import (
    SEMANTIC_CACHE_REDIS_HOST,
    SEMANTIC_CACHE_REDIS_PORT,
    SEMANTIC_CACHE_REDIS_DB,
    SEMANTIC_CACHE_REDIS_TTL_SECONDS,
    SEMANTIC_CACHE_REDIS_SIMILARITY_THRESHOLD,
    SEMANTIC_CACHE_REDIS_MAX_ITEMS_PER_URL,
    SEMANTIC_CACHE_REDIS_POOL_SIZE,
    URL_EMBEDDING_CACHE_REDIS_DB,
    URL_EMBEDDING_CACHE_TTL_SECONDS,
    URL_EMBEDDING_CACHE_BATCH_SIZE,
    SESSION_CONTEXT_WINDOW_REDIS_DB,
    SESSION_CONTEXT_WINDOW_TTL_SECONDS,
    SESSION_CONTEXT_WINDOW_SIZE,
    SESSION_CONTEXT_WINDOW_MAX_TOKENS,
    REDIS_SOCKET_CONNECT_TIMEOUT,
    REDIS_SOCKET_KEEPALIVE,
    REDIS_KEY_PREFIX,
    REDIS_PASSWORD,
    create_redis_client,
)

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.error("[semanticCacheRedis] Redis not available - Redis is REQUIRED for optimized caching")


class URLEmbeddingCache:
    """
    Persistent URL embedding cache (24h TTL).
    Stores single embedding per URL, reused across all sessions.
    Default: Redis DB 1
    """
    
    def __init__(
        self,
        session_id: str,
        ttl_seconds: int = URL_EMBEDDING_CACHE_TTL_SECONDS,
        redis_host: str = SEMANTIC_CACHE_REDIS_HOST,
        redis_port: int = SEMANTIC_CACHE_REDIS_PORT,
        redis_db: int = URL_EMBEDDING_CACHE_REDIS_DB,
        batch_size: int = URL_EMBEDDING_CACHE_BATCH_SIZE
    ):
        self.session_id = session_id
        self.ttl_seconds = ttl_seconds
        self.batch_size = batch_size
        self.redis_client = None
        self.lock = threading.RLock()
        
        if not REDIS_AVAILABLE:
            raise RuntimeError("[semanticCacheRedis.URLEmbeddingCache] Redis is required but not installed")

        try:
            self.redis_client = create_redis_client(host=redis_host, port=redis_port, db=redis_db)
            logger.debug(f"[semanticCacheRedis.URLEmbeddingCache] session={session_id} ready (db={redis_db})")
        except Exception as e:
            logger.error(f"[semanticCacheRedis.URLEmbeddingCache] session={session_id} Failed to connect: {e}")
            raise
    
    def _get_key(self, url: str) -> str:
        """Generate Redis key: url_embedding:URL_HASH"""
        return f"{REDIS_KEY_PREFIX}:url_embedding:{url}"
    
    def get(self, url: str) -> Optional[np.ndarray]:
        """Retrieve cached URL embedding"""
        with self.lock:
            try:
                key = self._get_key(url)
                cached = self.redis_client.get(key)
                if cached:
                    embedding = np.frombuffer(cached, dtype=np.float32)
                    logger.debug(f"[semanticCacheRedis.URLEmbeddingCache] session={self.session_id} HIT: {url}")
                    return embedding
                return None
            except Exception as e:
                logger.warning(f"[semanticCacheRedis.URLEmbeddingCache] session={self.session_id} Get error for {url}: {e}")
                return None
    
    def set(self, url: str, embedding: np.ndarray) -> bool:
        """Store URL embedding with TTL"""
        with self.lock:
            try:
                key = self._get_key(url)
                if isinstance(embedding, np.ndarray):
                    embedding_bytes = embedding.astype(np.float32).tobytes()
                else:
                    embedding = np.array(embedding, dtype=np.float32)
                    embedding_bytes = embedding.tobytes()
                
                self.redis_client.setex(key, self.ttl_seconds, embedding_bytes)
                logger.debug(f"[semanticCacheRedis.URLEmbeddingCache] session={self.session_id} STORED: {url}")
                return True
            except Exception as e:
                logger.warning(f"[semanticCacheRedis.URLEmbeddingCache] session={self.session_id} Set error for {url}: {e}")
                return False
    
    def batch_set(self, url_embeddings: Dict[str, np.ndarray]) -> Dict[str, bool]:
        """Store multiple embeddings efficiently"""
        results = {}
        with self.lock:
            for url, embedding in url_embeddings.items():
                results[url] = self.set(url, embedding)
        return results
    
    def get_stats(self) -> Dict:
        try:
            info = self.redis_client.info("memory")
            return {
                "backend": "redis",
                "session_id": self.session_id,
                "redis_memory_used": info.get("used_memory_human", "unknown"),
                "ttl_seconds": self.ttl_seconds,
                "batch_size": self.batch_size
            }
        except Exception as e:
            logger.warning(f"[semanticCacheRedis.URLEmbeddingCache] session={self.session_id} Failed to get stats: {e}")
            return {"backend": "redis", "status": "error"}


class SessionContextWindow:
    """
    Per-session conversation context window backed by HybridConversationCache.

    Tier 1 (hot):  Redis – recent messages, <50ms latency
    Tier 2 (cold): Disk  – full history, Huffman-compressed, 30-day TTL

    LRU eviction: sessions inactive for SESSION_LRU_EVICT_AFTER_MINUTES are
    automatically migrated from Redis to disk by a background daemon thread.

    smart_context(): returns recent hot messages + semantically relevant disk
    turns for long conversations that exceed the context window.
    """

    def __init__(
        self,
        session_id: str,
        window_size: int = SESSION_CONTEXT_WINDOW_SIZE,
        ttl_seconds: int = SESSION_CONTEXT_WINDOW_TTL_SECONDS,
        max_tokens: Optional[int] = SESSION_CONTEXT_WINDOW_MAX_TOKENS,
        redis_host: str = SEMANTIC_CACHE_REDIS_HOST,
        redis_port: int = SEMANTIC_CACHE_REDIS_PORT,
        redis_db: int = SESSION_CONTEXT_WINDOW_REDIS_DB,
    ):
        self.session_id = session_id
        self.window_size = window_size
        self.ttl_seconds = ttl_seconds
        self.max_tokens = max_tokens

        from sessions.hybrid_conversation_cache import HybridConversationCache
        self._hybrid = HybridConversationCache(
            session_id=session_id,
            redis_host=redis_host,
            redis_port=redis_port,
            redis_db=redis_db,
            hot_window_size=window_size,
            redis_ttl=ttl_seconds,
        )
        logger.info(
            f"[SessionContextWindow] session={session_id} initialized via HybridCache "
            f"(hot_window={window_size}, ttl={ttl_seconds}s, max_tokens={max_tokens})"
        )

    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None) -> int:
        """Add message to hot window. Returns current hot window size."""
        return self._hybrid.add_message(role, content, metadata)

    def get_context(self) -> List[Dict]:
        """Retrieve recent messages from hot window (chronological order)."""
        return self._hybrid.get_context()

    def get_full_history(self) -> List[Dict]:
        """Retrieve complete conversation history (Redis hot + disk cold)."""
        return self._hybrid.get_full()

    def smart_context(self, query: str, query_embedding=None, recent_k: int = 10, disk_k: int = 5) -> Dict:
        """
        Intelligent context for long conversations.
        Returns {"recent": [...], "relevant": [...]} where:
          - recent: last recent_k messages from hot window
          - relevant: semantically matching turns from disk (lazy, on-demand)
        """
        return self._hybrid.smart_context(query, query_embedding, recent_k, disk_k)

    def get_formatted_context(self, max_lines: int = 50) -> str:
        """Formatted string of recent messages."""
        return self._hybrid.get_formatted_context(max_lines)

    def clear(self) -> bool:
        """Clear hot window (disk archive preserved)."""
        return self._hybrid.clear()

    def flush_to_disk(self) -> bool:
        """Explicitly flush hot window to disk."""
        return self._hybrid.flush_to_disk()

    def get_stats(self) -> Dict:
        """Get hybrid cache statistics."""
        stats = self._hybrid.get_stats()
        stats["ttl_seconds"] = self.ttl_seconds
        stats["max_tokens"] = self.max_tokens
        return stats


class SemanticCacheRedis:
    """
    Semantic query cache per sessionID (short-lived, 5min TTL).
    Stores URL + query_embedding → retrieval results.
    Key format: semantic_cache:SESSION_ID:URL
    Ensures each session can scale independently.
    Default: Redis DB 0, TTL 300s, similarity 0.90, max 50 queries/URL
    """
    
    def __init__(
        self, 
        session_id: str,
        ttl_seconds: int = SEMANTIC_CACHE_REDIS_TTL_SECONDS, 
        similarity_threshold: float = SEMANTIC_CACHE_REDIS_SIMILARITY_THRESHOLD,
        max_items_per_url: int = SEMANTIC_CACHE_REDIS_MAX_ITEMS_PER_URL,
        redis_host: str = SEMANTIC_CACHE_REDIS_HOST,
        redis_port: int = SEMANTIC_CACHE_REDIS_PORT,
        redis_db: int = SEMANTIC_CACHE_REDIS_DB
    ):
        self.session_id = session_id
        self.ttl_seconds = ttl_seconds
        self.similarity_threshold = similarity_threshold
        self.max_items_per_url = max_items_per_url
        self.redis_client = None
        self.lock = threading.RLock()
        
        if not REDIS_AVAILABLE:
            logger.error("[semanticCacheRedis.SemanticCacheRedis] Redis is REQUIRED but not installed")
            raise RuntimeError("Redis installation is required for semantic caching")

        try:
            self.redis_client = create_redis_client(host=redis_host, port=redis_port, db=redis_db)
            logger.debug(f"[semanticCacheRedis.SemanticCacheRedis] session={session_id} ready (db={redis_db})")
        except Exception as e:
            logger.error(f"[semanticCacheRedis.SemanticCacheRedis] session={session_id} Failed to connect: {e}")
            raise
    
    def _get_redis_key(self, url: str) -> str:
        """Redis key: semantic_cache:SESSION_ID:URL"""
        return f"{REDIS_KEY_PREFIX}:semantic_cache:{self.session_id}:{url}"
    
    def get(self, url: str, query_embedding: np.ndarray) -> Optional[Dict]:
        """
        Get cached semantic response for URL + query.
        Returns closest matching response if similarity >= threshold.
        """
        with self.lock:
            try:
                redis_key = self._get_redis_key(url)
                cached_data = self.redis_client.get(redis_key)
                
                if not cached_data:
                    logger.debug(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} MISS: {url}")
                    return None
                
                cache_entry = json.loads(cached_data)
                best_match = None
                best_similarity = 0.0
                
                query_emb = np.array(query_embedding, dtype=np.float32)
                query_emb = query_emb / (np.linalg.norm(query_emb) + 1e-8)
                
                for cached_item in cache_entry.get("items", []):
                    cached_emb = np.array(cached_item["embedding"], dtype=np.float32)
                    cached_emb = cached_emb / (np.linalg.norm(cached_emb) + 1e-8)
                    similarity = float(np.dot(cached_emb, query_emb))
                    
                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_match = cached_item
                
                if best_similarity >= self.similarity_threshold and best_match:
                    logger.debug(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} HIT: {url} (similarity: {best_similarity:.3f})")
                    return best_match["response"]
                
                logger.debug(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} LOW SIMILARITY: {url} ({best_similarity:.3f} < {self.similarity_threshold})")
                return None
            except Exception as e:
                logger.warning(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} Get error for {url}: {e}")
                return None
    
    def set(self, url: str, query_embedding: np.ndarray, response: Dict) -> None:
        """
        Store semantic response for URL + query embedding.
        Maintains max_items_per_url recent queries.
        """
        with self.lock:
            try:
                redis_key = self._get_redis_key(url)
                
                cached_data = self.redis_client.get(redis_key)
                if cached_data:
                    cache_entry = json.loads(cached_data)
                else:
                    cache_entry = {"items": []}
                
                cache_entry["items"].append({
                    "embedding": query_embedding.tolist() if isinstance(query_embedding, np.ndarray) else query_embedding,
                    "response": response,
                    "timestamp": time.time()
                })
                
                if len(cache_entry["items"]) > self.max_items_per_url:
                    cache_entry["items"] = cache_entry["items"][-self.max_items_per_url:]
                
                self.redis_client.setex(
                    redis_key,
                    self.ttl_seconds,
                    json.dumps(cache_entry).encode("utf-8")
                )
                logger.debug(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} STORED: {url} ({len(cache_entry['items'])}/{self.max_items_per_url})")
            except Exception as e:
                logger.warning(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} Set error: {e}")
    
    def clear_session(self) -> bool:
        """Clear all semantic cache entries for this session"""
        with self.lock:
            try:
                pattern = f"{REDIS_KEY_PREFIX}:semantic_cache:{self.session_id}:*"
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                    logger.info(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} Cleared {len(keys)} entries")
                return True
            except Exception as e:
                logger.warning(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} Failed to clear: {e}")
                return False
    
    def get_stats(self) -> Dict:
        """Get cache statistics for this session"""
        try:
            info = self.redis_client.info("memory")
            pattern = f"{REDIS_KEY_PREFIX}:semantic_cache:{self.session_id}:*"
            keys = self.redis_client.keys(pattern)
            
            return {
                "backend": "redis",
                "session_id": self.session_id,
                "cached_urls": len(keys),
                "redis_memory_used": info.get("used_memory_human", "unknown"),
                "ttl_seconds": self.ttl_seconds,
                "similarity_threshold": self.similarity_threshold,
                "max_items_per_url": self.max_items_per_url
            }
        except Exception as e:
            logger.warning(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} Failed to get stats: {e}")
            return {"session_id": self.session_id, "status": "error"}
    
    def load_for_request(self, request_id: str) -> None:
        """Legacy method: No-op (Redis backend handles persistence automatically)"""
        logger.debug(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} load_for_request({request_id}) is no-op (Redis persistent)")
    
    def save_for_request(self, request_id: str) -> None:
        """Legacy method: No-op (Redis backend handles persistence automatically via TTL)"""
        logger.debug(f"[semanticCacheRedis.SemanticCacheRedis] session={self.session_id} save_for_request({request_id}) is no-op (Redis persistent)")


# Backwards compatibility alias
