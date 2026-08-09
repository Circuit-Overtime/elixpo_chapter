# Mention authorization

OreoFlow is the autonomous Scout-to-merge contribution flow. It may start work
from its own bounded discovery policy without a public mention.

Public `@elixpoo` mentions use a separate deterministic gate before Steward can
call a model, acknowledge the request, dispatch Vet, or modify repository state.

| Request | Route |
|---|---|
| Trusted user in an `elixpo/*` repository | Direct repository agent |
| Trusted user on an external issue | Vet, then OreoFlow only if approved |
| Any untrusted user in `elixpo/*` | Control-repository approval issue |
| Untrusted user in a configured or already-tracked repository | Control-repository approval issue |
| Untrusted user elsewhere | One polite rejection; no work starts |
| External pull-request update not already authorized | Control-repository approval issue |

Approval requests carry `elixpoo/approval-required`. A maintainer authorizes one
source-comment fingerprint by adding `elixpoo/approved`. The approval workflow
validates both labels, the embedded source identity, and the matching pending
Gist record before posting one response. Closing the request without approval
denies it.

Repository variables control the policy without code changes:

- `ELIXPO_MENTION_TRUSTED_USERS`: comma-separated GitHub logins;
- `ELIXPO_MENTION_TRUSTED_ORGS`: comma-separated organization owners;
- `ELIXPO_MENTION_WATCHED_REPOS`: comma-separated `owner/repository` names.

The Project board and `elixpo/elixpo` Discussions remain dedicated Elixpo
control surfaces. Discussion mentions continue through their own exact-mention,
deduplication, and safety gates.
