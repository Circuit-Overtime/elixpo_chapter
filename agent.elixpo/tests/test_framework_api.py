from oreoflow import Message, Router, ToolDef, Usage


def test_public_framework_exports_core_agent_types():
    assert Router.__name__ == "Router"
    assert Message(role="user", content="hello").content == "hello"
    assert ToolDef.model_fields["type"].default == "function"
    assert Usage().total_tokens == 0
