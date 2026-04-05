"""Middleware: rate limiting, error handling."""

import time
import threading
import logging
from collections import defaultdict

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP sliding window rate limiter.

    Limits:
        - General endpoints: 60 requests/minute
        - Paraphrase endpoint: 5 requests/minute (expensive LLM calls)
    """

    GENERAL_LIMIT = 60
    GENERAL_WINDOW = 60  # seconds

    PARAPHRASE_LIMIT = 5
    PARAPHRASE_WINDOW = 60

    def __init__(self, app):
        super().__init__(app)
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _is_rate_limited(self, key: str, limit: int, window: int) -> tuple[bool, int]:
        """Check if key is rate limited. Returns (limited, remaining)."""
        now = time.time()
        with self._lock:
            # Prune old entries
            self._requests[key] = [
                t for t in self._requests[key] if t > now - window
            ]
            count = len(self._requests[key])
            if count >= limit:
                return True, 0
            self._requests[key].append(now)
            return False, limit - count - 1

    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        path = request.url.path

        # Choose limit based on endpoint
        if "/paraphrase" in path:
            key = f"paraphrase:{client_ip}"
            limit, window = self.PARAPHRASE_LIMIT, self.PARAPHRASE_WINDOW
        else:
            key = f"general:{client_ip}"
            limit, window = self.GENERAL_LIMIT, self.GENERAL_WINDOW

        limited, remaining = self._is_rate_limited(key, limit, window)

        if limited:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Window": str(window),
                    "Retry-After": str(window),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
