"""GitHub event handler — the bridge between webhooks and the agent engine."""

from __future__ import annotations

import asyncio
import os
import tempfile

import structlog

from elixpo.agent.engine import AgentEngine
from elixpo.agent.session import Session, SessionStore, SessionTrigger
from elixpo.config import settings
from elixpo.github.api import GitHubAPI
from elixpo.github.app import GitHubApp
from elixpo.github.context_loader import load_issue_context, load_pr_context
from elixpo.github.webhooks import extract_task_from_mention, is_bot_mentioned
from elixpo.llm.client import LLMClient
from elixpo.mcp.registry import create_default_registry

log = structlog.get_logger()


class GitHubEventHandler:
    """Processes GitHub webhook events and runs the agent."""

    def __init__(self, github_app: GitHubApp | None = None):
        self.app = github_app or GitHubApp()

    async def handle_event(self, event: str, action: str, payload: dict) -> dict:
        """Route an event to the appropriate handler. Returns status dict."""
        if event == "issue_comment" and action == "created":
            return await self._handle_issue_comment(payload)
        elif event == "pull_request_review_comment" and action == "created":
            return await self._handle_pr_review_comment(payload)
        elif event == "issues" and action == "opened":
            return await self._handle_issue_opened(payload)
        elif event == "installation" and action == "created":
            return await self._handle_installation_created(payload)
        else:
            log.debug("github.event_ignored", event=event, action=action)
            return {"status": "ignored", "reason": f"Unhandled event: {event}.{action}"}

    async def _handle_issue_comment(self, payload: dict) -> dict:
        """Handle @elixpoo mentions in issue/PR comments."""
        comment = payload.get("comment", {})
        body = comment.get("body", "")
        issue = payload.get("issue", {})
        repo = payload.get("repository", {})

        if not is_bot_mentioned(body):
            return {"status": "ignored", "reason": "Bot not mentioned"}

        # Don't respond to own comments
        if comment.get("user", {}).get("login") == settings.github.bot_username:
            return {"status": "ignored", "reason": "Self-comment"}

        installation_id = payload.get("installation", {}).get("id")
        if not installation_id:
            return {"status": "error", "reason": "No installation ID"}

        owner = repo.get("owner", {}).get("login", "")
        repo_name = repo.get("name", "")
        issue_number = issue.get("number", 0)
        is_pr = "pull_request" in issue

        task = extract_task_from_mention(body)

        log.info(
            "github.mention_detected",
            repo=f"{owner}/{repo_name}",
            issue=issue_number,
            is_pr=is_pr,
            task=task[:100],
        )

        # Run the agent in background
        asyncio.create_task(
            self._run_agent_for_event(
                installation_id=installation_id,
                owner=owner,
                repo_name=repo_name,
                number=issue_number,
                is_pr=is_pr,
                task=task,
                trigger_comment=body,
            )
        )

        return {"status": "processing", "issue": issue_number}

    async def _handle_pr_review_comment(self, payload: dict) -> dict:
        """Handle @elixpoo mentions in PR review comments."""
        comment = payload.get("comment", {})
        body = comment.get("body", "")
        pr = payload.get("pull_request", {})
        repo = payload.get("repository", {})

        if not is_bot_mentioned(body):
            return {"status": "ignored", "reason": "Bot not mentioned"}

        if comment.get("user", {}).get("login") == settings.github.bot_username:
            return {"status": "ignored", "reason": "Self-comment"}

        installation_id = payload.get("installation", {}).get("id")
        if not installation_id:
            return {"status": "error", "reason": "No installation ID"}

        owner = repo.get("owner", {}).get("login", "")
        repo_name = repo.get("name", "")
        pr_number = pr.get("number", 0)
        task = extract_task_from_mention(body)

        asyncio.create_task(
            self._run_agent_for_event(
                installation_id=installation_id,
                owner=owner,
                repo_name=repo_name,
                number=pr_number,
                is_pr=True,
                task=task,
                trigger_comment=body,
            )
        )

        return {"status": "processing", "pr": pr_number}

    async def _handle_issue_opened(self, payload: dict) -> dict:
        """Handle new issues that mention @elixpoo in the body."""
        issue = payload.get("issue", {})
        body = issue.get("body", "") or ""
        repo = payload.get("repository", {})

        if not is_bot_mentioned(body):
            return {"status": "ignored", "reason": "Bot not mentioned in issue body"}

        installation_id = payload.get("installation", {}).get("id")
        if not installation_id:
            return {"status": "error", "reason": "No installation ID"}

        owner = repo.get("owner", {}).get("login", "")
        repo_name = repo.get("name", "")
        issue_number = issue.get("number", 0)
        task = extract_task_from_mention(body)

        asyncio.create_task(
            self._run_agent_for_event(
                installation_id=installation_id,
                owner=owner,
                repo_name=repo_name,
                number=issue_number,
                is_pr=False,
                task=task,
                trigger_comment=body,
            )
        )

        return {"status": "processing", "issue": issue_number}

    async def _handle_installation_created(self, payload: dict) -> dict:
        """Log new GitHub App installations."""
        installation = payload.get("installation", {})
        account = installation.get("account", {})
        log.info(
            "github.installation_created",
            installation_id=installation.get("id"),
            account=account.get("login"),
            account_type=account.get("type"),
        )
        return {"status": "ok", "installation_id": installation.get("id")}

    async def _run_agent_for_event(
        self,
        installation_id: int,
        owner: str,
        repo_name: str,
        number: int,
        is_pr: bool,
        task: str,
        trigger_comment: str,
    ):
        """Run the full agent pipeline for a GitHub event."""
        api = GitHubAPI(self.app, installation_id)
        full_name = f"{owner}/{repo_name}"

        try:
            # Post an acknowledgment comment
            await api.create_issue_comment(
                owner, repo_name, number,
                "🐼 On it! I'm analyzing the context and working on a solution...",
            )

            # Load context
            if is_pr:
                ctx = await load_pr_context(api, owner, repo_name, number, trigger_comment)
            else:
                ctx = await load_issue_context(api, owner, repo_name, number, trigger_comment)

            context_prompt = ctx.to_prompt()

            # Create workspace — clone the repo
            workspace_base = settings.agent.workspace_path
            os.makedirs(workspace_base, exist_ok=True)
            workspace = tempfile.mkdtemp(dir=workspace_base, prefix=f"{owner}-{repo_name}-")

            # Clone repo using installation token
            token = await self.app.get_installation_token(installation_id)
            clone_url = f"https://x-access-token:{token}@github.com/{full_name}.git"

            clone_proc = await asyncio.create_subprocess_exec(
                "git", "clone", "--depth", "50", clone_url, workspace,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(clone_proc.communicate(), timeout=120)

            if clone_proc.returncode != 0:
                await api.create_issue_comment(
                    owner, repo_name, number,
                    "❌ Failed to clone the repository. Please check my permissions.",
                )
                return

            # Configure git in workspace
            await asyncio.create_subprocess_exec(
                "git", "config", "user.name", settings.github.bot_username,
                cwd=workspace,
            )
            await asyncio.create_subprocess_exec(
                "git", "config", "user.email", f"{settings.github.bot_username}@users.noreply.github.com",
                cwd=workspace,
            )

            # Create a working branch
            branch_name = f"elixpo/issue-{number}"
            await asyncio.create_subprocess_exec(
                "git", "checkout", "-b", branch_name,
                cwd=workspace,
            )

            # Build the full task prompt
            full_task = f"""{context_prompt}

## Instructions
Based on the above context, complete the requested task. After making changes:
1. Commit your changes with a clear commit message
2. Do NOT push — the system will handle pushing and PR creation after you finish.
"""

            # Create and run agent session
            session_store = SessionStore(settings.agent.session_storage_path)
            llm = LLMClient()
            tools = create_default_registry()
            engine = AgentEngine(llm=llm, tools=tools, session_store=session_store)

            session = Session(
                trigger=SessionTrigger.GITHUB_WEBHOOK,
                repo_full_name=full_name,
                issue_number=number if not is_pr else None,
                pr_number=number if is_pr else None,
                workspace_path=workspace,
                max_steps=settings.agent.max_agent_steps,
            )

            # Run the agent
            final_message = ""
            async for event in engine.run(session, task=full_task, workspace_path=workspace):
                if event.type == "assistant_message":
                    final_message = event.data.get("content", "")

            # After agent completes, push and create PR (for issues)
            if session.status.value == "completed":
                # Check if there are any commits
                check_proc = await asyncio.create_subprocess_exec(
                    "git", "log", f"{ctx.default_branch}..HEAD", "--oneline",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=workspace,
                )
                stdout, _ = await check_proc.communicate()
                commits = stdout.decode().strip()

                if commits:
                    # Push the branch
                    push_proc = await asyncio.create_subprocess_exec(
                        "git", "push", "origin", branch_name,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=workspace,
                    )
                    await asyncio.wait_for(push_proc.communicate(), timeout=60)

                    if push_proc.returncode == 0 and not is_pr:
                        # Create a PR
                        pr_body = (
                            f"Closes #{number}\n\n"
                            f"## Changes\n{final_message[:2000]}\n\n"
                            f"---\n*Automated by Elixpo 🐼*"
                        )
                        try:
                            pr_data = await api.create_pull(
                                owner, repo_name,
                                title=f"fix: resolve #{number} — {ctx.title[:60]}",
                                body=pr_body,
                                head=branch_name,
                                base=ctx.default_branch,
                            )
                            pr_url = pr_data.get("html_url", "")
                            session.result_pr_url = pr_url
                            session_store.save(session)

                            await api.create_issue_comment(
                                owner, repo_name, number,
                                f"✅ Done! I've created a PR with the fix: {pr_url}",
                            )
                        except Exception as e:
                            log.error("github.pr_create_failed", error=str(e))
                            await api.create_issue_comment(
                                owner, repo_name, number,
                                f"⚠️ I made changes but couldn't create a PR: {e}",
                            )
                    elif push_proc.returncode == 0 and is_pr:
                        await api.create_issue_comment(
                            owner, repo_name, number,
                            f"✅ Done! I've pushed changes to `{branch_name}`.\n\n{final_message[:1000]}",
                        )
                    else:
                        await api.create_issue_comment(
                            owner, repo_name, number,
                            "⚠️ I made changes locally but failed to push. Please check my permissions.",
                        )
                else:
                    await api.create_issue_comment(
                        owner, repo_name, number,
                        f"🐼 I analyzed the issue but didn't make any code changes.\n\n{final_message[:1500]}",
                    )
            else:
                await api.create_issue_comment(
                    owner, repo_name, number,
                    f"❌ I encountered an issue while working on this. Status: {session.status.value}\n\n"
                    f"{final_message[:1000]}",
                )

            await llm.close()

        except Exception as e:
            log.error("github.agent_run_failed", error=str(e), repo=full_name, number=number)
            try:
                await api.create_issue_comment(
                    owner, repo_name, number,
                    f"❌ Something went wrong: {str(e)[:200]}",
                )
            except Exception:
                pass
        finally:
            await api.close()
