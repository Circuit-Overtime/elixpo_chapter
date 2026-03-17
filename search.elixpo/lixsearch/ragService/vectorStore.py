from loguru import logger 
import torch
import chromadb
from pathlib import Path
import threading
import numpy as np
from pipeline.config import EMBEDDING_DIMENSION, CHROMA_API_IMPL, CHROMA_SERVER_HOST, CHROMA_SERVER_PORT
from typing import List, Dict
from datetime import datetime
import os
import time
from chromadb.telemetry.product import ProductTelemetryClient, ProductTelemetryEvent
from overrides import override


class NoOpProductTelemetry(ProductTelemetryClient):
    @override
    def capture(self, event: ProductTelemetryEvent) -> None:
        return


class VectorStore:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, embedding_dim: int = None, embeddings_dir: str = "./data/embeddings"):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, embedding_dim: int = None, embeddings_dir: str = "./data/embeddings"):
        if self._initialized:
            return
        
        if embedding_dim is None:
            embedding_dim = EMBEDDING_DIMENSION
        self.embedding_dim = embedding_dim
        self.embeddings_dir = embeddings_dir
        self.device = self._select_device()
        
        self.client = None
        self.collection = None
        self.chunk_count = 0
        self.lock = threading.RLock()
        self.metadata_path = os.path.join(embeddings_dir, "metadata.json")

        # HTTP Client connection pooling
        self._http_session = None
        self._connection_retries = 0
        self._max_connection_retries = 3
        self._chroma_ready = False

        try:
            self._initialize_chroma_client()
            self._load_from_disk()
            self._chroma_ready = True
        except Exception as e:
            logger.warning(f"[VectorStore] Chroma unavailable at startup, will retry lazily: {e}")

        self._initialized = True
        logger.info(f"[VectorStore] Initialized with {self.chunk_count} chunks on {self.device} "
                   f"(chroma_ready={self._chroma_ready})")
    
    
    @staticmethod
    def _select_device() -> str:
        """
        Select the best available device for vector operations.
        Tries CUDA first, then falls back to CPU with proper error handling.
        """
        try:
            if torch.cuda.is_available():
                device_count = torch.cuda.device_count()
                device_name = torch.cuda.get_device_name(0)
                logger.info(f"[VectorStore] CUDA available: {device_count} device(s), using '{device_name}'")
                return "cuda"
        except Exception as e:
            logger.warning(f"[VectorStore] CUDA availability check failed: {e}")
        
        try:
            if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                logger.info(f"[VectorStore] Apple MPS available")
                return "mps"
        except Exception as e:
            logger.debug(f"[VectorStore] MPS check failed: {e}")
        
        logger.info("[VectorStore] Using CPU for vector operations")
        return "cpu"
    
    def _initialize_chroma_client(self) -> None:
        try:
            from pipeline.config import CHROMA_API_IMPL, CHROMA_SERVER_HOST, CHROMA_SERVER_PORT, VECTOR_DB_POOL_SIZE
            
            # Default to HTTP client for production (shared across workers)
            chroma_impl = CHROMA_API_IMPL or "http"
            
            if chroma_impl == "http":
                logger.info(f"[VectorStore] Initializing HTTP Chroma client at {CHROMA_SERVER_HOST}:{CHROMA_SERVER_PORT}")
                
                # Create HTTP client with connection pooling
                max_retries = 5
                retry_delay = 3
                for attempt in range(1, max_retries + 1):
                    try:
                        self.client = chromadb.HttpClient(
                            host=CHROMA_SERVER_HOST,
                            port=CHROMA_SERVER_PORT,
                            ssl=False,
                            headers={}
                        )
                        heartbeat = self.client.heartbeat()
                        logger.info(f"[VectorStore] Connected to Chroma HTTP server at {CHROMA_SERVER_HOST}:{CHROMA_SERVER_PORT}")
                        logger.debug(f"[VectorStore] Heartbeat: {heartbeat}")
                        break
                    except Exception as e:
                        logger.error(f"[VectorStore] Chroma connection attempt {attempt}/{max_retries} failed: {e}")
                        if attempt < max_retries:
                            logger.info(f"[VectorStore] Retrying in {retry_delay}s...")
                            time.sleep(retry_delay)
                        else:
                            raise RuntimeError(f"Could not connect to Chroma at {CHROMA_SERVER_HOST}:{CHROMA_SERVER_PORT} after {max_retries} attempts")
                    
            else:
                # Fallback to embedded for backward compatibility (NOT RECOMMENDED for production)
                Path(self.embeddings_dir).mkdir(parents=True, exist_ok=True)
                logger.warning(f"[VectorStore] Using embedded Chroma (NOT recommended for multi-worker deployments)")
                self.client = chromadb.PersistentClient(path=self.embeddings_dir)
                logger.info(f"[VectorStore] Embedded Chroma initialized at {self.embeddings_dir}")
            
            # Get or create collection (HTTP client supports this)
            self.collection = self.client.get_or_create_collection(
                name="document_embeddings",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"[VectorStore] Collection obtained successfully (pool_size={VECTOR_DB_POOL_SIZE})")
            
        except Exception as e:
            logger.error(f"[VectorStore] Failed to initialize Chroma: {e}")
            raise
    
    def _ensure_chroma(self) -> bool:
        """Lazily connect to Chroma if not yet ready. Returns True if ready."""
        if self._chroma_ready:
            return True
        try:
            self._initialize_chroma_client()
            self._load_from_disk()
            self._chroma_ready = True
            logger.info("[VectorStore] Chroma connected on lazy retry")
            return True
        except Exception as e:
            logger.debug(f"[VectorStore] Chroma still unavailable: {e}")
            return False

    def add_chunks(self, chunks: List[Dict]) -> None:
        if not self._ensure_chroma():
            logger.warning("[VectorStore] Skipping add_chunks — Chroma not available")
            return
        with self.lock:
            ids = []
            embeddings = []
            documents = []
            metadatas = []
            
            for i, chunk in enumerate(chunks):
                emb = chunk["embedding"]
                if isinstance(emb, list):
                    emb = np.array(emb, dtype=np.float32)
                elif isinstance(emb, torch.Tensor):
                    emb = emb.cpu().numpy().astype(np.float32)
                else:
                    emb = np.array(emb, dtype=np.float32)
                
                emb = emb / (np.linalg.norm(emb) + 1e-8)
                
                chunk_id = str(self.chunk_count + i)
                ids.append(chunk_id)
                embeddings.append(emb.tolist())
                documents.append(chunk["text"])
                metadatas.append({
                    "url": chunk["url"],
                    "chunk_id": chunk.get("chunk_id", chunk_id),
                    "timestamp": chunk.get("timestamp", datetime.now().isoformat())
                })
                self.chunk_count += 1
            
            if ids:
                batch_size = 100
                for i in range(0, len(ids), batch_size):
                    batch_end = min(i + batch_size, len(ids))
                    try:
                        self.collection.add(
                            ids=ids[i:batch_end],
                            embeddings=embeddings[i:batch_end],
                            documents=documents[i:batch_end],
                            metadatas=metadatas[i:batch_end]
                        )
                        logger.debug(f"[VectorStore] Added batch {i//batch_size + 1} ({batch_end - i} embeddings)")
                        time.sleep(0.05)
                    except Exception as e:
                        logger.error(f"[VectorStore] Failed to add batch: {e}")
                        raise
    
    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
        if not self._ensure_chroma():
            logger.warning("[VectorStore] Skipping search — Chroma not available")
            return []
        with self.lock:
            if isinstance(query_embedding, torch.Tensor):
                query_embedding = query_embedding.cpu().numpy().astype(np.float32)
            else:
                query_embedding = np.array(query_embedding, dtype=np.float32)
            
            query_embedding = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
            
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    results = self.collection.query(
                        query_embeddings=[query_embedding.tolist()],
                        n_results=min(top_k, self.chunk_count if self.chunk_count > 0 else 1)
                    )
                    
                    output = []
                    if results["ids"] and len(results["ids"]) > 0:
                        for i, (doc_id, distance, metadata, document) in enumerate(
                            zip(results["ids"][0], 
                                results["distances"][0], 
                                results["metadatas"][0], 
                                results["documents"][0])
                        ):
                            output.append({
                                "score": float(1 - distance),
                                "metadata": {
                                    **metadata,
                                    "text": document
                                }
                            })
                    
                    return output
                
                except Exception as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"[VectorStore] Query failed on attempt {attempt + 1}, retrying: {e}")
                        time.sleep(1)
                    else:
                        logger.error(f"[VectorStore] Query failed after {max_retries} attempts: {e}")
                        raise
    
    def persist_to_disk(self) -> None:
        with self.lock:
            try:
                logger.info(f"[VectorStore] Data will be persisted by embedded Chroma to {self.embeddings_dir}")
            except Exception as e:
                logger.error(f"[VectorStore] Persist check failed: {e}")
    
    def _load_from_disk(self) -> None:
        try:
            count = self.collection.count()
            self.chunk_count = count
            if count > 0:
                logger.info(f"[VectorStore] Loaded {count} chunks from vector store")
        except Exception as e:
            logger.warning(f"[VectorStore] Could not load from vector store: {e}")
            self.chunk_count = 0
    
    def health_check(self) -> bool:
        try:
            if self.client and self.collection:
                self.collection.count()
                return True
        except Exception as e:
            logger.warning(f"[VectorStore] Health check failed: {e}")
            return False
        return False
    
    def reconnect(self) -> None:
        with self.lock:
            try:
                logger.info("[VectorStore] Attempting to reconnect to vector store...")
                self._initialize_chroma_client()
                logger.info("[VectorStore] Reconnected successfully")
            except Exception as e:
                logger.error(f"[VectorStore] Reconnection failed: {e}")
                raise
    
    def get_stats(self) -> Dict:
        with self.lock:
            stats = {
                "total_chunks": self.chunk_count,
                "device": self.device,
                "embedding_dim": self.embedding_dim,
                "mode": "embedded",
                "path": self.embeddings_dir,
                "healthy": self.health_check()
            }
            
            return stats
    
    def search_with_cache_check(self, query_embedding: np.ndarray, top_k: int = 5, cache_similarity_threshold: float = 0.85) -> Dict:
        if not self._ensure_chroma():
            logger.warning("[VectorStore] Skipping search_with_cache_check — Chroma not available")
            return {'results': [], 'cache_hit': False, 'avg_similarity': 0.0, 'best_match_similarity': 0.0}
        with self.lock:
            if isinstance(query_embedding, torch.Tensor):
                query_embedding = query_embedding.cpu().numpy().astype(np.float32)
            else:
                query_embedding = np.array(query_embedding, dtype=np.float32)
            
            query_embedding = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
            
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    results = self.collection.query(
                        query_embeddings=[query_embedding.tolist()],
                        n_results=min(top_k, self.chunk_count if self.chunk_count > 0 else 1)
                    )
                    
                    output = []
                    similarities = []
                    
                    if results["ids"] and len(results["ids"]) > 0:
                        for i, (doc_id, distance, metadata, document) in enumerate(
                            zip(results["ids"][0], 
                                results["distances"][0], 
                                results["metadatas"][0], 
                                results["documents"][0])
                        ):
                            similarity = float(1 - distance)
                            similarities.append(similarity)
                            output.append({
                                "score": similarity,
                                "metadata": {
                                    **metadata,
                                    "text": document
                                }
                            })
                    
                    best_match_similarity = similarities[0] if similarities else 0.0
                    avg_similarity = sum(similarities) / len(similarities) if similarities else 0.0
                    cache_hit = best_match_similarity >= cache_similarity_threshold
                    
                    return {
                        'results': output,
                        'cache_hit': cache_hit,
                        'avg_similarity': avg_similarity,
                        'best_match_similarity': best_match_similarity
                    }
                
                except Exception as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"[VectorStore] Query failed on attempt {attempt + 1}, retrying: {e}")
                        time.sleep(1)
                    else:
                        logger.error(f"[VectorStore] Query failed after {max_retries} attempts: {e}")
                        raise
