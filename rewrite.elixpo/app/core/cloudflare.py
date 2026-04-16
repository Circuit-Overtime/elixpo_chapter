"""Cloudflare D1 + KV REST API client.

Replaces Redis — all session/cache/document storage goes through
Cloudflare's HTTP API from the VPS backend.
"""

import gzip
import hashlib
import json
import logging
import base64
from typing import Any, Optional

import httpx

from app.core.config import (
    CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_D1_DATABASE_ID,
    CLOUDFLARE_KV_NAMESPACE_ID,
)

logger = logging.getLogger(__name__)

_http: httpx.Client | None = None

CF_BASE = "https://api.cloudflare.com/client/v4"


def _client() -> httpx.Client:
    global _http
    if _http is None:
        _http = httpx.Client(
            base_url=CF_BASE,
            headers={
                "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
    return _http


# ─── D1 (SQL) ────────────────────────────────────────────────

def _d1_path() -> str:
    return f"/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{CLOUDFLARE_D1_DATABASE_ID}/query"


def d1_execute(sql: str, params: list | None = None) -> list[dict]:
    """Execute a single SQL statement against D1. Returns rows."""
    body: dict[str, Any] = {"sql": sql}
    if params:
        body["params"] = params
    try:
        resp = _client().post(_d1_path(), json=body)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success"):
            logger.error("D1 error: %s", data.get("errors"))
            return []
        results = data.get("result", [])
        if results and "results" in results[0]:
            return results[0]["results"]
        return []
    except Exception as e:
        logger.error("D1 request failed: %s", e)
        return []


def d1_execute_raw(sql: str, params: list | None = None) -> dict:
    """Execute SQL and return the full response metadata."""
    body: dict[str, Any] = {"sql": sql}
    if params:
        body["params"] = params
    try:
        resp = _client().post(_d1_path(), json=body)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error("D1 request failed: %s", e)
        return {"success": False, "errors": [str(e)]}


def d1_first(sql: str, params: list | None = None) -> dict | None:
    """Execute SQL and return the first row, or None."""
    rows = d1_execute(sql, params)
    return rows[0] if rows else None


def d1_batch(statements: list[dict]) -> list:
    """Execute multiple SQL statements in a batch.
    Each statement: {"sql": "...", "params": [...]}
    """
    try:
        resp = _client().post(_d1_path(), json=statements)
        resp.raise_for_status()
        return resp.json().get("result", [])
    except Exception as e:
        logger.error("D1 batch failed: %s", e)
        return []


# ─── KV (key-value cache) ────────────────────────────────────

def _kv_path(key: str = "") -> str:
    base = f"/accounts/{CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/{CLOUDFLARE_KV_NAMESPACE_ID}"
    if key:
        return f"{base}/values/{key}"
    return f"{base}/keys"


def kv_get(key: str) -> Optional[str]:
    """Get a value from KV. Returns None if not found."""
    try:
        resp = _client().get(_kv_path(key))
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        logger.error("KV GET failed for %s: %s", key, e)
        return None


def kv_get_json(key: str) -> Optional[dict]:
    """Get and parse JSON from KV."""
    raw = kv_get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def kv_put(key: str, value: str, expiration_ttl: int | None = None):
    """Put a value into KV with optional TTL (seconds)."""
    try:
        params = {}
        if expiration_ttl:
            params["expiration_ttl"] = expiration_ttl

        # KV write uses multipart form, not JSON
        resp = _client().put(
            _kv_path(key),
            content=value.encode("utf-8"),
            headers={
                "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
                "Content-Type": "text/plain",
            },
            params=params,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.error("KV PUT failed for %s: %s", key, e)


def kv_put_json(key: str, data: dict, expiration_ttl: int | None = None):
    """Serialize dict to JSON and store in KV."""
    kv_put(key, json.dumps(data, default=str), expiration_ttl)


def kv_delete(key: str):
    """Delete a key from KV."""
    try:
        resp = _client().delete(_kv_path(key))
        resp.raise_for_status()
    except Exception as e:
        logger.error("KV DELETE failed for %s: %s", key, e)


# ─── Compression helpers ─────────────────────────────────────

def compress_text(text: str) -> bytes:
    """Gzip compress text, return raw bytes."""
    return gzip.compress(text.encode("utf-8"), compresslevel=9)


def decompress_text(data: bytes) -> str:
    """Decompress gzip bytes to string."""
    return gzip.decompress(data).decode("utf-8")


def text_checksum(text: str) -> str:
    """SHA-256 hex digest of text."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ─── Document storage (D1 + compression) ─────────────────────

def store_document(
    user_id: str,
    session_id: str | None,
    content: str,
    filename: str | None = None,
    content_type: str = "text/plain",
) -> dict:
    """Compress and store a document in D1. Returns id + sizes."""
    import uuid
    doc_id = uuid.uuid4().hex
    original_size = len(content.encode("utf-8"))
    compressed = compress_text(content)
    compressed_size = len(compressed)
    checksum = text_checksum(content)
    compressed_b64 = base64.b64encode(compressed).decode("ascii")

    d1_execute(
        """INSERT INTO documents (id, user_id, session_id, filename, content_type,
           original_size, compressed_size, content_compressed, checksum)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [doc_id, user_id, session_id, filename, content_type,
         original_size, compressed_size, compressed_b64, checksum],
    )

    ratio = round((1 - compressed_size / original_size) * 100, 1) if original_size > 0 else 0
    logger.info(
        "Stored document %s: %d → %d bytes (%.1f%% compression)",
        doc_id, original_size, compressed_size, ratio,
    )
    return {
        "id": doc_id,
        "original_size": original_size,
        "compressed_size": compressed_size,
        "compression_ratio": ratio,
    }


def get_document(doc_id: str) -> dict | None:
    """Retrieve and decompress a document from D1."""
    row = d1_first(
        "SELECT content_compressed, filename, content_type, original_size, compressed_size FROM documents WHERE id = ?",
        [doc_id],
    )
    if not row:
        return None
    compressed_b64 = row["content_compressed"]
    compressed = base64.b64decode(compressed_b64)
    content = decompress_text(compressed)
    return {
        "content": content,
        "filename": row["filename"],
        "content_type": row["content_type"],
        "original_size": row["original_size"],
        "compressed_size": row["compressed_size"],
    }
