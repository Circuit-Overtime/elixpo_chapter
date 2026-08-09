from __future__ import annotations

import pytest
from agents.steward.mention_policy import MentionPolicy, MentionRoute


def test_mention_policy_loads_reviewed_watchlist_and_environment_override(tmp_path, monkeypatch):
    watchlist = tmp_path / "whitelist.yml"
    watchlist.write_text(
        "schema_version: 1\nwatched_repositories:\n  - Outside/Watched\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("ELIXPO_MENTION_WATCHED_REPOS", "Another/Repository")

    policy = MentionPolicy.from_env(watchlist_path=watchlist)

    assert policy.watched_repositories == frozenset({"outside/watched", "another/repository"})
    assert policy.route("visitor", "outside/watched") == MentionRoute.APPROVAL
    assert policy.route("visitor", "unknown/repository") == MentionRoute.REJECT


@pytest.mark.parametrize(
    "content, message",
    [
        ("schema_version: 2\nwatched_repositories: []\n", "unsupported"),
        ("schema_version: 1\nwatched_repositories: owner/repo\n", "must be a list"),
        ("schema_version: 1\nwatched_repositories:\n  - missing-owner\n", "invalid"),
        (
            "schema_version: 1\nwatched_repositories:\n  - Owner/Repo\n  - owner/repo\n",
            "duplicate",
        ),
    ],
)
def test_mention_policy_rejects_unsafe_watchlist(tmp_path, monkeypatch, content, message):
    watchlist = tmp_path / "whitelist.yml"
    watchlist.write_text(content, encoding="utf-8")
    monkeypatch.delenv("ELIXPO_MENTION_WATCHED_REPOS", raising=False)

    with pytest.raises(ValueError, match=message):
        MentionPolicy.from_env(watchlist_path=watchlist)
