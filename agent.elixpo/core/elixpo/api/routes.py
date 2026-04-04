"""FastAPI routes — health, sessions, GitHub webhook."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from elixpo.agent.session import SessionStore
from elixpo.config import settings
from elixpo.github.handler import GitHubEventHandler
from elixpo.github.webhooks import parse_webhook

router = APIRouter()

_session_store = SessionStore(settings.agent.session_storage_path)
_github_handler = GitHubEventHandler()


@router.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@router.get("/api/v1/sessions")
async def list_sessions(limit: int = 50):
    sessions = _session_store.list_sessions(limit=limit)
    return {"sessions": sessions}


@router.get("/api/v1/sessions/{session_id}")
async def get_session(session_id: str):
    session = _session_store.load(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump()


class CreateSessionRequest(BaseModel):
    task: str
    repo: str | None = None
    workspace_path: str | None = None


@router.post("/api/v1/sessions")
async def create_session(req: CreateSessionRequest):
    """Create and run a new agent session."""
    import os
    from elixpo.agent.engine import AgentEngine
    from elixpo.agent.session import Session, SessionTrigger
    from elixpo.llm.router import ModelRouter
    from elixpo.mcp.registry import create_default_registry

    session = Session(
        trigger=SessionTrigger.WEB_DASHBOARD,
        repo_full_name=req.repo,
    )

    workspace = req.workspace_path or os.path.join(settings.agent.workspace_path, session.id)
    os.makedirs(workspace, exist_ok=True)

    router = ModelRouter.from_settings()
    tools = create_default_registry()
    engine = AgentEngine(router=router, tools=tools, session_store=_session_store)

    events = []
    async for event in engine.run(session, task=req.task, workspace_path=workspace):
        events.append(event.to_dict())

    await router.close()

    return {
        "session_id": session.id,
        "status": session.status.value,
        "mode": session.mode.value,
        "events": events,
    }


class ResumeSessionRequest(BaseModel):
    follow_up: str
    workspace_path: str | None = None


@router.post("/api/v1/sessions/{session_id}/message")
async def resume_session(session_id: str, req: ResumeSessionRequest):
    """Send a follow-up message to an existing session, resuming it."""
    from elixpo.agent.engine import AgentEngine
    from elixpo.llm.router import ModelRouter
    from elixpo.mcp.registry import create_default_registry

    session = _session_store.load(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    router = ModelRouter.from_settings()
    tools = create_default_registry()
    engine = AgentEngine(router=router, tools=tools, session_store=_session_store)

    events = []
    async for event in engine.resume(
        session_id=session_id,
        follow_up=req.follow_up,
        workspace_path=req.workspace_path,
    ):
        events.append(event.to_dict())

    await router.close()

    return {
        "session_id": session_id,
        "status": session.status.value,
        "events": events,
    }


@router.delete("/api/v1/sessions/{session_id}")
async def delete_session(session_id: str):
    deleted = _session_store.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}


@router.post("/webhook/github")
async def github_webhook(request: Request):
    """GitHub webhook endpoint — receives events, verifies signature, dispatches to agent."""
    webhook = await parse_webhook(request)
    result = await _github_handler.handle_event(
        event=webhook["event"],
        action=webhook["action"],
        payload=webhook["payload"],
    )
    return result
