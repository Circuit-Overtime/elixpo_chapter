"""Pydantic models for API request/response validation."""

from pydantic import BaseModel, Field
from enum import Enum


class Domain(str, Enum):
    general = "general"
    cs = "cs"
    medicine = "medicine"
    law = "law"
    humanities = "humanities"


class Intensity(str, Enum):
    light = "light"
    medium = "medium"
    aggressive = "aggressive"


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


# --- Detection ---

class DetectTextRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=100_000)
    use_llm_judge: bool = Field(True, description="Include LLM judge in scoring")
    segments: bool = Field(False, description="Return per-segment scores")


class FeatureScores(BaseModel):
    burstiness: float = 0
    vocabulary_markers: float = 0
    paragraph_structure: float = 0
    n_gram_uniformity: float = 0
    repetition: float = 0
    punctuation_diversity: float = 0
    perplexity: float = 0
    coherence: float = 0
    readability: float = 0
    entropy: float = 0
    type_token_ratio: float = 0
    sentence_starters: float = 0
    llm_judge: float = 0


class SegmentScore(BaseModel):
    index: int
    text: str
    score: float
    verdict: str


class DetectResponse(BaseModel):
    score: float
    verdict: str
    features: dict = {}
    segments: list[SegmentScore] = []


# --- Paraphrase ---

class ParaphraseTextRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=100_000)
    intensity: Intensity = Intensity.aggressive
    domain: Domain = Domain.general


class ParaphraseResponse(BaseModel):
    job_id: str  # This is the session_id — store in localStorage for resume


# --- Jobs ---

class ParagraphProgress(BaseModel):
    index: int
    original_score: float
    current_score: float | None = None
    status: str = "pending"  # pending, rewriting, done, failed


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = 0  # 0-100
    paragraphs: list[ParagraphProgress] = []
    result: dict | None = None
    error: str | None = None


# --- Upload ---

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".tex", ".txt", ".md"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
