"""CLI entrypoint — interactive agent in your terminal."""

from __future__ import annotations

import asyncio
import os

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt

from elixpo_cli.config import get_api_key, get_api_url, get_model, load_config, save_config

app = typer.Typer(
    name="elixpo",
    help="Elixpo AI Agent — autonomous software engineering in your terminal.",
    no_args_is_help=True,
)
console = Console()


@app.command()
def chat(
    task: str = typer.Argument(None, help="Task to execute. If omitted, enters interactive mode."),
    workspace: str = typer.Option(".", "--workspace", "-w", help="Working directory for the agent."),
    model: str = typer.Option(None, "--model", "-m", help="LLM model override."),
    api_url: str = typer.Option(None, "--api-url", help="LLM API URL override."),
    resume: str = typer.Option(None, "--resume", "-r", help="Resume a previous session by ID."),
):
    """Start an agent session — give it a task or chat interactively."""
    api_key = get_api_key()
    if not api_key:
        console.print(
            "[red]No API key configured.[/red]\n"
            "Set ELIXPO_LLM_API_KEY env var or run: elixpo config --api-key YOUR_KEY"
        )
        raise typer.Exit(1)

    resolved_model = model or get_model()
    resolved_url = api_url or get_api_url()
    resolved_workspace = os.path.abspath(workspace)

    console.print(Panel(
        f"[bold green]Elixpo Agent[/bold green] v0.1.0\n"
        f"Model: {resolved_model}\n"
        f"Workspace: {resolved_workspace}",
        title="elixpo",
        border_style="green",
    ))

    if resume and task:
        asyncio.run(_resume_session(
            resume, task, resolved_workspace, resolved_url, api_key, resolved_model,
        ))
    elif task:
        asyncio.run(_run_task(task, resolved_workspace, resolved_url, api_key, resolved_model))
    else:
        asyncio.run(_interactive_loop(resolved_workspace, resolved_url, api_key, resolved_model))


async def _run_task(task: str, workspace: str, api_url: str, api_key: str, model: str):
    """Run a single task through the agent."""
    from elixpo.agent.engine import AgentEngine
    from elixpo.agent.session import Session, SessionStore, SessionTrigger
    from elixpo.llm.router import ModelRouter
    from elixpo.mcp.registry import create_default_registry

    router = ModelRouter.from_keys(api_key=api_key, api_url=api_url, model=model)
    tools = create_default_registry()
    store = SessionStore(os.path.join(workspace, ".elixpo_sessions"))
    engine = AgentEngine(router=router, tools=tools, session_store=store)

    session = Session(trigger=SessionTrigger.CLI, max_steps=50)
    console.print(f"[dim]Session: {session.id}[/dim]")

    async for event in engine.run(session, task=task, workspace_path=workspace):
        _render_event(event)

    await router.close()


async def _resume_session(
    session_id: str, follow_up: str, workspace: str,
    api_url: str, api_key: str, model: str,
):
    """Resume an existing session with a follow-up message."""
    from elixpo.agent.engine import AgentEngine
    from elixpo.agent.session import SessionStore
    from elixpo.llm.router import ModelRouter
    from elixpo.mcp.registry import create_default_registry

    router = ModelRouter.from_keys(api_key=api_key, api_url=api_url, model=model)
    tools = create_default_registry()
    store = SessionStore(os.path.join(workspace, ".elixpo_sessions"))
    engine = AgentEngine(router=router, tools=tools, session_store=store)

    console.print(f"[dim]Resuming session: {session_id}[/dim]")

    async for event in engine.resume(
        session_id=session_id,
        follow_up=follow_up,
        workspace_path=workspace,
    ):
        _render_event(event)

    await router.close()


async def _interactive_loop(workspace: str, api_url: str, api_key: str, model: str):
    """Interactive multi-turn chat — maintains session state across messages."""
    from elixpo.agent.engine import AgentEngine
    from elixpo.agent.session import Session, SessionStore, SessionTrigger
    from elixpo.llm.router import ModelRouter
    from elixpo.mcp.registry import create_default_registry

    router = ModelRouter.from_keys(api_key=api_key, api_url=api_url, model=model)
    tools = create_default_registry()
    store = SessionStore(os.path.join(workspace, ".elixpo_sessions"))

    session = Session(trigger=SessionTrigger.CLI, max_steps=200)
    engine = AgentEngine(router=router, tools=tools, session_store=store)
    first_message = True

    console.print(f"[dim]Session: {session.id}[/dim]")
    console.print("[dim]Type your task, or 'exit' to quit. Use /plan or /edit to switch modes.[/dim]\n")

    while True:
        try:
            mode_indicator = f"[bold magenta][{session.mode.value.upper()}][/bold magenta] "
            task = Prompt.ask(f"{mode_indicator}[bold cyan]You[/bold cyan]")
        except (KeyboardInterrupt, EOFError):
            break

        stripped = task.strip().lower()
        if stripped in ("exit", "quit", "q"):
            break
        if not task.strip():
            continue

        if first_message:
            async for event in engine.run(session, task=task, workspace_path=workspace):
                _render_event(event)
            first_message = False
        else:
            session.status = session.status.__class__("running")
            session.completed_at = None
            async for event in engine.run(session, task=task, workspace_path=workspace):
                _render_event(event)

        console.print()

    await router.close()
    console.print(f"[dim]Session saved: {session.id}[/dim]")
    console.print(f"[dim]Resume with: elixpo chat --resume {session.id} \"your follow-up\"[/dim]")


