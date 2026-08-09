from __future__ import annotations

import asyncio
import base64

from agents.standard_sync.core import (
    FileChange,
    StandardConfig,
    plan_repository,
    publish_repository_update,
    scan_repositories,
    standard_digest,
)


class API:
    def __init__(self):
        self.files = {}
        self.refs = []
        self.pulls = []

    async def get_repo_contents(self, owner, repo, path):
        return {
            "type": "file",
            "content": base64.b64encode(self.files[path]).decode(),
        }

    async def list_pulls(self, owner, repo, *, state, per_page):
        return self.pulls

    async def get_default_branch(self, owner, repo):
        return "main"

    async def get_ref(self, owner, repo, ref):
        return {"object": {"sha": "base"}}

    async def get_commit(self, owner, repo, sha):
        return {"tree": {"sha": "tree-base"}}

    async def create_blob(self, owner, repo, content):
        return {"sha": f"blob-{len(content)}"}

    async def create_tree(self, owner, repo, base_tree, tree):
        assert base_tree == "tree-base"
        return {"sha": "tree-new"}

    async def create_commit(self, owner, repo, message, tree, parents):
        assert parents == ["base"]
        return {"sha": "commit-new"}

    async def create_ref(self, owner, repo, ref, sha):
        self.refs.append((ref, sha))

    async def create_pull(self, owner, repo, title, body, head, base):
        self.pulls.append({"head": {"ref": head}, "html_url": "https://example/pr/1"})
        return self.pulls[-1]


def _config() -> StandardConfig:
    return StandardConfig(
        name="test",
        target_owner="elixpo",
        exclude_repositories=frozenset(),
        files=("one.yml", "two.py"),
    )


async def test_standard_plan_reports_only_drift(tmp_path):
    (tmp_path / "one.yml").write_text("same\n")
    (tmp_path / "two.py").write_text("new\n")
    api = API()
    api.files = {"one.yml": b"same\n", "two.py": b"old\n"}

    changes = await plan_repository(api, tmp_path, _config(), "repo")

    assert [(change.path, change.status) for change in changes] == [("two.py", "update")]
    assert len(standard_digest(tmp_path, _config())) == 64


async def test_standard_publish_creates_one_tree_commit_branch_and_pr(tmp_path):
    api = API()
    changes = [FileChange(path="one.yml", content=b"content", status="update")]

    result = await publish_repository_update(
        api, tmp_path, _config(), "repo", changes, digest="a" * 64
    )
    duplicate = await publish_repository_update(
        api, tmp_path, _config(), "repo", changes, digest="a" * 64
    )

    assert result["status"] == "opened"
    assert api.refs == [("refs/heads/chore/oreoflow-standard-aaaaaaaaaa", "commit-new")]
    assert duplicate["status"] == "already_open"


async def test_standard_scan_has_bounded_concurrency_and_stable_results(tmp_path):
    (tmp_path / "one.yml").write_text("wanted\n")
    config = StandardConfig(
        name="test",
        target_owner="elixpo",
        exclude_repositories=frozenset(),
        files=("one.yml",),
    )

    class ConcurrentAPI:
        def __init__(self):
            self.active = 0
            self.maximum_active = 0

        async def get_repo_contents(self, owner, repo, path):
            self.active += 1
            self.maximum_active = max(self.maximum_active, self.active)
            try:
                await asyncio.sleep(0.01)
                return {
                    "type": "file",
                    "content": base64.b64encode(repo.encode()).decode(),
                }
            finally:
                self.active -= 1

    api = ConcurrentAPI()
    progress = []
    plans = await scan_repositories(
        api,
        tmp_path,
        config,
        ["zeta", "alpha", "beta", "gamma"],
        concurrency=2,
        on_progress=lambda completed, total, plan: progress.append((completed, total, plan.repository)),
    )

    assert api.maximum_active == 2
    assert [plan.repository for plan in plans] == ["alpha", "beta", "gamma", "zeta"]
    assert [item[0] for item in progress] == [1, 2, 3, 4]
    assert all(item[1] == 4 for item in progress)
