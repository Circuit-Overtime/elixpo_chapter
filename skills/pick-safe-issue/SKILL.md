---
name: pick-safe-issue
description: Select exactly one safe, justified issue from a triaged GitHub candidate queue while enforcing score, solvability, deduplication, repository concurrency, and daily limits. Use when running or reviewing the Pick squad, changing final eligibility or tie-breaking rules, interpreting pick.nothing_eligible, recording state/pick.json, or preventing repeated autonomous work.
---

# Pick Safe Issue

Choose one target only after Triage has established that it is both worthwhile
and bounded. Pick is a deterministic safety boundary, not another opportunity to
reinterpret uncertain issue text.

## Trust only the triage contract

Require all of the following:

- score meets `lib.scorer.THRESHOLD`;
- `tractable` is exactly `true`;
- `easy` is exactly `true`;
- repository is absent from the blocklist;
- `owner/repo#number` has never been recorded in the ledger;
- the repository has no other open elixpoo pull request;
- the daily contribution cap is not exhausted.

Treat missing booleans as false. Never recover an issue rejected by Triage based
on its title, popularity, label, or rationale.

## Select predictably

Rank eligible records by:

1. higher community score;
2. higher solvability confidence;
3. fewer estimated files;
4. existing queue order as the final stable tie-break.

Skip ineligible records and continue. Do not stop merely because a higher-scored
record is blocked. Return no selection when every record fails.

## Record before handoff

Before exposing a successful pick:

- record `owner/repo#number` in `state/ledger.json` with status `claimed`;
- increment the correct UTC daily count;
- write `state/pick.json` with `picked=true`, identity, score, scope, estimated
  files, confidence, justification, and timestamp.

When nothing qualifies, overwrite stale pick output with `picked=false`, a
specific reason, and the evaluation timestamp. Never leave an earlier successful
pick looking like the result of the current run.

## Keep the handoff honest

Build justification from the stored score breakdown and triage rationale. State
why this issue won; do not promise that it is already solved. Pick itself must not
comment upstream, assign an issue, fork a repository, create a branch, or open a
pull request.

Before finishing, verify that the ledger and pick file agree and that rerunning
Pick cannot return the same issue again.
