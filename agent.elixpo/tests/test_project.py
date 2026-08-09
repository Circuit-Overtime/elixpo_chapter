"""GitHub Project V2 orchestration tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from agents.project.__main__ import reconcile
from agents.project.core import build_snapshots, snapshot_for_record
from lib.state.board import AGENT_STATUSES, OPERATIONS_VIEWS, Board, BoardRejected, ProjectSnapshot
from lib.state.ledger import Ledger, PRRecord
from lib.state.store import StateStore


def _fields():
    fields = {
        name: {"id": f"field-{index}", "name": name, "dataType": data_type}
        for index, (name, data_type) in enumerate(
            {
                "Issue Key": "TEXT",
                "Current Squad": "TEXT",
                "Run ID": "TEXT",
                "Branch": "TEXT",
                "PR URL": "TEXT",
                "Started At": "TEXT",
                "Updated At": "TEXT",
                "Token Target": "NUMBER",
                "Token Spend": "NUMBER",
                "Doctor Warning": "TEXT",
                "Cleanup Status": "TEXT",
            }.items()
        )
    }
    fields["Agent Status"] = {
        "id": "field-status",
        "name": "Agent Status",
        "dataType": "SINGLE_SELECT",
        "options": [{"id": f"status-{index}", "name": name} for index, name in enumerate(AGENT_STATUSES)],
    }
    return fields


def _snapshot(**updates):
    values = {
        "issue_key": "elixpo/project#9",
        "issue_node_id": "ISSUE_node",
        "issue_url": "https://github.com/elixpo/project/issues/9",
        "status": "solving",
        "current_squad": "solve",
        "run_id": "run-2",
        "branch": "patch/example-9-abcd",
        "pr_url": "",
        "started_at": "2026-08-09T10:00:00+00:00",
        "updated_at": "2026-08-09T10:05:00+00:00",
        "token_target": 120000,
        "token_spend": 40000,
        "doctor_warning": "",
        "cleanup_status": "active",
    }
    values.update(updates)
    return ProjectSnapshot(**values)


class UnitBoard(Board):
    def __init__(self, item):
        self.api = None
        self.owner = "elixpo"
        self.number = 1
        self.item = item
        self.updates = []

    async def project(self):
        return {"id": "project", "fields": {"nodes": list(_fields().values())}}

    async def ensure_fields(self, project):
        return _fields()

    async def ensure_item(self, project_id, issue_node_id):
        return self.item, False

    async def _set(self, project_id, item_id, field, value):
        self.updates.append((field["name"], value))


@pytest.mark.asyncio
async def test_board_updates_only_changed_fields_and_preserves_empty_optional_values():
    item = {
        "id": "item",
        "fieldValues": {
            "nodes": [
                {"text": "elixpo/project#9", "field": {"name": "Issue Key"}},
                {"text": "solve", "field": {"name": "Current Squad"}},
                {"text": "run-2", "field": {"name": "Run ID"}},
                {"text": "patch/example-9-abcd", "field": {"name": "Branch"}},
                {"text": "2026-08-09T10:00:00+00:00", "field": {"name": "Started At"}},
                {"text": "2026-08-09T10:04:00+00:00", "field": {"name": "Updated At"}},
                {"number": 120000.0, "field": {"name": "Token Target"}},
                {"number": 40000.0, "field": {"name": "Token Spend"}},
                {"text": "active", "field": {"name": "Cleanup Status"}},
                {"name": "claimed", "field": {"name": "Agent Status"}},
            ]
        },
    }
    board = UnitBoard(item)

    result = await board.upsert(_snapshot(run_id="", branch=""))

    assert result["created"] is False
    assert {name for name, _ in board.updates} == {"Agent Status", "Updated At"}


@pytest.mark.asyncio
async def test_board_rejects_a_stale_different_run_id():
    item = {
        "id": "item",
        "fieldValues": {
            "nodes": [
                {"text": "run-new", "field": {"name": "Run ID"}},
                {"text": "2026-08-09T11:00:00+00:00", "field": {"name": "Updated At"}},
            ]
        },
    }
    board = UnitBoard(item)

    with pytest.raises(BoardRejected, match="stale run ID"):
        await board.upsert(_snapshot(run_id="run-old", updated_at="2026-08-09T10:05:00+00:00"))


@pytest.mark.asyncio
async def test_project_item_lookup_paginates_until_issue_is_found():
    class API:
        def __init__(self):
            self.cursors = []

        async def graphql(self, query, variables):
            self.cursors.append(variables["cursor"])
            if variables["cursor"] is None:
                return {
                    "node": {
                        "items": {
                            "nodes": [{"id": "other", "content": {"id": "OTHER"}}],
                            "pageInfo": {"hasNextPage": True, "endCursor": "next"},
                        }
                    }
                }
            return {
                "node": {
                    "items": {
                        "nodes": [{"id": "wanted", "content": {"id": "ISSUE_node"}}],
                        "pageInfo": {"hasNextPage": False, "endCursor": None},
                    }
                }
            }

    api = API()
    item = await Board(api, "elixpo", 1)._find_item("project", "ISSUE_node")

    assert item["id"] == "wanted"
    assert api.cursors == [None, "next"]


@pytest.mark.asyncio
async def test_explicit_project_setup_creates_public_project_and_fields():
    class API:
        def __init__(self):
            self.calls = []

        async def graphql(self, query, variables):
            self.calls.append((query, variables))
            if "organization(login" in query:
                return {"organization": {"id": "OWNER"}, "user": None}
            if "createProjectV2(input" in query:
                return {
                    "createProjectV2": {
                        "projectV2": {"id": "PROJECT", "number": 7, "title": "Elixpoo Operations"}
                    }
                }
            if "updateProjectV2(input" in query:
                return {"updateProjectV2": {"projectV2": {"id": "PROJECT"}}}
            if "createProjectV2Field" in query:
                options = variables.get("options") or []
                data_type = variables["dataType"]
                field = {
                    "id": f"FIELD-{variables['name']}",
                    "name": variables["name"],
                    "dataType": data_type,
                }
                if data_type == "SINGLE_SELECT":
                    field["options"] = [
                        {"id": f"OPTION-{index}", "name": option["name"]}
                        for index, option in enumerate(options)
                    ]
                return {"createProjectV2Field": {"projectV2Field": field}}
            if "createProjectV2View" in query:
                return {
                    "createProjectV2View": {
                        "projectV2View": {"id": f"VIEW-{variables['name']}", "name": variables["name"]}
                    }
                }
            if "updateProjectV2View" in query:
                return {
                    "updateProjectV2View": {
                        "projectV2View": {
                            "id": variables["view"],
                            "name": "updated",
                            "filter": variables["filter"],
                        }
                    }
                }
            raise AssertionError(query)

    api = API()
    board, project = await Board.create(api, "elixpo")
    configured = {**project, "fields": {"nodes": []}, "views": {"nodes": []}}
    fields = await board.ensure_fields(configured)
    views = await board.ensure_views(configured, fields)

    assert board.number == 7
    assert set(fields) >= {"Agent Status", "Run ID", "Token Spend"}
    assert any("public:true" in query for query, _ in api.calls)
    assert [option["name"] for option in fields["Agent Status"]["options"]] == list(AGENT_STATUSES)
    assert {view["name"] for view in views} == set(OPERATIONS_VIEWS)
    assert all(view["created"] for view in views)


def test_snapshot_prefers_live_solve_and_doctor_evidence():
    record = PRRecord(
        issue_url="https://github.com/elixpo/project/issues/9",
        status="solving",
        opened_at="2026-08-09T10:00:00+00:00",
        token_spend=120,
    )
    snapshot = snapshot_for_record(
        "elixpo/project#9",
        record,
        {"node_id": "ISSUE_node", "html_url": record.issue_url},
        solve={
            "key": "elixpo/project#9",
            "status": "doctor_pending",
            "run_id": "run-1",
            "started_at": record.opened_at,
            "failed_at": "2026-08-09T10:05:00+00:00",
            "token_target": 1000,
            "token_spent": 900,
            "cleanup": {"status": "blocked_on_doctor"},
        },
        submit={},
        doctor={"key": "elixpo/project#9", "current": {"reason": "provider unavailable"}},
        janitor={},
        steward_fix={},
    )

    assert snapshot.status == "cleanup pending"
    assert snapshot.current_squad == "doctor"
    assert snapshot.doctor_warning == "provider unavailable"
    assert snapshot.token_target == 1000
    assert snapshot.cleanup_status == "blocked_on_doctor"


@pytest.mark.asyncio
async def test_build_snapshots_isolates_invalid_ledger_records_and_includes_rejected_pick():
    class API:
        async def get_issue(self, owner, repo, number):
            return {
                "node_id": f"ISSUE_{number}",
                "html_url": f"https://github.com/{owner}/{repo}/issues/{number}",
            }

    ledger = Ledger(
        prs={
            "elixpo/project#9": PRRecord(issue_url="https://github.com/elixpo/project/issues/9"),
            "broken/repo#1": PRRecord(issue_url=""),
        }
    )
    snapshots, failures = await build_snapshots(
        API(),
        ledger,
        {
            "pick": {
                "status": "rejected",
                "url": "https://github.com/elixpo/another/issues/3",
                "vetted_at": "2026-08-09T10:00:00+00:00",
            }
        },
    )

    assert {item.issue_key for item in snapshots} == {"elixpo/project#9", "elixpo/another#3"}
    assert next(item for item in snapshots if item.issue_key.endswith("#3")).status == "rejected"
    assert failures == [{"key": "broken/repo#1", "error": "ledger record has no issue URL"}]


@pytest.mark.asyncio
async def test_reconcile_isolates_one_project_item_failure(tmp_path, monkeypatch):
    store = StateStore(tmp_path)
    Ledger(
        prs={
            "elixpo/project#9": PRRecord(issue_url="https://github.com/elixpo/project/issues/9"),
            "elixpo/project#10": PRRecord(issue_url="https://github.com/elixpo/project/issues/10"),
        }
    ).save(store)

    class API:
        async def get_issue(self, owner, repo, number):
            return {"node_id": f"ISSUE_{number}", "html_url": f"https://github.com/{owner}/{repo}/issues/{number}"}

    class Project:
        async def upsert(self, snapshot):
            if snapshot.issue_key.endswith("#10"):
                raise RuntimeError("field unavailable")
            return {"item_id": "item-9", "created": False, "updated_fields": []}

    result = await reconcile(API(), Project(), store)

    assert result["status"] == "partial"
    assert [item["key"] for item in result["items"]] == ["elixpo/project#9"]
    assert result["failures"] == [{"key": "elixpo/project#10", "error": "field unavailable"}]


def test_project_workflow_and_docs_define_recovery_and_dedicated_token():
    workflow = Path(".github/workflows/project.yml").read_text(encoding="utf-8")
    docs = Path("docs/project-operations.md").read_text(encoding="utf-8")

    assert 'cron: "*/15 * * * *"' in workflow
    assert "ELIXPOO_GITHUB_PROJECT_TOKEN" in workflow
    assert "group: state-write" in workflow
    assert "python -m agents.project" in workflow
    assert "read/write access to the selected GitHub Project" in docs
