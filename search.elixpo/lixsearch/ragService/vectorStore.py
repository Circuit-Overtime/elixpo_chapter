"""Qdrant-backed vector storage shared by all lixSearch workers."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import threading
import time
import uuid
from typing import Dict, List

from loguru import logger
import numpy as np
from qdrant_client import QdrantClient, models
import torch

from pipeline.config import (
    EMBEDDING_DIMENSION, QDRANT_ALWAYS_RAM, QDRANT_API_KEY, QDRANT_COLLECTION,
    QDRANT_MODE, QDRANT_ON_DISK, QDRANT_PATH, QDRANT_QUANTILE,
    QDRANT_TIMEOUT, QDRANT_URL, VECTOR_DB_MAX_RETRIES, VECTOR_DB_RETRY_DELAY,
)


class VectorStore:
    """Lightweight client for the shared Qdrant collection."""
    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls, embedding_dim: int | None = None, embeddings_dir: str = "./data/embeddings"):
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, embedding_dim: int | None = None, embeddings_dir: str = "./data/embeddings"):
        if self._initialized:
            return
        self.embedding_dim = embedding_dim or EMBEDDING_DIMENSION
        self.embeddings_dir = embeddings_dir
        self.collection_name = QDRANT_COLLECTION
        self.client: QdrantClient | None = None
        self.chunk_count = 0
        self.lock = threading.RLock()
        self._ready = False
        try:
            self._initialize_client()
        except Exception as exc:
            logger.warning("[VectorStore] Qdrant unavailable at startup; retrying lazily: {}", exc)
        self._initialized = True

    def _initialize_client(self) -> None:
        if QDRANT_MODE == "local":
            Path(QDRANT_PATH).mkdir(parents=True, exist_ok=True)
            self.client = QdrantClient(path=QDRANT_PATH)
            endpoint = f"local:{QDRANT_PATH}"
        else:
            self.client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=QDRANT_TIMEOUT)
            endpoint = QDRANT_URL

        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=self.embedding_dim, distance=models.Distance.COSINE, on_disk=QDRANT_ON_DISK,
                ),
                hnsw_config=models.HnswConfigDiff(on_disk=QDRANT_ON_DISK),
                quantization_config=models.ScalarQuantization(
                    scalar=models.ScalarQuantizationConfig(
                        type=models.ScalarType.INT8,
                        quantile=QDRANT_QUANTILE,
                        always_ram=QDRANT_ALWAYS_RAM,
                    )
                ),
            )
            logger.info("[VectorStore] Created {} (dim={}, disk={}, scalar-int8=true)", self.collection_name, self.embedding_dim, QDRANT_ON_DISK)

        self.chunk_count = self.client.count(collection_name=self.collection_name, exact=True).count
        self._ready = True
        logger.info("[VectorStore] Qdrant ready at {} with {} points", endpoint, self.chunk_count)

    def _ensure_ready(self) -> bool:
        if self._ready:
            return True
        for attempt in range(1, VECTOR_DB_MAX_RETRIES + 1):
            try:
                self._initialize_client()
                return True
            except Exception as exc:
                logger.warning("[VectorStore] Qdrant attempt {}/{} failed: {}", attempt, VECTOR_DB_MAX_RETRIES, exc)
                if attempt < VECTOR_DB_MAX_RETRIES:
                    time.sleep(VECTOR_DB_RETRY_DELAY)
        return False

    @staticmethod
    def _normalize(vector) -> List[float]:
        if isinstance(vector, torch.Tensor):
            vector = vector.detach().cpu().numpy()
        array = np.asarray(vector, dtype=np.float32)
        return (array / (np.linalg.norm(array) + 1e-8)).tolist()

    def add_chunks(self, chunks: List[Dict]) -> None:
        if not chunks or not self._ensure_ready():
            return
        with self.lock:
            points = []
            for chunk in chunks:
                point_id = str(uuid.uuid4())
                points.append(models.PointStruct(
                    id=point_id,
                    vector=self._normalize(chunk["embedding"]),
                    payload={
                        "text": chunk["text"],
                        "url": chunk["url"],
                        "chunk_id": str(chunk.get("chunk_id", point_id)),
                        "timestamp": chunk.get("timestamp", datetime.now().isoformat()),
                    },
                ))
            self.client.upsert(collection_name=self.collection_name, points=points, wait=True)
            self.chunk_count = self.client.count(collection_name=self.collection_name, exact=True).count

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
        if not self._ensure_ready() or self.chunk_count == 0:
            return []
        with self.lock:
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=self._normalize(query_embedding),
                limit=min(top_k, self.chunk_count),
                with_payload=True,
                search_params=models.SearchParams(
                    quantization=models.QuantizationSearchParams(rescore=True)
                ),
            )
            return [
                {"score": float(point.score), "metadata": dict(point.payload or {})}
                for point in response.points
            ]

    def persist_to_disk(self) -> None:
        return  # acknowledged Qdrant upserts are already durable

    def health_check(self) -> bool:
        try:
            return bool(self.client and self.client.collection_exists(self.collection_name))
        except Exception:
            return False

    def close(self) -> None:
        with self.lock:
            if self.client is not None:
                self.client.close()
            self.client = None
            self._ready = False

    def reconnect(self) -> None:
        with self.lock:
            if self.client is not None:
                self.client.close()
            self.client = None
            self._ready = False
            self._initialize_client()

    def get_stats(self) -> Dict:
        with self.lock:
            if self._ensure_ready():
                self.chunk_count = self.client.count(collection_name=self.collection_name, exact=True).count
            return {
                "total_chunks": self.chunk_count,
                "embedding_dim": self.embedding_dim,
                "backend": "qdrant",
                "mode": QDRANT_MODE,
                "collection": self.collection_name,
                "on_disk": QDRANT_ON_DISK,
                "quantization": "scalar-int8",
                "healthy": self.health_check(),
            }

    def search_with_cache_check(self, query_embedding: np.ndarray, top_k: int = 5, cache_similarity_threshold: float = 0.85) -> Dict:
        results = self.search(query_embedding, top_k=top_k)
        similarities = [item["score"] for item in results]
        best = similarities[0] if similarities else 0.0
        return {
            "results": results,
            "cache_hit": best >= cache_similarity_threshold,
            "avg_similarity": sum(similarities) / len(similarities) if similarities else 0.0,
            "best_match_similarity": best,
        }
