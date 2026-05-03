import threading
from typing import Callable, Optional, TypeVar
from loguru import logger
from multiprocessing.managers import BaseManager, RemoteError
from pipeline.config import IPC_HOST, IPC_PORT, IPC_AUTHKEY, IPC_TIMEOUT


# Errors that mean the proxy/socket is dead and we must reconnect.
RECONNECT_ERRORS = (
    BrokenPipeError,
    ConnectionResetError,
    ConnectionAbortedError,
    ConnectionRefusedError,
    EOFError,
    RemoteError,
)

T = TypeVar("T")


class ModelServerClient(BaseManager):
    pass


ModelServerClient.register('CoreEmbeddingService')
ModelServerClient.register('accessSearchAgents')


class CoreServiceManager:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self._connect_lock = threading.Lock()
        self._manager: Optional[ModelServerClient] = None
        self._core_service = None
        self._search_agents = None
        self._connection_ready = False
        self._connect()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = CoreServiceManager()
        return cls._instance

    def _connect(self):
        with self._connect_lock:
            if self._connection_ready and self._core_service is not None and self._search_agents is not None:
                return

            try:
                logger.info(
                    f"[CoreServiceManager] Connecting to IPC services "
                    f"at {IPC_HOST}:{IPC_PORT} (timeout: {IPC_TIMEOUT}s)"
                )
                self._manager = ModelServerClient(
                    address=(IPC_HOST, IPC_PORT),
                    authkey=IPC_AUTHKEY,
                )
                self._manager.connect()
                self._core_service = self._manager.CoreEmbeddingService()
                self._search_agents = self._manager.accessSearchAgents()
                self._connection_ready = True

                logger.info(
                    f"[CoreServiceManager] ✅ Connected to IPC services. "
                    f"Vector store: {self._core_service.get_vector_store_stats()}"
                )
            except Exception as e:
                self._connection_ready = False
                self._core_service = None
                self._search_agents = None
                self._manager = None
                logger.error(
                    f"[CoreServiceManager] Failed to connect to IPC service: {e}. "
                    f"Make sure the IPC service is running."
                )
                raise

    def invalidate(self, reason: str = "") -> None:
        # Force the next get_*() call to rebuild proxies. Safe to call from any thread
        # and from inside an exception handler.
        with self._connect_lock:
            if self._connection_ready:
                logger.warning(
                    f"[CoreServiceManager] Invalidating IPC proxies"
                    f"{f' ({reason})' if reason else ''} — will reconnect on next call"
                )
            self._connection_ready = False
            self._core_service = None
            self._search_agents = None
            self._manager = None

    def _ensure_ready(self) -> None:
        if not self._connection_ready or self._core_service is None or self._search_agents is None:
            self._connect()

    def get_core_service(self):
        self._ensure_ready()
        return self._core_service

    def get_search_agents(self):
        self._ensure_ready()
        return self._search_agents

    def is_ready(self) -> bool:
        return self._connection_ready

    def call(self, target: str, method: str, *args, **kwargs):
        # Invoke a method on the core_service or search_agents proxy with one
        # automatic reconnect on stale-proxy errors. Callers that prefer to handle
        # exceptions themselves can use get_core_service / get_search_agents
        # directly and call self.invalidate() on a RECONNECT_ERRORS catch.
        for attempt in (1, 2):
            try:
                proxy = self.get_core_service() if target == "core" else self.get_search_agents()
                return getattr(proxy, method)(*args, **kwargs)
            except RECONNECT_ERRORS as e:
                self.invalidate(f"{target}.{method}: {type(e).__name__}")
                if attempt == 2:
                    raise

    def get_vector_store_stats(self):
        try:
            return self.call("core", "get_vector_store_stats")
        except Exception as e:
            logger.error(f"[CoreServiceManager] Failed to get stats: {e}")
            return {}


def get_core_embedding_service():
    return CoreServiceManager.get_instance().get_core_service()


def is_ipc_ready() -> bool:
    try:
        return CoreServiceManager.get_instance().is_ready()
    except Exception:
        return False
