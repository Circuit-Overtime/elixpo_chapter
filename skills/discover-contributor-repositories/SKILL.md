---
name: discover-contributor-repositories
description: Discover and rank active public GitHub repositories that are suitable for bounded external contributions. Use when running or reviewing the Scout squad, changing repository search/filter heuristics, assessing repository health and contribution readiness, or producing state/candidates.json without selecting a specific issue.
---

# Discover Contributor Repositories

Find repositories where a respectful external contribution is plausible. Produce
a diverse candidate pool for Triage; never claim that a repository is easy merely
because it is popular or exposes a `good first issue` count.

## Preserve the squad boundary

- Discover repositories only. Leave issue-level solvability to Triage.
- Make no model call. Use GitHub search metadata and bounded repository checks.
- Write only `state/candidates.json`.
- Do not comment, fork, open a pull request, assign an issue, or contact maintainers.
- Treat an API failure as missing evidence. Skip or down-rank; never invent data.

## Apply hard repository filters

Reject a repository when any condition holds:

- It is archived, disabled, a fork, or has Issues disabled.
- It has no declared license.
- Its primary language is outside `config/languages.yaml`.
- It is outside the configured star range or inactive beyond the activity window.
- It appears in the ledger blocklist.
- Its topics include an elixpoo opt-out or a no-automated-contributions signal.
- GitHub search cannot prove that it has an open `good first issue` surface.

Never weaken an explicit opt-out to increase candidate count.

Target growing projects with enough maintenance evidence but room for a new
contributor: 100–15,000 stars and a default-branch push within 21 days. Repositories
above that ceiling are out of scope, even when they rank highly or carry many
good-first labels.

## Rank for contribution readiness

Rank eligible repositories using evidence in this order:

1. Contribution instructions are present.
2. The default branch has recent activity.
3. The open-issue surface is manageable rather than abandoned or overloaded.
4. A declared license and enabled Issues confirm basic contribution readiness.
5. Stars provide only a weak health signal.

Do not reward huge backlogs as if every open issue were available. Maintain the
100–2,000, 2,001–8,000, and 8,001–15,000 band round-robin so established projects
do not crowd out maintained smaller repositories.

## Keep discovery bounded

- Search each configured language within each star band.
- Require `good-first-issues:>0` in repository search.
- Deduplicate by case-sensitive `owner/name`.
- Check CONTRIBUTING only for a bounded finalist pool.
- Cap output at the configured candidate limit.
- Preserve the evidence-backed score and reasons in every candidate record.

## Produce an auditable handoff

For each candidate, emit repository identity, URL, primary language, stars,
activity timestamp, topics, issue counts, size band, contribution-guide flag,
score, and reasons. Keep output deterministic for the same GitHub snapshot.

Before finishing, verify that every output repository passed every hard filter,
the list contains no duplicates, all star bands had a fair opportunity, and no
public or cross-repository write occurred.
