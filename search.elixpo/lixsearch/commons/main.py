

from loguru import logger
import time
from pipeline.config import ERROR_MESSAGE_TRUNCATE

_ipc_ready = False
_ipc_initialized = False

def _init_ipc_manager(max_retries: int = 3, retry_delay: float = 1.0):

    global _ipc_ready, _ipc_initialized

    # If already successfully connected, skip
    if _ipc_initialized and _ipc_ready:
        return True

    try:
        from ipcService.coreServiceManager import CoreServiceManager
        logger.info(f"[Utility] Attempting IPC connection via centralized CoreServiceManager")
        manager = CoreServiceManager.get_instance()

        if manager.is_ready():
            logger.info(f"[Utility] IPC connection established with CoreEmbeddingService - READY")
            _ipc_ready = True
            _ipc_initialized = True
            return True
        else:
            logger.warning(f"[Utility] CoreServiceManager not ready after initialization")
            _ipc_ready = False
            return False
    except Exception as e:
        logger.warning(f"[Utility] IPC connection failed: {str(e)[:ERROR_MESSAGE_TRUNCATE]}")
        _ipc_ready = False
        return False
