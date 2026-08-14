import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lixsearch"))

from pipeline.instruction import format_human_date
from pipeline.lixsearch import _parse_decision_mode


def test_human_date_ordinals():
    expected = {
        1: "August 1st 2026",
        2: "August 2nd 2026",
        3: "August 3rd 2026",
        4: "August 4th 2026",
        11: "August 11th 2026",
        12: "August 12th 2026",
        13: "August 13th 2026",
        21: "August 21st 2026",
        22: "August 22nd 2026",
        23: "August 23rd 2026",
    }
    for day, rendered in expected.items():
        value = datetime(2026, 8, day, tzinfo=timezone.utc)
        assert format_human_date(value) == rendered


def test_decision_mode_parser_is_strict_and_safe():
    assert _parse_decision_mode("DIRECT") == "direct"
    assert _parse_decision_mode("tools") == "tools"
    assert _parse_decision_mode("unknown") == "tools"
