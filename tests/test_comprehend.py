"""Comprehend keeps repository discovery tracked-only and dependency-light."""

from __future__ import annotations

import subprocess

from agents.comprehend.bundle import (
    _mentioned_paths,
    _read_relevant,
    _search_candidates,
    build_context_bundle,
    rank_candidate_paths,
)


def test_candidate_search_uses_git_without_requiring_ripgrep(tmp_path, monkeypatch):
    calls: list[list[str]] = []

    def fake_run(args, **kwargs):
        calls.append(args)
        term = args[args.index("-e") + 1]
        stdout = "src/copy.ts\npnpm.lock\n" if term.casefold() in {"copycompletetext", "handler"} else ""
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


def test_candidate_search_prefers_behavioral_terms_on_one_line(tmp_path, monkeypatch):
    (tmp_path / "shared.ts").write_text("const copyForLlmButton = () => clipboard.writeText(value);\n")
    (tmp_path / "page.ts").write_text("// copy\n// llm\n// button\n// clipboard\n")

    def fake_run(args, **kwargs):
        return subprocess.CompletedProcess(
            args,
            0,
            stdout="page.ts\nshared.ts\n",
            stderr="",
        )

    monkeypatch.setattr(subprocess, "run", fake_run)

    found = _search_candidates(
        tmp_path,
        "copy llm button clipboard",
        {"page.ts", "shared.ts"},
    )

    assert found[0] == "shared.ts"


def test_rank_candidate_paths_leads_with_behavior_over_mentioned_page(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "agents.comprehend.bundle.tracked_files",
        lambda workspace: [
            "app/LandingPageClient.tsx",
            "app/docs/layout.tsx",
            "app/docs/api/page.tsx",
        ],
    )
    monkeypatch.setattr(
        "agents.comprehend.bundle._search_candidates",
        lambda workspace, text, tracked, limit: [
            "app/LandingPageClient.tsx",
            "app/docs/layout.tsx",
        ],
    )

    ranked = rank_candidate_paths(
        tmp_path,
        {
            "title": "Copy for LLM is incomplete",
            "body": "Reported in app/docs/api/page.tsx",
        },
    )

    assert ranked == [
        "app/docs/layout.tsx",
        "app/LandingPageClient.tsx",
        "app/docs/api/page.tsx",
    ]


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


def test_bare_unique_filename_resolves_to_tracked_path():
    tracked = {"app/components/Footer.tsx", "app/pricing/page.tsx"}
    assert _mentioned_paths("Update `Footer.tsx` if needed.", tracked) == ["app/components/Footer.tsx"]
    ambiguous = {"app/Footer.tsx", "components/Footer.tsx"}
    assert _mentioned_paths("Update Footer.tsx.", ambiguous) == []


def test_bundle_excludes_guidance_and_shares_candidate_budget(tmp_path, monkeypatch):
    files = ["AGENTS.md", "app/pricing/page.tsx", "app/components/Footer.tsx", "package.json"]
    (tmp_path / "app/pricing").mkdir(parents=True)
    (tmp_path / "app/components").mkdir(parents=True)
    (tmp_path / "AGENTS.md").write_text("pricing copy email guidance\n" * 100)
    (tmp_path / "app/pricing/page.tsx").write_text("Enterprise hello@elixpo.com contact\n" * 100)
    (tmp_path / "app/components/Footer.tsx").write_text("clipboard hello@elixpo.com\n" * 100)
    (tmp_path / "package.json").write_text('{"scripts":{"typecheck":"tsc --noEmit"}}')
    monkeypatch.setattr("agents.comprehend.bundle.tracked_files", lambda workspace: files)
    monkeypatch.setattr(
        "agents.comprehend.bundle.rank_candidate_paths",
        lambda workspace, issue, limit: [
            "AGENTS.md",
            "app/pricing/page.tsx",
            "app/components/Footer.tsx",
        ],
    )

    bundle = build_context_bundle(
        tmp_path,
        {"title": "Add copy email to enterprise pricing", "body": "Use Footer.tsx behavior"},
        guidance_names=["AGENTS.md"],
        max_context_tokens=3200,
        max_file_tokens=1400,
    )

    assert list(bundle.guidance) == ["AGENTS.md"]
    assert "AGENTS.md" not in bundle.candidates
    assert "app/pricing/page.tsx" in bundle.candidates
    assert "app/components/Footer.tsx" in bundle.candidates
    assert "package.json" in bundle.candidates
