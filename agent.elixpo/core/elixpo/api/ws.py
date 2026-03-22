"""WebSocket endpoint for real-time agent session streaming."""

from __future__ import annotations

import json
import os

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from elixpo.agent.engine import AgentEngine
from elixpo.agent.session import Session, SessionStore, SessionTrigger
from elixpo.config import settings
from elixpo.llm.client import LLMClient
from elixpo.mcp.registry import create_default_registry

log = structlog.get_logger()

ws_router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections per session."""

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(session_id, []).append(websocket)
        log.info("ws.connected", session_id=session_id)

    def disconnect(self, session_id: str, websocket: WebSocket):
        conns = self._connections.get(session_id, [])
        if websocket in conns:
            conns.remove(websocket)
        log.info("ws.disconnected", session_id=session_id)

    async def broadcast(self, session_id: str, data: dict):
        """Send an event to all connected clients for a session."""
        message = json.dumps(data)
        conns = self._connections.get(session_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.remove(ws)


manager = ConnectionManager()


@ws_router.websocket("/api/v1/sessions/{session_id}/stream")
async def session_stream(websocket: WebSocket, session_id: str):
    """Stream agent events for a session over WebSocket.

    Client connects, then sends a JSON message to start/resume:
      {"action": "start", "task": "fix the bug", "workspace": "/path"}
      {"action": "resume", "follow_up": "also add tests"}
    """
    await manager.connect(session_id, websocket)
    session_store = SessionStore(settings.agent.session_storage_path)

    try:
        while True:
            # Wait for client instruction
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "error", "error": "Invalid JSON"}))
                continue

            action = msg.get("action", "start")

            llm = LLMClient()
            tools = create_default_registry()
            engine = AgentEngine(llm=llm, tools=tools, session_store=session_store)

            if action == "start":
                task = msg.get("task", "")
                workspace = msg.get("workspace") or os.path.join(
                    settings.agent.workspace_path, session_id,
                )
                os.makedirs(workspace, exist_ok=True)

                session = Session(
                    id=session_id,
                    trigger=SessionTrigger.WEB_DASHBOARD,
                    repo_full_name=msg.get("repo"),
                )

                async for event in engine.run(session, task=task, workspace_path=workspace):
                    event_data = event.to_dict()
                    await manager.broadcast(session_id, event_data)

            elif action == "resume":
                follow_up = msg.get("follow_up", "")
                workspace = msg.get("workspace")

                async for event in engine.resume(
                    session_id=session_id,
                    follow_up=follow_up,
                    workspace_path=workspace,
                ):
                    event_data = event.to_dict()
                    await manager.broadcast(session_id, event_data)

            elif action == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            else:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "error": f"Unknown action: {action}",
                }))

            await llm.close()

    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
    except Exception as e:
        log.error("ws.error", session_id=session_id, error=str(e))
        manager.disconnect(session_id, websocket)
