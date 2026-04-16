"""Cloudflare KV-persisted job runner with resumable sessions.

Every job is tied to a session_id. All state (paragraphs, progress,
intermediate rewrites) is persisted to Cloudflare KV on every update so that:
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

logger = logging.getLogger(__name__)

# Job TTL: keep completed jobs for 24 hours
JOB_TTL = 86400

# --- In-memory fallback (used if KV is unavailable) ---
_memory_store: dict[str, str] = {}
_lock = threading.Lock()
_kv_checked = False
_kv_ok = False


def _check_kv() -> bool:
    global _kv_checked, _kv_ok
    if _kv_checked:
        return _kv_ok
    _kv_checked = True
    try:
        from app.core.cloudflare import kv_get
        kv_get("__ping__")
        _kv_ok = True
        logger.info("Job store connected to Cloudflare KV")
    except Exception as e:
        _kv_ok = False
        logger.warning("KV unavailable (%s) — jobs use in-memory store (not crash-safe)", e)
    return _kv_ok


def _key(session_id: str) -> str:
    return f"rewrite:job:{session_id}"


def _save(session_id: str, data: dict):
    """Persist full job state."""
    payload = json.dumps(data, default=str)
    if _check_kv():
        try:
            from app.core.cloudflare import kv_put
            kv_put(_key(session_id), payload, expiration_ttl=JOB_TTL)
            return
        except Exception:
            pass
    with _lock:
        _memory_store[session_id] = payload


def _load(session_id: str) -> dict | None:
    """Load full job state."""
    if _check_kv():
        try:
            from app.core.cloudflare import kv_get
            raw = kv_get(_key(session_id))
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
