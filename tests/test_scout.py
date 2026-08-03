"""Scout tests — pure filters + discovery orchestration with a fake GitHub API."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from agents.scout.discover import has_contributing, search_repos
from agents.scout.filters import health_score, is_active, opted_out, passes_filters

NOW = datetime(2026, 6, 20, tzinfo=timezone.utc)
LANGS = {"python", "typescript"}


def _repo(**kw):
    base = {
        "full_name": "o/r",
        "stargazers_count": 500,
        "language": "Python",
        "pushed_at": "2026-06-19T00:00:00Z",
        "topics": [],
        "archived": False,
        "fork": False,
        "has_issues": True,
        "license": {"key": "mit"},
        "open_issues_count": 5,
        "html_url": "https://github.com/o/r",
    }
    base.update(kw)
    return base


# --- filters ---

def test_is_active_and_opt_out():
    assert is_active("2026-06-19T00:00:00Z", NOW) is True
    assert is_active("2026-01-01T00:00:00Z", NOW) is False
    assert opted_out(["elixpoo-opt-out"]) is True
    assert opted_out(["web", "cli"]) is False


def test_passes_filters_accept():
    ok, reasons = passes_filters(_repo(), LANGS, set(), NOW)
    assert ok is True and "500★" in reasons[0]


@pytest.mark.parametrize(
    "repo,why",
    [
        (_repo(full_name="bad/repo"), "blocklisted"),
        (_repo(stargazers_count=50), "stars"),
        (_repo(stargazers_count=15001), "stars"),
        (_repo(language="Brainfuck"), "language"),
        (_repo(pushed_at="2026-01-01T00:00:00Z"), "inactive"),
        (_repo(archived=True), "archived"),
        (_repo(fork=True), "fork"),
        (_repo(has_issues=False), "issues disabled"),
        (_repo(open_issues_count=0), "no open issue"),
        (_repo(license=None), "license"),
        (_repo(topics=["no-ai-contributions"]), "opted_out"),
    ],
)
def test_passes_filters_reject(repo, why):
    ok, reasons = passes_filters(repo, LANGS, {"bad/repo"}, NOW)
    assert ok is False
    assert any(why in r for r in reasons)


def test_health_score_rewards_signals():
    low = health_score(_repo(stargazers_count=100, open_issues_count=300), False, NOW)
    high = health_score(_repo(stargazers_count=10000, open_issues_count=30), True, NOW)
    assert high > low


def test_health_score_prefers_manageable_active_backlog():
    manageable = health_score(_repo(open_issues_count=20), True, NOW)
    overloaded = health_score(_repo(open_issues_count=900), True, NOW)
    stale = health_score(_repo(open_issues_count=20, pushed_at="2026-05-22T00:00:00Z"), True, NOW)
    assert manageable > overloaded
    assert manageable > stale


# --- discovery with a band-aware fake API ---

import re  # noqa: E402


class FakeAPI:
    """Band-aware fake: returns only items whose stars fall in the query's range,
    so star-band searches behave like the real GitHub API. Records queries."""

    def __init__(self, items, contributing=True):
        self._items = items
        self._contributing = contributing
        self.queries: list[str] = []

    @property
    def searches(self) -> int:
        return len(self.queries)

    async def _request(self, method, path, **kwargs):
        if path == "/search/repositories":
            q = kwargs.get("params", {}).get("q", "")
            self.queries.append(q)
            m = re.search(r"stars:(\d+)\.\.(\d+)", q)
            lo, hi = (int(m.group(1)), int(m.group(2))) if m else (0, 10**9)
            return {"items": [r for r in self._items if lo <= r.get("stargazers_count", 0) <= hi]}
        if "/contents/" in path:
            if self._contributing:
                return {"path": path}
            raise RuntimeError("404")
        raise AssertionError(f"unexpected {path}")


@pytest.mark.asyncio
async def test_search_query_does_not_require_good_first():
    api = FakeAPI([_repo()])
    await search_repos(api, "python", 100, 2000, "2026-05-21")
    assert "good-first-issues" not in api.queries[0]


@pytest.mark.asyncio
async def test_has_contributing_true_false():
    assert await has_contributing(FakeAPI([], contributing=True), "o/r") is True
    assert await has_contributing(FakeAPI([], contributing=False), "o/r") is False


@pytest.mark.asyncio
async def test_discover_filters_rejects_and_enriches():
    from agents.scout.__main__ import discover_candidates

    items = [
        _repo(full_name="o/good", stargazers_count=8000, open_issues_count=20),  # mid
        _repo(full_name="o/tiny", stargazers_count=10),                          # rejected: stars
        _repo(full_name="o/optout", stargazers_count=500, topics=["no-ai"]),     # rejected: opt-out
        _repo(full_name="o/ok", stargazers_count=300),                           # small
    ]
    cands = await discover_candidates(FakeAPI(items), ["python"], blocklist=set(), now=NOW, check_contributing=True)
    names = {c.full_name for c in cands}
    assert {"o/good", "o/ok"} <= names
    assert "o/tiny" not in names and "o/optout" not in names
    assert all(c.has_contributing for c in cands)
    assert all(c.open_issues > 0 for c in cands)


@pytest.mark.asyncio
async def test_discover_mixes_star_bands():
    """Round-robin selection represents small, mid AND large — not just giants."""
    from agents.scout.__main__ import discover_candidates

    items = [
        _repo(full_name="o/small", stargazers_count=500),     # small band
        _repo(full_name="o/mid", stargazers_count=6000),      # mid band
        _repo(full_name="o/large", stargazers_count=12000),   # established target band
    ]
    cands = await discover_candidates(FakeAPI(items), ["python"], blocklist=set(), now=NOW)
    assert {c.band for c in cands} == {"small", "mid", "large"}


@pytest.mark.asyncio
async def test_discover_excludes_famous_repositories():
    from agents.scout.__main__ import discover_candidates

    items = [
        _repo(full_name="o/growing", stargazers_count=8000),
        _repo(full_name="o/famous", stargazers_count=35554),
    ]
    cands = await discover_candidates(FakeAPI(items), ["python"], blocklist=set(), now=NOW)
    assert [c.full_name for c in cands] == ["o/growing"]


@pytest.mark.asyncio
async def test_discover_search_only_skips_contributing():
    """The opt-out path does no per-repo CONTRIBUTING fetch; one search per band."""
    from agents.scout.__main__ import BANDS, discover_candidates

    api = FakeAPI([_repo(full_name="o/a", stargazers_count=500)])
    cands = await discover_candidates(api, ["python"], blocklist=set(), now=NOW, check_contributing=False)
    assert cands and cands[0].has_contributing is False
    assert api.searches == len(BANDS)  # one search per star band, zero contents calls
