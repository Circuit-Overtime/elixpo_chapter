"""Comprehend keeps repository discovery tracked-only and dependency-light."""

from __future__ import annotations

import subprocess

from agents.comprehend.bundle import _search_candidates


def test_candidate_search_uses_git_without_requiring_ripgrep(tmp_path, monkeypatch):
    calls: list[list[str]] = []

    def fake_run(args, **kwargs):
        calls.append(args)
        return subprocess.CompletedProcess(
            args,
            0,
            stdout="src/copy.ts\npnpm.lock\n",
            stderr="",
        )

    monkeypatch.setattr(subprocess, "run", fake_run)

    found = _search_candidates(
        tmp_path,
        "The `copyCompleteText` handler truncates content.",
        {"src/copy.ts", "pnpm.lock"},
    )

    assert found == ["src/copy.ts"]
    assert calls == [["git", "grep", "-l", "-F", "-e", "copyCompleteText", "--", "."]]
