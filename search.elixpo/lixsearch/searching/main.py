from typing import List
from pipeline.config import  RETRIEVAL_TOP_K
from loguru import logger
from ragService.vectorStore import VectorStore
from ragService.retrievalPipeline import RetrievalPipeline
from typing import Dict

__all__ = ['fetch_full_text', 'playwright_web_search', 'warmup_playwright', 'ingest_url_to_vector_store', 'retrieve_from_vector_store']

_global_embedding_service = None
_global_vector_store = None
_global_retrieval_pipeline = None


def _ensure_retrieval_services():
    global _global_embedding_service, _global_vector_store, _global_retrieval_pipeline
    
    if _global_embedding_service is None:
        try:
            from ragService.embeddingService import EmbeddingService
            from pipeline.config import EMBEDDING_MODEL, EMBEDDINGS_DIR
            
            logger.info("[SEARCH] Initializing retrieval services...")
            _global_embedding_service = EmbeddingService(model_name=EMBEDDING_MODEL)
            _global_vector_store = VectorStore(embeddings_dir=EMBEDDINGS_DIR)
            _global_retrieval_pipeline = RetrievalPipeline(
                _global_embedding_service,
                _global_vector_store
            )
            logger.info("[SEARCH] Retrieval services initialized")
        except Exception as e:
            logger.error(f"[SEARCH] Failed to initialize retrieval services: {e}")
            raise


def ingest_url_to_vector_store(url: str) -> Dict:
    try:
        from ipcService.coreServiceManager import get_core_embedding_service
        core_service = get_core_embedding_service()
        ingest_result = core_service.ingest_url(url)
        logger.info(f"[SEARCH] Ingested URL {url} via IPC: {ingest_result}")
        return ingest_result
    except Exception as e:
        logger.error(f"[SEARCH] Failed to ingest URL {url} via IPC: {e}")
        logger.warning("[SEARCH] IPC service unavailable, skipping vector store ingestion")
        return {
            "success": False,
            "url": url,
            "error": str(e)
        }


def retrieve_from_vector_store(query: str, top_k: int = RETRIEVAL_TOP_K) -> List[Dict]:
    try:
        from ipcService.coreServiceManager import get_core_embedding_service
        core_service = get_core_embedding_service()
        results = core_service.retrieve(query, top_k=top_k)
        logger.info(f"[SEARCH] Retrieved {len(results)} results via IPC")
        return results
    except Exception as e:
        logger.error(f"[SEARCH] Failed to retrieve via IPC: {e}")
        logger.warning("[SEARCH] IPC service unavailable, returning empty results")
        return []


def get_vector_store_stats() -> Dict:
    _ensure_retrieval_services()
    return _global_vector_store.get_stats()


def persist_vector_store() -> None:
    _ensure_retrieval_services()
    _global_vector_store.persist_to_disk()

