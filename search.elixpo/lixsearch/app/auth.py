"""Application-level authentication for OpenAI-compatible endpoints."""
from __future__ import annotations

import hmac
import os

from quart import jsonify, request

_PROTECTED_OPENAI_PATHS = {"/v1/chat/completions", "/v1/responses"}


def install_api_auth(app) -> None:
    @app.before_request
    async def authenticate_openai_endpoint():
        if request.path not in _PROTECTED_OPENAI_PATHS:
            return None

        expected = os.getenv("API_KEY", "")
        if not expected:
            return jsonify({"error": {"message": "API authentication is not configured", "type": "server_error"}}), 503

        authorization = request.headers.get("Authorization", "")
        bearer = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
        provided = request.headers.get("X-API-Key") or bearer or request.args.get("key", "")
        if not provided:
            return jsonify({"error": {"message": "API key required", "type": "authentication_error"}}), 401
        if not hmac.compare_digest(provided, expected):
            return jsonify({"error": {"message": "Invalid API key", "type": "authentication_error"}}), 403
        return None
