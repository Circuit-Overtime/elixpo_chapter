from functools import lru_cache
from loguru import logger


def get_model_server():
    """Get model server reference via centralized CoreServiceManager."""
    try:
        from ipcService.coreServiceManager import CoreServiceManager
        manager = CoreServiceManager.get_instance()
        if manager.is_ready():
            return manager  # Return manager object that has get_core_service() method
        else:
            logger.error("[SearchPipeline] CoreServiceManager not ready")
            raise RuntimeError("CoreServiceManager not ready")
    except Exception as e:
        logger.error(f"[SearchPipeline] Failed to get model server: {e}")
        raise


@lru_cache(maxsize=100)
def cached_web_search_key(query: str) -> str:
    return f"web_search_{hash(query)}"

def format_sse(event: str, data: str) -> str:
    lines = data.splitlines()
    data_str = ''.join(f"data: {line}\n" for line in lines)
    return f"event: {event}\n{data_str}\n\n"

