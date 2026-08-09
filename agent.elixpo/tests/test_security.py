from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from agents.repository_agent.core import bounded_context


def _audit_module():
    path = Path(".github/scripts/audit_tokens.py")
    spec = importlib.util.spec_from_file_location("audit_tokens", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_restricted_tokens_are_confined_to_approved_workflows():
    assert _audit_module().audit(Path.cwd()) == []


def test_prompt_injection_fixtures_remain_bounded_untrusted_data():
    fixtures = json.loads(Path("tests/fixtures/prompt_injection.json").read_text())
    context = bounded_context(
        {"title": fixtures[0]["text"], "body": "\n".join(item["text"] for item in fixtures)},
        [{"body": item["text"], "user": {"login": "attacker"}} for item in fixtures],
    )
    assert context["subject"]["title"] == fixtures[0]["text"]
    assert [item["body"] for item in context["recent_comments"]] == [
        item["text"] for item in fixtures
    ]
    assert {item["source"] for item in fixtures} == {
        "issue",
        "comment",
        "repository_instruction",
        "command_output",
        "dependency_metadata",
    }


def test_webhook_ingress_has_signature_replay_size_and_owner_gates():
    source = Path("workers/src/index.ts").read_text()
    assert "x-hub-signature-256" in source
    assert "x-github-delivery" in source
    assert "MAX_BODY_BYTES" in source
    assert "replayed(delivery)" in source
    assert "ALLOWED_ACTIONS" in source
    assert "ALLOWED_OWNERS" in source
    assert "rateLimited(fullName)" in source
    assert "D1Database" not in source
    assert "KVNamespace" not in source
