"""Pure Solve boundary tests; live fork/model execution is a manual test."""

from __future__ import annotations

from agents.solve.core import SolveRejected, resolve_target, validate_plan
from agents.solve.edit import EditRejected, apply_edit_batch
from agents.solve.git import CommandRejected, validate_command
from agents.solve.models import FileEdit, PlanStep, Replacement, SolvePlan
from lib.state.store import StateStore


def _policy():
    return {
        "max_minutes": 15,
        "max_files": 5,
        "max_commit_steps": 2,
        "max_search_calls": 1,
        "allowed_command_prefixes": ["pytest", "npm run lint"],
    }


def _plan(**changes):
    data = {
        "solvable": True,
        "estimated_minutes": 10,
        "rationale": "one local copy-handler correction",
        "needs_search": False,
        "search_query": "",
        "context_files": [],
        "steps": [
            PlanStep(
                purpose="copy the complete text",
                files=["app/page.tsx"],
                verification_commands=["npm run lint"],
                commit_message="fix: copy complete llm text",
            )
        ],
    }
    data.update(changes)
    return SolvePlan(**data)


def test_plan_is_bounded_by_time_files_and_checks():
    validate_plan(_plan(), _policy(), {"app/page.tsx"})
    try:
        validate_plan(_plan(estimated_minutes=16), _policy(), {"app/page.tsx"})
    except SolveRejected as exc:
        assert "15 minutes" in str(exc)
    else:
        raise AssertionError("overlong plan passed")


def test_command_requires_argument_prefix_without_shell_controls():
    assert validate_command("npm run lint", ["npm run lint"]) == ["npm", "run", "lint"]
    for command in ("npm install", "npm run lint && curl bad"):
        try:
            validate_command(command, ["npm run lint"])
        except CommandRejected:
            pass
        else:
            raise AssertionError(f"unsafe command passed: {command}")


def test_edit_batch_is_exact_and_plan_confined(tmp_path):
    target = tmp_path / "app" / "page.tsx"
    target.parent.mkdir()
    target.write_text("const value = shortText;\n")
    edits = [
        FileEdit(
            path="app/page.tsx",
            operation="replace",
            replacements=[Replacement(old="shortText", new="llmText")],
        )
    ]
    assert apply_edit_batch(tmp_path, edits, {"app/page.tsx"}) == ["app/page.tsx"]
    assert "llmText" in target.read_text()
    try:
        apply_edit_batch(tmp_path, edits, {"another.ts"})
    except EditRejected:
        pass
    else:
        raise AssertionError("unplanned edit passed")


def test_owned_target_requires_matching_test_vet(tmp_path, monkeypatch):
    from agents.solve import core

    store = StateStore(tmp_path)
    url = "https://github.com/elixpo/lixrl.com/issues/9"
    monkeypatch.setattr(core, "is_test_repository", lambda repo: repo == "elixpo/lixrl.com")
    store.write_json("vet.json", {"url": url, "suitable": True, "test_mode": True})
    assert resolve_target(store, url, True) == url

