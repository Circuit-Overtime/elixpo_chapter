"""Plan and publish reviewable organization-standard update pull requests."""

from __future__ import annotations

import base64
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class StandardConfig:
    name: str
    target_owner: str
    exclude_repositories: frozenset[str]
    files: tuple[str, ...]


@dataclass(frozen=True)
class FileChange:
    path: str
    content: bytes
    status: str


def load_standard(root: Path, path: Path) -> StandardConfig:
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if raw.get("schema_version") != 1:
        raise ValueError("unsupported organization-standard schema")
    files = tuple(dict.fromkeys(str(item) for item in raw.get("files") or []))
    if not files:
        raise ValueError("organization standard has no files")
    for name in files:
        candidate = (root / name).resolve()
        if root.resolve() not in candidate.parents or not candidate.is_file():
            raise ValueError(f"organization-standard source is unsafe or missing: {name}")
    return StandardConfig(
        name=str(raw.get("name") or "oreoflow-repository-standard"),
        target_owner=str(raw.get("target_owner") or "elixpo"),
        exclude_repositories=frozenset(str(item) for item in raw.get("exclude_repositories") or []),
        files=files,
    )


def standard_digest(root: Path, config: StandardConfig) -> str:
    digest = hashlib.sha256()
    for name in config.files:
        digest.update(name.encode())
        digest.update(b"\0")
        digest.update((root / name).read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def _decoded_file(payload: dict | list | None) -> bytes | None:
    if not isinstance(payload, dict) or payload.get("type") != "file":
        return None
    content = str(payload.get("content") or "").replace("\n", "")
    return base64.b64decode(content) if content else b""


async def plan_repository(api, root: Path, config: StandardConfig, repo: str) -> list[FileChange]:
    changes: list[FileChange] = []
    for name in config.files:
        wanted = (root / name).read_bytes()
        try:
            current = _decoded_file(await api.get_repo_contents(config.target_owner, repo, name))
        except Exception as exc:
            if getattr(getattr(exc, "response", None), "status_code", None) != 404:
                raise
            current = None
        if current != wanted:
            changes.append(FileChange(path=name, content=wanted, status="add" if current is None else "update"))
    return changes


async def publish_repository_update(
    api,
    root: Path,
    config: StandardConfig,
    repo: str,
    changes: list[FileChange],
    *,
    digest: str,
    safety_gate=None,
) -> dict[str, Any]:
    if not changes:
        return {"repository": f"{config.target_owner}/{repo}", "status": "current"}
    branch = f"chore/oreoflow-standard-{digest[:10]}"
    open_pulls = await api.list_pulls(config.target_owner, repo, state="open", per_page=100)
    existing = next(
        (pull for pull in open_pulls if str((pull.get("head") or {}).get("ref") or "") == branch),
        None,
    )
    if existing:
        return {
            "repository": f"{config.target_owner}/{repo}",
            "status": "already_open",
            "pr_url": str(existing.get("html_url") or ""),
        }
    default_branch = await api.get_default_branch(config.target_owner, repo)
    base_ref = await api.get_ref(config.target_owner, repo, f"heads/{default_branch}")
    base_sha = str((base_ref.get("object") or {}).get("sha") or "")
    if not base_sha:
        raise RuntimeError(f"{config.target_owner}/{repo} default branch has no commit")
    base_commit = await api.get_commit(config.target_owner, repo, base_sha)
    base_tree = str((base_commit.get("tree") or {}).get("sha") or "")
    entries = []
    for change in changes:
        blob = await api.create_blob(config.target_owner, repo, change.content)
        entries.append(
            {"path": change.path, "mode": "100644", "type": "blob", "sha": blob["sha"]}
        )
    tree = await api.create_tree(config.target_owner, repo, base_tree, entries)
    commit = await api.create_commit(
        config.target_owner,
        repo,
        "chore: update OreoFlow repository standard",
        str(tree["sha"]),
        [base_sha],
    )
    await api.create_ref(config.target_owner, repo, f"refs/heads/{branch}", str(commit["sha"]))
    body = (
        "Update the shared Elixpo repository-agent workflows and support scripts from "
        f"`elixpo/agent.elixpo` standard `{digest[:12]}`.\n\n"
        f"Files changed: {len(changes)}. Review repository-specific behavior before merging."
    )
    if safety_gate is not None:
        await safety_gate(f"[CHORE]:- Update OreoFlow repository standard\n\n{body}")
    pull = await api.create_pull(
        config.target_owner,
        repo,
        "[CHORE]:- Update OreoFlow repository standard",
        body,
        branch,
        default_branch,
    )
    return {
        "repository": f"{config.target_owner}/{repo}",
        "status": "opened",
        "pr_url": str(pull.get("html_url") or ""),
        "files": len(changes),
    }
