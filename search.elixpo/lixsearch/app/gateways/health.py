import logging
from datetime import datetime
from quart import jsonify

logger = logging.getLogger("lixsearch-api")


async def health_check(pipeline_initialized: bool):

    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "initialized": pipeline_initialized
    })
