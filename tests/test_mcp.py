"""MCP tool tests — pure functions over a tmp workspace + server smoke check."""

from __future__ import annotations

import pytest
from mcp_server import build_server
from mcp_server.tools import (
    directory_tree,
    edit_file,
    glob,
    grep,
    list_dir,
    read_file,
    write_file,
)
from mcp_server.tools._fs import PathEscape, safe_path


def test_write_read_roundtrip(tmp_path):
    assert "wrote" in write_file(tmp_path, "a/b.txt", "hello\nworld")
    out = read_file(tmp_path, "a/b.txt")
    assert "1\thello" in out and "2\tworld" in out


def test_edit_file_uniqueness(tmp_path):
    write_file(tmp_path, "f.py", "x = 1\nx = 1\n")
    # ambiguous without replace_all
    assert "occurs 2x" in edit_file(tmp_path, "f.py", "x = 1", "x = 2")
    assert "edited" in edit_file(tmp_path, "f.py", "x = 1", "x = 2", replace_all=True)
    assert "x = 2" in read_file(tmp_path, "f.py")


def test_edit_missing_old_string(tmp_path):
    write_file(tmp_path, "f.py", "abc")
    assert "not found" in edit_file(tmp_path, "f.py", "zzz", "y")


def test_glob_and_grep_and_tree(tmp_path):
    write_file(tmp_path, "src/app.py", "def main():\n    TARGET = 1\n")
    write_file(tmp_path, "src/util.py", "x = 2\n")
    write_file(tmp_path, "README.md", "# doc")
    assert "src/app.py" in glob(tmp_path, "**/*.py")
    assert "README.md" not in glob(tmp_path, "**/*.py")
    hits = grep(tmp_path, "TARGET")
    assert "src/app.py:2" in hits
    tree = directory_tree(tmp_path)
    assert "/src" in tree and "app.py" in tree


def test_list_dir(tmp_path):
    write_file(tmp_path, "z.txt", "1")
    (tmp_path / "sub").mkdir()
    out = list_dir(tmp_path)
    assert "z.txt" in out and "sub" in out


def test_path_escape_blocked(tmp_path):
    with pytest.raises(PathEscape):
        safe_path(tmp_path, "../../etc/passwd")
    # writing outside is also blocked (write_file calls safe_path)
    with pytest.raises(PathEscape):
        write_file(tmp_path, "../escape.txt", "nope")


@pytest.mark.asyncio
async def test_server_exposes_tools(tmp_path):
    server = build_server(tmp_path)
    tool_list = await server.list_tools()
    names = {t.name for t in tool_list}
    assert {"read_file", "write_file", "edit_file", "grep", "glob", "run_shell", "git"} <= names
