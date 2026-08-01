"""Deterministic repository-mood classifier.

No model participates in this decision. Merged PR metadata and bounded patches
produce a mood, a Discussion genre, an emoji, and an evidence trail.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class Genre(str, Enum):
    ANNOUNCEMENT = "announcement"
    POLL = "poll"
    QNA = "qna"
    SKIP = "skip"


class Mood(str, Enum):
    ALERT = "alert"
    ENERGIZED = "energized"
    CURIOUS = "curious"
    MENTORING = "mentoring"
    RESTING = "resting"


MOOD_EMOJI = {
    Mood.ALERT: "🚨",
    Mood.ENERGIZED: "🚀",
    Mood.CURIOUS: "🗳️",
    Mood.MENTORING: "🧭",
    Mood.RESTING: "🌙",
}


@dataclass(frozen=True)
class MoodDecision:
    mood: Mood
    genre: Genre
    emoji: str
    scores: dict[str, int]
    signals: tuple[str, ...]

    @property
    def should_post(self) -> bool:
        return self.genre is not Genre.SKIP

    def model_context(self) -> dict:
        return {
            "mood": self.mood.value,
            "genre": self.genre.value,
            "emoji": self.emoji,
            "scores": self.scores,
            "evidence": list(self.signals),
        }


def _contains(text: str, words: tuple[str, ...]) -> bool:
    return any(re.search(rf"\b{re.escape(word)}\b", text) for word in words)


def assess_mood(pulls: list[dict], files: list[dict]) -> MoodDecision:
    """Classify activity from explicit, inspectable diff signals."""
    scores = {"announcement": 0, "poll": 0, "qna": 0}
    signals: list[str] = []
    paths = [str(file.get("filename", "")).casefold() for file in files]
    patch_text = "\n".join(str(file.get("patch") or "")[:2500] for file in files[:30]).casefold()
    pr_text = "\n".join(
        " ".join(
            [
                str(pull.get("title", "")),
                str(pull.get("body") or "")[:3000],
                " ".join(str(label.get("name", "")) for label in pull.get("labels", [])),
            ]
        )
        for pull in pulls
    ).casefold()
    text = f"{pr_text}\n{patch_text}"
    total_changes = sum(int(file.get("changes", 0) or 0) for file in files)

    maintenance_paths = (
        "tests/",
        "test_",
        ".github/",
        "package-lock.json",
        "poetry.lock",
        "uv.lock",
        "license",
    )
    maintenance_only = bool(paths) and all(any(term in path for term in maintenance_paths) for path in paths)
    dependency_only = _contains(pr_text, ("dependabot", "dependencies", "dependency bump", "chore(deps)"))
    critical = _contains(text, ("breaking", "security", "vulnerability", "deprecated", "deprecation", "migration"))

    if any(any(term in path for term in ("changelog", "release", "migration")) for path in paths):
        scores["announcement"] += 6
        signals.append("release or migration documentation changed")
    if critical:
        scores["announcement"] += 6
        signals.append("breaking, security, deprecation, or migration language detected")
    if any(re.match(r"^(feat|feature)(\(.+\))?!?:", str(pull.get("title", "")).casefold()) for pull in pulls):
        scores["announcement"] += 4
        signals.append("feature-style merged PR")
    user_paths = ("src/", "app/", "api/", "cli/", "public/", "agent.elixpo/src/")
    if any(any(term in path for term in user_paths) for path in paths):
        scores["announcement"] += 2
        signals.append("user-facing implementation paths changed")
    if total_changes >= 200:
        scores["announcement"] += 1
        signals.append("substantial merged diff")

    if _contains(pr_text, ("rfc", "design", "feedback", "proposal", "roadmap", "decision")):
        scores["poll"] += 5
        signals.append("explicit design or feedback signal")
    if _contains(text, ("option", "alternative", "follow-up", "next iteration", "tradeoff")):
        scores["poll"] += 3
        signals.append("unresolved option or follow-up signal")
    if any(any(term in path for term in ("config/", "schema", "interface", "settings")) for path in paths):
        scores["poll"] += 2
        signals.append("configuration or interface surface changed")

    domain_terms = ("mlops", "gitops", "docker", "kubernetes", "k8s", "helm", "container")
    if _contains(text, domain_terms) or any(any(term in path for term in domain_terms) for path in paths):
        scores["qna"] += 4
        signals.append("MLOps, GitOps, Docker, or Kubernetes change")
    if any(any(term in path for term in ("docs/", "example", "tutorial", "guide")) for path in paths):
        scores["qna"] += 3
        signals.append("documentation or example change")
    if any(re.match(r"^fix(\(.+\))?!?:", str(pull.get("title", "")).casefold()) for pull in pulls):
        scores["qna"] += 2
        signals.append("merged fix can support a diagnostic discussion")

    if maintenance_only or dependency_only:
        signals.append("maintenance-only activity")
        if not critical:
            return MoodDecision(Mood.RESTING, Genre.SKIP, MOOD_EMOJI[Mood.RESTING], scores, tuple(signals))

    candidates = [
        (scores["announcement"], 3, Genre.ANNOUNCEMENT),
        (scores["poll"], 2, Genre.POLL),
        (scores["qna"], 1, Genre.QNA),
    ]
    score, _, genre = max(candidates)
    thresholds = {Genre.ANNOUNCEMENT: 5, Genre.POLL: 5, Genre.QNA: 4}
    if score < thresholds[genre]:
        return MoodDecision(Mood.RESTING, Genre.SKIP, MOOD_EMOJI[Mood.RESTING], scores, tuple(signals))

    if genre is Genre.ANNOUNCEMENT:
        mood = Mood.ALERT if critical else Mood.ENERGIZED
    elif genre is Genre.POLL:
        mood = Mood.CURIOUS
    else:
        mood = Mood.MENTORING
    return MoodDecision(mood, genre, MOOD_EMOJI[mood], scores, tuple(signals))
