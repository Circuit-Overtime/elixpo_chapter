"""Deterministic authorization policy for public ``@elixpoo`` mentions."""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import StrEnum

DEFAULT_TRUSTED_USERS = ("Circuit-Overtime", "anwe-ch", "elixpoo", "ez-vivek")
DEFAULT_TRUSTED_ORGS = ("elixpo",)


class MentionRoute(StrEnum):
    DIRECT = "direct"
    VET = "vet"
    APPROVAL = "approval"
    REJECT = "reject"


def _names(value: str, default: tuple[str, ...]) -> frozenset[str]:
    items = [item.strip().casefold() for item in value.split(",") if item.strip()]
    return frozenset(items or (item.casefold() for item in default))


@dataclass(frozen=True)
class MentionPolicy:
    trusted_users: frozenset[str]
    trusted_orgs: frozenset[str]
    watched_repositories: frozenset[str]

    @classmethod
    def from_env(cls) -> MentionPolicy:
        return cls(
            trusted_users=_names(
                os.getenv("ELIXPO_MENTION_TRUSTED_USERS", ""), DEFAULT_TRUSTED_USERS
            ),
            trusted_orgs=_names(
                os.getenv("ELIXPO_MENTION_TRUSTED_ORGS", ""), DEFAULT_TRUSTED_ORGS
            ),
            watched_repositories=_names(
                os.getenv("ELIXPO_MENTION_WATCHED_REPOS", ""), ()
            ),
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
