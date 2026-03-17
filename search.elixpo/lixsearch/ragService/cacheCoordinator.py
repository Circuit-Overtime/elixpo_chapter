from typing import Dict, Optional, Tuple
from loguru import logger
import numpy as np
from datetime import datetime

# Import from config
from pipeline.config import (
    SEMANTIC_CACHE_REDIS_HOST,
    SEMANTIC_CACHE_REDIS_PORT,
    SEMANTIC_CACHE_REDIS_DB,
    SEMANTIC_CACHE_REDIS_TTL_SECONDS,
    SEMANTIC_CACHE_REDIS_SIMILARITY_THRESHOLD,
    SEMANTIC_CACHE_REDIS_MAX_ITEMS_PER_URL,
    URL_EMBEDDING_CACHE_REDIS_DB,
    URL_EMBEDDING_CACHE_TTL_SECONDS,
    SESSION_CONTEXT_WINDOW_REDIS_DB,
    SESSION_CONTEXT_WINDOW_TTL_SECONDS,
    SESSION_CONTEXT_WINDOW_SIZE,
)

from ragService.semanticCacheRedis import (
    URLEmbeddingCache,
    SemanticCacheRedis,
    SessionContextWindow
)


class CacheCoordinator:
    """
    Orchestrates per-session caching across three Redis layers:
    
    1. URL Embedding Cache (24h): Single embedding per URL (global, across sessions)
    2. Semantic Query Cache (5m): URL + query → results (per sessionID)
    3. Session Context Window (30m): Conversation history (per sessionID, LRU)
    
    CRITICAL: All operations scoped to sessionID for isolation and scalability.
    """
    
    def __init__(
        self,
        session_id: str,
        redis_host: str = SEMANTIC_CACHE_REDIS_HOST,
        redis_port: int = SEMANTIC_CACHE_REDIS_PORT,
    ):
        self.session_id = session_id

        try:
            # Layer 1: URL embeddings (global, 24h TTL)
            self.url_embedding_cache = URLEmbeddingCache(
                session_id=session_id,
                ttl_seconds=URL_EMBEDDING_CACHE_TTL_SECONDS,
                redis_host=redis_host,
                redis_port=redis_port,
                redis_db=URL_EMBEDDING_CACHE_REDIS_DB
            )

            # Layer 2: Semantic query cache (per session, 5m TTL)
            self.semantic_cache = SemanticCacheRedis(
                session_id=session_id,
                ttl_seconds=SEMANTIC_CACHE_REDIS_TTL_SECONDS,
                similarity_threshold=SEMANTIC_CACHE_REDIS_SIMILARITY_THRESHOLD,
                max_items_per_url=SEMANTIC_CACHE_REDIS_MAX_ITEMS_PER_URL,
                redis_host=redis_host,
                redis_port=redis_port,
                redis_db=SEMANTIC_CACHE_REDIS_DB
            )

            # Layer 3: Session context window (per session, 30m TTL, LRU)
            self.context_window = SessionContextWindow(
                session_id=session_id,
                window_size=SESSION_CONTEXT_WINDOW_SIZE,
                ttl_seconds=SESSION_CONTEXT_WINDOW_TTL_SECONDS,
                redis_host=redis_host,
                redis_port=redis_port,
                redis_db=SESSION_CONTEXT_WINDOW_REDIS_DB
            )

            logger.info(
                f"[CacheCoordinator] session={session_id} initialized with 3-layer Redis caching: "
                f"URLEmbedding(24h), SemanticCache(5m, session-scoped), ContextWindow({SESSION_CONTEXT_WINDOW_SIZE} msgs)"
            )
        except Exception as e:
            logger.error(f"[CacheCoordinator] session={session_id} Initialization failed: {e}")
            raise

    def get_url_embedding(self, url: str) -> Optional[np.ndarray]:
        """Get cached URL embedding (global cache)"""
        return self.url_embedding_cache.get(url)

    def cache_url_embedding(self, url: str, embedding: np.ndarray) -> bool:
        """Store URL embedding (global cache)"""
        return self.url_embedding_cache.set(url, embedding)
    
    def batch_cache_url_embeddings(self, url_embeddings: Dict[str, np.ndarray]) -> Dict[str, bool]:
        """Batch store URL embeddings for efficiency"""
        return self.url_embedding_cache.batch_set(url_embeddings)

    def get_semantic_response(
        self,
        url: str,
        query_embedding: np.ndarray
    ) -> Optional[Dict]:
        """Get cached semantic response for URL + query (session-scoped)"""
        return self.semantic_cache.get(
            url=url,
            query_embedding=query_embedding
        )

    def cache_semantic_response(
        self,
        url: str,
        query_embedding: np.ndarray,
        response: Dict
    ) -> None:
        """Store semantic response for URL + query (session-scoped)"""
        self.semantic_cache.set(
            url=url,
            query_embedding=query_embedding,
            response=response
        )

    def add_message_to_context(
        self,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> int:
        """Add message to session context window. Returns current window size."""
        return self.context_window.add_message(role, content, metadata)

    def get_context_messages(self) -> list:
        """Get all messages in session context window"""
        return self.context_window.get_context()

    def get_formatted_context(self, max_lines: int = 50) -> str:
        """Get formatted context for display/logging"""
        return self.context_window.get_formatted_context(max_lines)
    
    def clear_session_cache(self) -> bool:
        """Clear semantic cache and context window for this session"""
        try:
            cache_cleared = self.semantic_cache.clear_session()
            context_cleared = self.context_window.clear()
            logger.info(f"[CacheCoordinator] session={self.session_id} Cleared session cache: semantic={cache_cleared}, context={context_cleared}")
            return cache_cleared and context_cleared
        except Exception as e:
            logger.warning(f"[CacheCoordinator] session={self.session_id} Failed to clear: {e}")
            return False
    
    def get_stats(self) -> Dict:
        """Get comprehensive cache statistics for this session"""
        return {
            "session_id": self.session_id,
            "url_embedding_cache": self.url_embedding_cache.get_stats(),
            "semantic_cache": self.semantic_cache.get_stats(),
            "context_window": self.context_window.get_stats(),
            "timestamp": datetime.utcnow().isoformat()
        }

    def clear_context(self) -> bool:
        return self.context_window.clear()

    def get_cache_stats(self) -> Dict:
        return {
            "session_id": self.session_id,
            "url_embedding_cache": self.url_embedding_cache.get_stats(),
            "semantic_cache": self.semantic_cache.get_stats(),
            "context_window": self.context_window.get_stats(),
            "timestamp": datetime.now().isoformat()
        }


class BatchCacheProcessor:
    def __init__(self, url_embedding_cache: URLEmbeddingCache):
        self.cache = url_embedding_cache

    def cache_batch(self, url_embedding_pairs: list) -> Dict:
        stats = {
            "total": len(url_embedding_pairs),
            "cached": 0,
            "failed": 0,
            "urls": []
        }

        for url, embedding in url_embedding_pairs:
            try:
                if self.cache.set(url, embedding):
                    stats["cached"] += 1
                else:
                    stats["failed"] += 1
                stats["urls"].append(url)
            except Exception as e:
                logger.warning(f"[BatchCacheProcessor] Failed to cache {url}: {e}")
                stats["failed"] += 1

        logger.info(
            f"[BatchCacheProcessor] Batch complete: "
            f"{stats['cached']} cached, {stats['failed']} failed"
        )
        return stats
