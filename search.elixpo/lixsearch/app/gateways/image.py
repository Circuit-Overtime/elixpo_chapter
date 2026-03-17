import logging
import time
import threading
from quart import Response

logger = logging.getLogger("lixsearch-api")

# In-memory image store: {image_id: (bytes, content_type, created_at)}
_image_store: dict = {}
_store_lock = threading.Lock()
IMAGE_TTL_SECONDS = 3600  # 1 hour


def store_image(image_id: str, data: bytes, content_type: str = "image/png") -> None:
    with _store_lock:
        _image_store[image_id] = (data, content_type, time.time())


def _cleanup_expired():
    now = time.time()
    with _store_lock:
        expired = [k for k, (_, _, ts) in _image_store.items() if now - ts > IMAGE_TTL_SECONDS]
        for k in expired:
            del _image_store[k]
    if expired:
        logger.debug(f"[Image] Cleaned up {len(expired)} expired images")


async def serve_image(image_id: str):
    _cleanup_expired()
    with _store_lock:
        entry = _image_store.get(image_id)
    if not entry:
        return Response("Image not found", status=404)
    data, content_type, _ = entry
    return Response(data, content_type=content_type, headers={
        "Cache-Control": "public, max-age=3600",
    })
