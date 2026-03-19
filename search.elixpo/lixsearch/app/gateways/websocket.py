import logging
import uuid
from quart import websocket
from pipeline.searchPipeline import run_elixposearch_pipeline
from pipeline.config import X_REQ_ID_SLICE_SIZE, LOG_MESSAGE_QUERY_TRUNCATE
from app.utils import validate_session_id

logger = logging.getLogger("lixsearch-api")


async def websocket_search():
    request_id = str(uuid.uuid4())[:X_REQ_ID_SLICE_SIZE]
    logger.info(f"[{request_id}] WebSocket connection established")

    try:
        while True:
            data = await websocket.receive_json()
            query = data.get("query", "").strip()
            session_id = data.get("session_id", "").strip()

            if not session_id or not validate_session_id(session_id):
                await websocket.send_json({
                    "error": "Valid session_id required",
                    "request_id": request_id
                })
                continue

            if not query:
                await websocket.send_json({
                    "error": "Query required",
                    "request_id": request_id
                })
                continue

            logger.info(f"[{request_id}] WS Query: {query[:LOG_MESSAGE_QUERY_TRUNCATE]}")

            async for chunk in run_elixposearch_pipeline(
                user_query=query,
                user_image=data.get("image_url"),
                event_id=request_id,
                session_id=session_id,
            ):
                lines = chunk.split('\n')
                event_type = None
                for line in lines:
                    if line.startswith('event:'):
                        event_type = line.replace('event:', '').strip()
                    elif line.startswith('data:'):
                        data_content = line.replace('data:', '').strip()
                        if event_type:
                            await websocket.send_json({
                                "event": event_type,
                                "data": data_content,
                                "request_id": request_id
                            })

    except Exception as e:
        logger.error(f"[{request_id}] WS error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "error": "Internal server error",
                "request_id": request_id
            })
        except:
            pass
