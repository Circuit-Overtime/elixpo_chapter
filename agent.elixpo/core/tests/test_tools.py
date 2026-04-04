"""Basic tests for MCP tools."""

import os
import tempfile

import pytest

from elixpo.mcp.tools.file_read import FileReadTool
from elixpo.mcp.tools.file_write import FileWriteTool
from elixpo.mcp.tools.file_edit import FileEditTool
from elixpo.mcp.tools.directory_tree import DirectoryTreeTool
from elixpo.mcp.tools.grep import GrepTool
from elixpo.mcp.tools.glob import GlobTool
from elixpo.mcp.registry import ToolRegistry


@pytest.fixture
def workspace(tmp_path):
    """Create a temporary workspace with some test files."""
    (tmp_path / "hello.py").write_text("print('hello world')\n")
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def main():\n    return 42\n")
    return str(tmp_path)


@pytest.mark.asyncio
async def test_file_read(workspace):
    tool = FileReadTool()
    result = await tool.execute(workspace, path="hello.py")
    assert result.success
    assert "hello world" in result.output


@pytest.mark.asyncio
async def test_file_read_not_found(workspace):
    tool = FileReadTool()
    result = await tool.execute(workspace, path="nonexistent.py")
    assert not result.success
    assert "not found" in result.error.lower()


@pytest.mark.asyncio
async def test_file_write(workspace):
    tool = FileWriteTool()
    result = await tool.execute(workspace, path="new_file.txt", content="test content")
    assert result.success
    assert os.path.exists(os.path.join(workspace, "new_file.txt"))
    with open(os.path.join(workspace, "new_file.txt")) as f:
        assert f.read() == "test content"


@pytest.mark.asyncio
async def test_file_edit(workspace):
    tool = FileEditTool()
    result = await tool.execute(
        workspace,
        path="hello.py",
        old_text="hello world",
        new_text="goodbye world",
    )
    assert result.success
    with open(os.path.join(workspace, "hello.py")) as f:
        assert "goodbye world" in f.read()


@pytest.mark.asyncio
async def test_file_edit_not_found_text(workspace):
    tool = FileEditTool()
    result = await tool.execute(
        workspace,
        path="hello.py",
        old_text="this does not exist",
        new_text="replacement",
    )
    assert not result.success


@pytest.mark.asyncio
async def test_grep(workspace):
    tool = GrepTool()
    result = await tool.execute(workspace, pattern="def main")
    assert result.success
    assert "src/main.py" in result.output


@pytest.mark.asyncio
async def test_glob(workspace):
    tool = GlobTool()
    result = await tool.execute(workspace, pattern="*.py")
    assert result.success
    assert "hello.py" in result.output


@pytest.mark.asyncio
async def test_directory_tree(workspace):
    tool = DirectoryTreeTool()
    result = await tool.execute(workspace)
    assert result.success
    assert "hello.py" in result.output
    assert "src" in result.output


@pytest.mark.asyncio
async def test_path_traversal_blocked(workspace):
    tool = FileReadTool()
    result = await tool.execute(workspace, path="../../../etc/passwd")
    assert not result.success
    assert "traversal" in result.error.lower()


def test_registry():
    from elixpo.mcp.registry import create_default_registry
    registry = create_default_registry()
    tool_defs = registry.list_tool_defs()
    names = [t.function.name for t in tool_defs]
    assert "file_read" in names
    assert "file_write" in names
    assert "shell_exec" in names
    assert "grep" in names
    assert "git_status" in names
