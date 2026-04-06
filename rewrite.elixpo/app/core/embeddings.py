"""Semantic similarity via sentence-transformers (384-dim, CPU)."""

import logging
import numpy as np

from app.core.config import EMBEDDING_MODEL

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    """Lazy-load the sentence-transformer model on first use."""
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", EMBEDDING_MODEL)
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(EMBEDDING_MODEL, device="cpu")
    return _model


def encode(text: str) -> np.ndarray:
    """Encode text into a 384-dim embedding vector."""
    model = _get_model()
    return model.encode(text, convert_to_numpy=True, normalize_embeddings=True)


def similarity(text_a: str, text_b: str) -> float:
    """Compute cosine similarity between two texts. Returns 0.0-1.0."""
    vec_a = encode(text_a)
    vec_b = encode(text_b)
    return float(np.dot(vec_a, vec_b))


def batch_encode(texts: list[str]) -> np.ndarray:
    """Encode a batch of texts. Returns (N, 384) array."""
    model = _get_model()
    return model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
