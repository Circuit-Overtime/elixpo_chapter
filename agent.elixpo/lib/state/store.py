"""Control-repo-as-DB: read/write the JSON files under state/.

This is the ONLY durable store besides GitHub issues + the Project board. No
database. Writes are atomic (temp + rename); commit_back() pushes the files so
the next workflow in the chain sees them. state_dir is injectable for tests.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any


class StateStore:
    def __init__(self, state_dir: str | Path):
        self.dir = Path(state_dir)
        self.dir.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str) -> Path:
        return self.dir / name

    def read_json(self, name: str, default: Any = None) -> Any:
        p = self._path(name)
        if not p.exists():
            return default
        try:
            return json.loads(p.read_text() or "null")
        except json.JSONDecodeError as e:
            raise ValueError(f"{name} is not valid JSON (edited by hand?): {e}") from e

    def write_json(self, name: str, data: Any) -> None:
        p = self._path(name)
        tmp = p.with_suffix(p.suffix + ".tmp")
        tmp.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
        os.replace(tmp, p)  # atomic on POSIX

    def append_jsonl(self, name: str, row: dict[str, Any]) -> None:
        with self._path(name).open("a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")

    def read_jsonl(self, name: str) -> list[dict[str, Any]]:
        p = self._path(name)
        if not p.exists():
            return []
        return [json.loads(line) for line in p.read_text().splitlines() if line.strip()]

    def commit_back(self, message: str, *, names: list[str] | None = None) -> bool:
        """git add state files + commit + push. Returns False if nothing changed.

        Used by squads to persist state for the next workflow. Relies on the
        runner's git identity/credentials (set up by the workflow).
        """
        targets = [str(self._path(n)) for n in names] if names else [str(self.dir)]
        subprocess.run(["git", "add", *targets], check=True)
        if subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode == 0:
            return False  # nothing staged
        subprocess.run(["git", "commit", "-m", message], check=True)
        subprocess.run(["git", "push"], check=True)
        return True
