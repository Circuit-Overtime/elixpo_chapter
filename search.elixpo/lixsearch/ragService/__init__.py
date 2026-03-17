"""
RAG Service - OPTIMIZED Redis-only with coordinated caching

Modules:
- embeddingService: Sentence transformer embeddings with device fallback
- vectorStore: Vector database for semantic search
- retrievalPipeline: URL ingestion and chunking
- semanticCacheRedis: Redis-based caches (URL embeddings, semantic responses, session context)
- cacheCoordinator: Orchestrates multiple Redis caches
- ragEngine: Main RAG orchestrator with context window management
"""

from ragService.embeddingService import EmbeddingService
from ragService.vectorStore import VectorStore
from ragService.retrievalPipeline import RetrievalPipeline
from ragService.semanticCacheRedis import (
    SemanticCacheRedis,
    URLEmbeddingCache,
    SessionContextWindow
)
from ragService.cacheCoordinator import CacheCoordinator, BatchCacheProcessor
from ragService.ragEngine import RAGEngine

__all__ = [
    'EmbeddingService',
    'VectorStore',
    'RetrievalPipeline',
    'SemanticCacheRedis',
    'URLEmbeddingCache',
    'SessionContextWindow',
    'CacheCoordinator',
    'BatchCacheProcessor',
    'RAGEngine'
]
