import logging
import uuid
from datetime import datetime
from quart import request, jsonify
from sessions.main import get_session_manager
from pipeline.config import X_REQ_ID_SLICE_SIZE
from app.utils import validate_session_id

logger = logging.getLogger("lixsearch-api")


async def create_session():
    try:
        data = await request.get_json()
        query = data.get("query", "").strip()

        if not query:
            return jsonify({"error": "Query is required"}), 400

        session_manager = get_session_manager()
        session_id = session_manager.create_session(query)

        logger.info(f"[API] Session: {session_id}")

        return jsonify({
            "session_id": session_id,
            "query": query,
            "created_at": datetime.utcnow().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"[API] Session creation error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


async def get_session_info(session_id: str):
    if not validate_session_id(session_id):
        return jsonify({"error": "Invalid session_id"}), 400

    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:X_REQ_ID_SLICE_SIZE])

    try:
        logger.info(f"[{request_id}] get_session_info session={session_id}")
        session_manager = get_session_manager()
        session_data = session_manager.get_session(session_id)

        if session_data:
            return jsonify({
                "session_id": session_id,
                "query": session_data.query,
                "summary": session_manager.get_session_summary(session_id),
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            })

        # Session not in memory — try disk archive (evicted sessions)
        disk_data = session_manager.get_session_from_disk(session_id)
        if disk_data:
            logger.info(f"[{request_id}] session={session_id} recovered from disk archive")
            return jsonify({
                "session_id": session_id,
                "summary": disk_data,
                "source": "disk_archive",
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            })

        logger.warning(f"[{request_id}] session={session_id} not found")
        return jsonify({"error": "Session not found"}), 404

    except Exception as e:
        logger.error(f"[{request_id}] get_session_info session={session_id} error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


async def get_session_summary(session_id: str):
    if not validate_session_id(session_id):
        return jsonify({"error": "Invalid session_id"}), 400

    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:X_REQ_ID_SLICE_SIZE])

    try:
        logger.info(f"[{request_id}] Getting summary for session: {session_id}")
        session_manager = get_session_manager()
        session_data = session_manager.get_session(session_id)

        if session_data:
            return jsonify({
                "session_id": session_id,
                "summary": session_manager.get_session_summary(session_id),
                "request_id": request_id
            })

        # Fallback to disk archive
        disk_data = session_manager.get_session_from_disk(session_id)
        if disk_data:
            return jsonify({
                "session_id": session_id,
                "summary": disk_data,
                "source": "disk_archive",
                "request_id": request_id
            })

        return jsonify({"error": "Session not found"}), 404

    except Exception as e:
        logger.error(f"[{request_id}] Summary error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


async def delete_session(session_id: str):
    if not validate_session_id(session_id):
        return jsonify({"error": "Invalid session_id"}), 400

    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:X_REQ_ID_SLICE_SIZE])

    try:
        logger.info(f"[{request_id}] Deleting session: {session_id}")
        session_manager = get_session_manager()
        session_manager.cleanup_session(session_id)

        logger.info(f"[{request_id}] Session deleted: {session_id}")

        return jsonify({
            "message": "Session deleted",
            "session_id": session_id,
            "request_id": request_id
        }), 200

    except Exception as e:
        logger.error(f"[{request_id}] Session deletion error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500
