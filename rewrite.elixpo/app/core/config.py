"""Central configuration — loads from .env and provides defaults."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)


# --- API ---
POLLINATIONS_API_KEY = os.getenv("POLLINATIONS_API_KEY", "")
POLLINATIONS_BASE_URL = "https://gen.pollinations.ai/v1"
DEFAULT_MODEL = "gemini-fast"

# --- LLM ---
LLM_TIMEOUT = 60
LLM_MAX_RETRIES = 3
LLM_RETRY_BASE_DELAY = 1.0  # seconds, exponential backoff

# --- Cloudflare (D1 + KV) ---
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_D1_DATABASE_ID = os.getenv("CLOUDFLARE_D1_DATABASE_ID", "")
CLOUDFLARE_KV_NAMESPACE_ID = os.getenv("CLOUDFLARE_KV_NAMESPACE_ID", "")

# --- Session ---
SESSION_TTL = 3600  # 1 hour

# --- Embeddings ---
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
SIMILARITY_THRESHOLD = 0.85

# --- Detection thresholds ---
SCORE_GREEN = 20
SCORE_YELLOW = 60
SCORE_RED = 60  # above this = red

# --- Ensemble weights (full: LLM judge + linguistic + heuristic) ---
# Calibrated against 10 arXiv human papers vs kimi AI equivalents.
# Only features with positive Cohen's d (AI scores higher than human) get weight.
ENSEMBLE_WEIGHTS = {
    "llm_judge": 0.25,
    # High separation (Cohen's d > 1.0)
    "burstiness": 0.20,       # d=2.01 — strongest signal
    "vocabulary_markers": 0.18, # d=1.81
    "paragraph_structure": 0.12, # d=1.15
    "n_gram_uniformity": 0.10, # d=1.03
    # Moderate separation (Cohen's d 0.5-1.0)
    "repetition": 0.10,       # d=0.95
    # Weak separation (Cohen's d < 0.5)
    "punctuation_diversity": 0.05, # d=0.46
    # Zero weight — inverted or no separation on research papers
    "perplexity": 0.0,
    "coherence": 0.0,
    "readability": 0.0,
    "entropy": 0.0,
    "type_token_ratio": 0.0,
    "sentence_starters": 0.0,
}

# --- Fallback weights (no LLM judge) ---
# Calibrated: redistribute LLM judge weight proportionally.
HEURISTIC_WEIGHTS = {
    "burstiness": 0.27,
    "vocabulary_markers": 0.24,
    "paragraph_structure": 0.155,
    "n_gram_uniformity": 0.14,
    "repetition": 0.13,
    "punctuation_diversity": 0.065,
    # Zero-weighted (inverted on research papers)
    "perplexity": 0.0,
    "coherence": 0.0,
    "readability": 0.0,
    "entropy": 0.0,
    "type_token_ratio": 0.0,
    "sentence_starters": 0.0,
}

# --- Paraphrase ---
PARAPHRASE_TARGET_SCORE = 20  # rewrite segments above this
PARAPHRASE_MAX_RETRIES = 3
PARAPHRASE_INTENSITIES = {
    "light": 0.5,
    "medium": 0.6,
    "aggressive": 0.7,
}

# --- Segmentation ---
SEGMENT_TARGET_WORDS = 150
