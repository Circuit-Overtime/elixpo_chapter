---
name: steward-followup-memory
description: Maintain Gist-backed memory for GitHub issues and pull requests handled by elixpoo, reconcile terminal or expired work, and answer exact @elixpoo follow-up mentions safely. Use for Submit handoff registration, Steward polling, notification intake, idempotent progress acknowledgements, conversation replies, TTL enforcement, and merge/close cleanup.
---

# Steward follow-up memory

Keep one compact JSON file in a private Gist. Store identifiers and bounded
metadata, never source snapshots, credentials, hidden prompts, or model output.

## Register work

- Key records as `owner/repository#number`.
- Store issue and PR URLs, branch, fork, title, status, timestamps, expiry, and
  handled comment IDs.
- Preserve the original opening time on idempotent updates.
- Keep records for 60–360 days, defaulting to 360, unless the subject reaches a
  terminal state sooner.

## Poll and reconcile

1. Load the Gist once.
2. Move expired active records into the bounded completion tracker.
3. Fetch each active subject from GitHub.
4. Move merged and closed subjects to completion immediately.
5. Inspect only comments not already recorded as handled.
6. Save the Gist once after the batch.

Do not infer terminal state from prose. Use GitHub's state and merged fields.

## Respond to mentions

Require an exact, case-insensitive `@elixpoo` token. Ignore bot-authored text,
email-like strings, near matches, disclosure text, and comments already marked
handled.

Post one idempotent progress acknowledgement before model work. Draft from the
current subject, triggering comment, recent bounded conversation, and stored
metadata. Route generation through the `steward` role and every public response
through `qwen-safety`. Do not expose memory internals or claim code was changed
unless a repository workflow or Solve receipt proves it.

For a previously unknown public thread discovered through GitHub notifications,
create an intake record before responding. Repository-changing requests must
enter the normal grounded repository workflow; a conversational responder must
not edit code directly.

Return a structured action with the reply. Choose `repository_work` only for an
explicit request to implement or fix the open issue itself. Questions, status
requests, reviews, pull-request follow-ups, and ambiguous requests are
`reply_only`. Dispatch repository work to the control repository; never write
Pick, Vet, or Solve state from the notification poller. The intake workflow must
enforce the blocklist, daily cap, one-active-work-per-repository rule, and the
single Pick/Vet slot before it records a `pending_vet` receipt.

## Preserve idempotency

Use stable HTML markers derived from the source comment ID for acknowledgements
and replies. Record a source ID only after the final reply exists. On transient
failure, leave it unhandled so a later poll can retry without duplicating the
acknowledgement.