def _render_event(event):
    """Render an agent event to the terminal."""
    etype = event.type
    data = event.data

    if etype == "thinking":
        mode = data.get("mode", "")
        mode_tag = f"[{mode.upper()}] " if mode else ""
        console.print(f"[dim]{mode_tag}Step {data['step']}...[/dim]", end=" ")

    elif etype == "plan":
        console.print()
        console.print(Panel(Markdown(data["content"]), title="Plan", border_style="blue"))

    elif etype == "plan_ready":
        console.print()
        console.print(Panel(
            data.get("message", "Plan ready."),
            title="Awaiting Approval",
            border_style="yellow",
        ))

    elif etype == "mode_switch":
        from_mode = data.get("from", "")
        to_mode = data.get("to", data.get("mode", ""))
        console.print(f"\n[bold magenta]Mode switched: {from_mode or '?'} → {to_mode}[/bold magenta]")

    elif etype == "assistant_message":
        console.print()
        console.print(Markdown(data["content"]))

    elif etype == "tool_call":
        tool = data["tool"]
        mode = data.get("mode", "")
        mode_tag = f"[{mode.upper()}] " if mode else ""
        console.print(f"\n[yellow]{mode_tag}> {tool}[/yellow]", end="")
        args = data.get("arguments", "")
        if len(args) > 100:
            args = args[:100] + "..."
        console.print(f"[dim]({args})[/dim]")

    elif etype == "tool_result":
        if data.get("success"):
            preview = data.get("output_preview", "")
            if preview:
                lines = preview.split("\n")
                shown = "\n".join(lines[:5])
                if len(lines) > 5:
                    shown += f"\n  ... ({len(lines)} lines total)"
                console.print(f"[green]{shown}[/green]")
        else:
            console.print(f"[red]Error: {data.get('error', 'unknown')}[/red]")

    elif etype == "session_complete":
        usage = data.get("token_usage", {})
        console.print(Panel(
            f"[green]Done[/green] in {data['steps']} steps | "
            f"Tokens: {usage.get('total_tokens', 0):,}",
            border_style="green",
        ))

    elif etype == "session_resume":
        mode = data.get("mode", "")
        console.print(f"[dim]Resuming from step {data.get('prior_steps', 0)} [{mode.upper()}]...[/dim]")

    elif etype == "error":
        console.print(f"\n[red bold]Error:[/red bold] {data.get('error', 'unknown')}")

    elif etype == "context_compressed":
        console.print(f"[dim](context compressed: {data.get('messages_before', '?')} -> {data.get('messages_after', '?')} messages)[/dim]")


@app.command()
def sessions(
    workspace: str = typer.Option(".", "--workspace", "-w", help="Working directory."),
):
    """List recent agent sessions."""
    from elixpo.agent.session import SessionStore

    store = SessionStore(os.path.join(os.path.abspath(workspace), ".elixpo_sessions"))
    session_list = store.list_sessions(limit=20)

    if not session_list:
        console.print("[dim]No sessions found.[/dim]")
        return

    console.print(f"[bold]Recent sessions ({len(session_list)}):[/bold]\n")
    for s in session_list:
        status = s.get("status", "unknown")
        color = {"completed": "green", "running": "yellow", "failed": "red"}.get(status, "dim")
        sid = s.get("id", "?")[:12]
        steps = s.get("current_step", 0)
        mode = s.get("mode", "?")
        console.print(f"  [{color}]{status:>10}[/{color}]  {sid}  ({steps} steps) [{mode.upper()}]")


@app.command()
def config(
    api_key: str = typer.Option(None, "--api-key", help="Set your LLM API key."),
    api_url: str = typer.Option(None, "--api-url", help="Set the LLM API URL."),
    model_name: str = typer.Option(None, "--model", help="Set the default model."),
    perplexity_key: str = typer.Option(None, "--perplexity-key", help="Set Perplexity API key for web search."),
    show: bool = typer.Option(False, "--show", help="Show current configuration."),
):
    """Configure Elixpo CLI settings."""
    cfg = load_config()

    if show:
        console.print(Panel(
            f"API URL:         {cfg.get('api_url', '(default: moonshot)')}\n"
            f"API Key:         {'***' + cfg['api_key'][-4:] if cfg.get('api_key') else '(not set)'}\n"
            f"Model:           {cfg.get('model', '(default: kimi)')}\n"
            f"Perplexity Key:  {'***' + cfg['perplexity_key'][-4:] if cfg.get('perplexity_key') else '(not set)'}",
            title="Elixpo Config",
        ))
        return

    changed = False
    if api_key:
        cfg["api_key"] = api_key
        changed = True
    if api_url:
        cfg["api_url"] = api_url
        changed = True
    if model_name:
        cfg["model"] = model_name
        changed = True
    if perplexity_key:
        cfg["perplexity_key"] = perplexity_key
        changed = True

    if changed:
        save_config(cfg)
        console.print("[green]Configuration saved.[/green]")
    else:
        console.print("No changes. Use --api-key, --api-url, --model, or --perplexity-key to set values.")


@app.command()
def version():
    """Show version info."""
    console.print("elixpo-cli v0.1.0")
