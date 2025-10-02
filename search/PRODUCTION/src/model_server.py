"""
DEPRECATED: This file has been replaced by the new IPC-based embedding system.
Use modelServer.py (the embedding server) and embeddingClient.py (the client) instead.

For backward compatibility, this module now redirects to the new IPC system.
"""

from multiprocessing import Process, Pipe
from embeddingClient import get_embedding_client, fast_web_search_with_embeddings
from loguru import logger
import asyncio

logger.warning("Using deprecated model_server.py - consider migrating to the new IPC-based system")

def worker_process(conn):
    """
    Backward compatibility worker process that now uses IPC embedding client
    """
    try:
        client = get_embedding_client()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        while True:
            try:
                msg = conn.recv()
                if msg["cmd"] == "search":
                    query = msg["query"]
                    max_chars = msg.get("max_chars", 2000)
                    # Use the new IPC-based system
                    result, urls = client.web_search_with_embeddings(query, max_chars=max_chars)
                    conn.send({"result": result, "urls": urls})
                elif msg["cmd"] == "exit":
                    break
            except Exception as e:
                conn.send({"error": str(e)})
                logger.error(f"Error in worker process: {e}")
    except Exception as e:
        logger.error(f"Failed to initialize worker process: {e}")
        conn.send({"error": f"Worker initialization failed: {str(e)}"})
    finally:
        conn.close()