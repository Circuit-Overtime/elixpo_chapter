"""Deterministic authorization policy for public ``@elixpoo`` mentions."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

import yaml

DEFAULT_TRUSTED_USERS = ("Circuit-Overtime", "anwe-ch", "elixpoo", "ez-vivek")
DEFAULT_TRUSTED_ORGS = ("elixpo",)
DEFAULT_WATCHLIST_PATH = Path(".github/elixpoo-whitelist.yml")
_REPOSITORY = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9_.-]+$")


class MentionRoute(StrEnum):
    DIRECT = "direct"
    VET = "vet"
    APPROVAL = "approval"
    REJECT = "reject"


def _names(value: str, default: tuple[str, ...]) -> frozenset[str]:
    items = [item.strip().casefold() for item in value.split(",") if item.strip()]
    return frozenset(items or (item.casefold() for item in default))


def _repository_names(items: list[str]) -> frozenset[str]:
    normalized: list[str] = []
    for item in items:
        repository = item.strip().casefold()
        if not _REPOSITORY.fullmatch(repository):
            raise ValueError(f"invalid watched repository: {item!r}")
        if repository in normalized:
            raise ValueError(f"duplicate watched repository: {item!r}")
        normalized.append(repository)
    return frozenset(normalized)


def _watched_repositories(path: Path) -> frozenset[str]:
    if not path.is_file():
        return frozenset()
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict) or raw.get("schema_version") != 1:
        raise ValueError(f"unsupported mention whitelist schema: {path}")
    configured = raw.get("watched_repositories") or []
    if not isinstance(configured, list) or not all(isinstance(item, str) for item in configured):
        raise ValueError("watched_repositories must be a list of owner/repository strings")
    return _repository_names(configured)


@dataclass(frozen=True)
class MentionPolicy:
    trusted_users: frozenset[str]
    trusted_orgs: frozenset[str]
    watched_repositories: frozenset[str]

    @classmethod
    def from_env(cls, *, watchlist_path: Path = DEFAULT_WATCHLIST_PATH) -> MentionPolicy:
        watched = _watched_repositories(watchlist_path)
        override = [item.strip() for item in os.getenv("ELIXPO_MENTION_WATCHED_REPOS", "").split(",") if item.strip()]
        watched = watched.union(_repository_names(override))
        return cls(
            trusted_users=_names(os.getenv("ELIXPO_MENTION_TRUSTED_USERS", ""), DEFAULT_TRUSTED_USERS),
            trusted_orgs=_names(os.getenv("ELIXPO_MENTION_TRUSTED_ORGS", ""), DEFAULT_TRUSTED_ORGS),
            watched_repositories=watched,
        )

    def route(self, author: str, repository: str, *, tracked: bool = False) -> MentionRoute:
        owner = repository.partition("/")[0].casefold()
        trusted = author.casefold() in self.trusted_users
        if owner in self.trusted_orgs:
            return MentionRoute.DIRECT if trusted else MentionRoute.APPROVAL
        if trusted:
            return MentionRoute.VET
        if tracked or repository.casefold() in self.watched_repositories:
            return MentionRoute.APPROVAL
        return MentionRoute.REJECT


def rejection_body(source_id: int) -> str:
    return (
        "> Thanks for the mention. This repository is outside elixpoo's approved scope, "
        "so I won't start work here. An Elixpo maintainer can request the work through "
        "the agent.elixpo approval queue.\n\n"
        f"<!-- elixpoo-steward:rejected:{source_id} -->"
    )
