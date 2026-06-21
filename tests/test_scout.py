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
        (_repo(stargazers_count=99999), "stars"),
        (_repo(language="Brainfuck"), "language"),
        (_repo(pushed_at="2026-01-01T00:00:00Z"), "inactive"),
        (_repo(archived=True), "archived"),
        (_repo(topics=["no-ai-contributions"]), "opted_out"),
    ],
)
def test_passes_filters_reject(repo, why):
    ok, reasons = passes_filters(repo, LANGS, {"bad/repo"}, NOW)
    assert ok is False
    assert any(why in r for r in reasons)


def test_health_score_rewards_signals():
    low = health_score(_repo(stargazers_count=100, open_issues_count=0, license=None), False)
    high = health_score(_repo(stargazers_count=10000, open_issues_count=30, license={"key": "mit"}), True)
    assert high > low


# --- discovery with a fake API ---

class FakeAPI:
    def __init__(self, items, contributing=True):
        self._items = items
        self._contributing = contributing
        self.searches = 0

    async def _request(self, method, path, **kwargs):
        if path == "/search/repositories":
            self.searches += 1
            return {"items": self._items}
        if "/contents/" in path:
            if self._contributing:
                return {"path": path}
            raise RuntimeError("404")
        raise AssertionError(f"unexpected {path}")


@pytest.mark.asyncio
async def test_search_repos_builds_query():
    api = FakeAPI([_repo()])
    items = await search_repos(api, "python", 100, 50000, "2026-05-21")
    assert items and api.searches == 1


@pytest.mark.asyncio
async def test_has_contributing_true_false():
    assert await has_contributing(FakeAPI([], contributing=True), "o/r") is True
    assert await has_contributing(FakeAPI([], contributing=False), "o/r") is False


@pytest.mark.asyncio
async def test_discover_candidates_filters_and_scores():
    from agents.scout.__main__ import discover_candidates

    items = [
        _repo(full_name="o/good", stargazers_count=8000, open_issues_count=20),
        _repo(full_name="o/small", stargazers_count=10),          # rejected: stars
        _repo(full_name="o/optout", topics=["no-ai"]),            # rejected: opt-out
        _repo(full_name="o/ok", stargazers_count=300),
    ]
    api = FakeAPI(items)
    # check_contributing=True exercises the optional enrich path
    cands = await discover_candidates(api, ["python"], blocklist=set(), now=NOW, check_contributing=True)
    names = [c.full_name for c in cands]
    assert "o/good" in names and "o/ok" in names
    assert "o/small" not in names and "o/optout" not in names
    # sorted by score desc
    assert cands[0].full_name == "o/good"
    assert all(c.has_contributing for c in cands)


@pytest.mark.asyncio
async def test_discover_search_only_is_fast_no_per_repo_calls():
    """Default path does NO per-repo HTTP (no CONTRIBUTING fetch)."""
    from agents.scout.__main__ import discover_candidates

    api = FakeAPI([_repo(full_name="o/a", stargazers_count=500)])
    cands = await discover_candidates(api, ["python"], blocklist=set(), now=NOW)
    assert cands and cands[0].has_contributing is False
    assert api.searches == 1  # one search, zero contents calls
