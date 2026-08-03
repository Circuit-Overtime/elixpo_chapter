"""Comprehend keeps repository discovery tracked-only and dependency-light."""

from __future__ import annotations

import subprocess

from agents.comprehend.bundle import _read_relevant, _search_candidates


def test_candidate_search_uses_git_without_requiring_ripgrep(tmp_path, monkeypatch):
    calls: list[list[str]] = []

    def fake_run(args, **kwargs):
        calls.append(args)
        term = args[args.index("-e") + 1]
        stdout = (
            "src/copy.ts\npnpm.lock\n"
            if term.casefold() in {"copycompletetext", "handler"}
            else ""
        )
        return subprocess.CompletedProcess(
            args,
            0 if stdout else 1,
            stdout=stdout,
            stderr="",
        )

    monkeypatch.setattr(subprocess, "run", fake_run)

    found = _search_candidates(
        tmp_path,
        "The `copyCompleteText` handler truncates content.",
        {"src/copy.ts", "pnpm.lock"},
    )

    assert found == ["src/copy.ts"]
    assert calls[0] == ["git", "grep", "-l", "-i", "-F", "-e", "copyCompleteText", "--", "."]


def test_candidate_search_ranks_files_matching_multiple_issue_terms(tmp_path, monkeypatch):
    matches = {
        "copy": "app/docs/layout.tsx\napp/other.tsx\n",
        "llm": "app/docs/layout.tsx\n",
        "button": "app/docs/layout.tsx\napp/button.tsx\n",
    }

    def fake_run(args, **kwargs):
        term = args[args.index("-e") + 1].casefold()
        stdout = matches.get(term, "")
        return subprocess.CompletedProcess(args, 0 if stdout else 1, stdout=stdout, stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    tracked = {"app/docs/layout.tsx", "app/other.tsx", "app/button.tsx"}

    found = _search_candidates(tmp_path, "Copy the full LLM text from the button", tracked)

    assert found[0] == "app/docs/layout.tsx"


def test_relevant_read_keeps_middle_match_with_small_budget(tmp_path):
    target = tmp_path / "layout.tsx"
    target.write_text(
        "\n".join(
            [
                *[f"const head{i} = {i};" for i in range(150)],
                "const handleCopyForLlm = () => navigator.clipboard.writeText(payload);",
                *[f"const tail{i} = {i};" for i in range(150)],
            ]
        )
    )

    excerpt = _read_relevant(tmp_path, "layout.tsx", ["copy", "llm"], max_tokens=300)

    assert "handleCopyForLlm" in excerpt
    assert "head0" not in excerpt
    assert "tail149" not in excerpt
