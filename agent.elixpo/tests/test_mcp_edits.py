"""Tests for the coding-agent edit tools: multi_edit, delete, move, apply_patch."""

from __future__ import annotations

import subprocess

from mcp_server.tools import (
    apply_patch,
    delete_file,
    move_file,
    multi_edit,
    read_file,
    write_file,
)


def test_multi_edit_atomic(tmp_path):
    write_file(tmp_path, "f.py", "a = 1\nb = 2\nc = 3\n")
    out = multi_edit(tmp_path, "f.py", [{"old": "a = 1", "new": "a = 9"}, {"old": "c = 3", "new": "c = 7"}])
    assert "applied 2 edits" in out
    body = read_file(tmp_path, "f.py")
    assert "a = 9" in body and "c = 7" in body


def test_multi_edit_rolls_back_on_bad_edit(tmp_path):
    write_file(tmp_path, "f.py", "a = 1\n")
    out = multi_edit(tmp_path, "f.py", [{"old": "a = 1", "new": "a = 9"}, {"old": "zzz", "new": "q"}])
    assert "not found" in out
    # nothing written because the second edit failed
    assert "a = 1" in read_file(tmp_path, "f.py")


def test_delete_and_move(tmp_path):
    write_file(tmp_path, "x.txt", "hi")
    assert "deleted" in delete_file(tmp_path, "x.txt")
    assert "not found" in delete_file(tmp_path, "x.txt")

    write_file(tmp_path, "src.txt", "data")
    assert "moved" in move_file(tmp_path, "src.txt", "sub/dst.txt")
    assert "data" in read_file(tmp_path, "sub/dst.txt")


def test_apply_patch(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    write_file(tmp_path, "g.py", "x = 1\n")
    diff = (
        "--- a/g.py\n"
        "+++ b/g.py\n"
        "@@ -1 +1 @@\n"
        "-x = 1\n"
        "+x = 42\n"
    )
    out = apply_patch(tmp_path, diff)
    assert out == "patch applied"
    assert "x = 42" in read_file(tmp_path, "g.py")


def test_apply_patch_bad_diff(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    write_file(tmp_path, "g.py", "x = 1\n")
    bad = "--- a/g.py\n+++ b/g.py\n@@ -1 +1 @@\n-NOPE\n+y\n"
    assert apply_patch(tmp_path, bad).startswith("error")
