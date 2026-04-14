import logging
from datetime import datetime
from quart import jsonify

logger = logging.getLogger("lixsearch-api")


async def health_check(pipeline_initialized: bool):

    ipc_status = "unknown"
    try:
        from ipcService.coreServiceManager import is_ipc_ready
        ipc_status = "connected" if is_ipc_ready() else "disconnected"
    except Exception:
        ipc_status = "error"

    status = "healthy"
    if not pipeline_initialized:
        status = "unhealthy"
    elif ipc_status != "connected":
        status = "degraded"

    return jsonify({
        "initialized": pipeline_initialized,
        "status": status,
        "ipc_connection": ipc_status,
        "timestamp": datetime.utcnow().isoformat(),
    })
