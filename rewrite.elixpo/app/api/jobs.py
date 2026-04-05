"""Redis-persisted job runner with resumable sessions.

Every job is tied to a session_id. All state (paragraphs, progress,
intermediate rewrites) is persisted to Redis on every update so that:
  1. Frontend can poll by session_id and survive reloads
  2. If the server crashes mid-job, the job resumes from the last completed paragraph
  3. Completed results stay available until TTL expires
"""

import json
import logging
import threading
import time
import uuid

from app.api.schemas import JobStatus
from app.core.config import REDIS_URL

logger = logging.getLogger(__name__)

# Job TTL: keep completed jobs for 24 hours
JOB_TTL = 86400

# --- Redis connection (lazy, with in-memory fallback) ---

_redis_client = None
_redis_checked = False
_memory_store: dict[str, str] = {}
_lock = threading.Lock()


def _redis():
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    try:
        import redis
        client = redis.from_url(REDIS_URL, decode_responses=True)
        client.ping()
        _redis_client = client
        logger.info("Job store connected to Redis")
    except Exception as e:
        logger.warning("Redis unavailable (%s) — jobs use in-memory store (not crash-safe)", e)
        _redis_client = None
    return _redis_client


def _key(session_id: str) -> str:
    return f"rewrite:job:{session_id}"


def _save(session_id: str, data: dict):
    """Persist full job state."""
    payload = json.dumps(data, default=str)
    r = _redis()
    if r:
        try:
            r.setex(_key(session_id), JOB_TTL, payload)
            return
        except Exception:
            pass
    with _lock:
        _memory_store[session_id] = payload


def _load(session_id: str) -> dict | None:
    """Load full job state."""
    r = _redis()
    if r:
        try:
            raw = r.get(_key(session_id))
            return json.loads(raw) if raw else None
        except Exception:
            pass
    with _lock:
        raw = _memory_store.get(session_id)
        return json.loads(raw) if raw else None


# --- Public API ---

def create_session() -> str:
    """Create a new session and return its ID."""
    session_id = uuid.uuid4().hex[:20]
    _save(session_id, {
        "session_id": session_id,
        "status": JobStatus.pending.value,
        "progress": 0,
        "paragraphs": [],
        "original_text": None,
        "rewritten_paragraphs": [],
        "original_scores": [],
        "intensity": "aggressive",
        "domain": "general",
        "result": None,
        "error": None,
        "created_at": time.time(),
        "updated_at": time.time(),
    })
    return session_id


def get_session(session_id: str) -> dict | None:
    """Get full session state. Returns None if not found."""
    data = _load(session_id)
    if data is None:
        return None
    # Check TTL
    if data.get("status") in (JobStatus.completed.value, JobStatus.failed.value):
        age = time.time() - data.get("created_at", 0)
        if age > JOB_TTL:
            return None
    return data


def save_session(session_id: str, data: dict):
    """Save session state (called on every paragraph update for crash safety)."""
    data["updated_at"] = time.time()
    _save(session_id, data)


def run_in_background(fn, session_id: str, *args, **kwargs):
    """Run function in background thread with session state management."""

    def _wrapper():
        session = get_session(session_id)
        if session:
            session["status"] = JobStatus.running.value
            save_session(session_id, session)

        try:
            result = fn(session_id, *args, **kwargs)
            session = get_session(session_id)
            if session:
                session["status"] = JobStatus.completed.value
                session["progress"] = 100
                session["result"] = result
                save_session(session_id, session)
        except Exception as e:
            logger.exception("Session %s failed: %s", session_id, e)
            session = get_session(session_id)
            if session:
                session["status"] = JobStatus.failed.value
                session["error"] = str(e)
                save_session(session_id, session)

    thread = threading.Thread(target=_wrapper, daemon=True)
    thread.start()
    return thread
