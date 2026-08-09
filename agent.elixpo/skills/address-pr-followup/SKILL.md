---
name: address-pr-followup
description: Apply one bounded correction to an existing elixpoo pull request after current maintainer-requested changes or a failing check. Use when Steward Fix must reuse the recorded fork branch, interpret exact review and check evidence, edit only grounded PR files, verify the delta, and push one follow-up commit without restarting the original issue pipeline.
---

# Address a PR follow-up

Treat the current review and failing checks as a delta, not permission to revisit
the original implementation.

## Ground the correction

1. Confirm the recorded PR, fork repository, branch, and head SHA still match GitHub.
2. Accept only the pending action fingerprint produced from that head and the
   latest review/check IDs.
3. Read the bounded review bodies, inline comments, failed-check summaries,
   current PR diff, and exact current contents of at most five changed files.
4. Stop when the evidence is stale, contradictory, resolved, or requires a larger
   redesign than the bounded changed-file set supports.

## Make the delta

- Resolve every concrete request that belongs to the fingerprint.
- Edit only the supplied allowed paths using exact unique replacements.
- Preserve unrelated behavior, formatting conventions, and public interfaces.
- Do not add speculative refactors, dependencies, generated artifacts, or workflow
  permissions.
- Return one conventional commit message and one atomic edit batch.

## Verify and publish

- Run the language-specific repository check selected by the supervisor.
- Require a non-empty diff and a separate semantic approval against the feedback.
- Push only to the recorded fork branch after checks and review pass.
- Post a concise safety-gated receipt containing the new short SHA and checks.
- Allow one automatic attempt for a fingerprint. New evidence or a new head must
  produce a new fingerprint; never loop on the same rejected delta.

Never expose credentials to repository commands, create another PR, change the
base branch, force-push, or claim a fix without a pushed commit receipt.
