---
name: github-discussion-publisher
description: Validate, moderate, deduplicate, categorize, and publish Elixpo GitHub Discussions and replies through the bot identity. Use immediately before any public Announcement, Q&A, Poll, or @elixpoo reply, and when implementing GitHub GraphQL publication, safety gates, idempotency, disclosure, or failure handling.
---

# GitHub Discussion Publisher

Apply this skill as the final gate for every public Discussion title, body, and
reply. Fail closed: an uncertain validation or moderation result means no post.

## Pre-publication sequence

Perform these steps in order:

1. Validate the event and target repository.
2. Derive a stable source marker from the PR, schedule date, discussion, or comment.
3. Search recent Discussions or comments for that exact marker.
4. Reject duplicates before making a generation call when possible.
5. Validate required title, body, category, and poll options.
6. Append the autonomous-contributor disclosure and marker.
7. Send the complete final title and body through the RTK `safety` role.
8. Publish only after an explicit safe verdict.
9. Log the created URL or a factual skip reason without logging secrets.

Never call Pollinations directly. Use `rtk.Router` so budget, ledger, role mapping,
and model changes remain centralized. Use only `ELIXPO_POLLINATIONS_API_KEY` for
provider authentication.

## Moderate the complete post

Evaluate the exact text that would become public, including the title, disclosure,
and option list. Reject content containing harassment, hate, sexual exploitation,
instructions facilitating wrongdoing, exposed credentials or personal data,
targeted abuse, deceptive impersonation, or unsafe operational instructions.

Also reject a verdict that is empty, malformed, ambiguous, or not explicitly safe.
Never reinterpret “unsafe” as safe because it contains the substring “safe.”

## Preserve identity and disclosure

Publish with the configured elixpoo-owned GitHub token. Append:

```markdown
---
_Posted by @elixpoo, an autonomous contributor._
```

Do not claim maintainer authorship or hide automation. Prevent loops by ignoring
events authored by `elixpoo`, `elixpoo[bot]`, or the configured bot username.

## Map categories

- Announcement: accept `Announcement` or `Announcements`.
- Q&A: accept `Q&A`, `QNA`, or `Questions and Answers`.
- Poll: accept `Poll` or `Polls`.

Stop with an actionable error when a required category is absent. Do not silently
post into a semantically different category.

## Apply labels

Resolve labels from the Discussion source repository before creating a post.
Create missing deterministic labels, then apply them through
`addLabelsToLabelable` after creation:

- always apply `announcement`, `qna`, or `poll` for the post type;
- apply `mlops`, `gitops`, `docker`, or `kubernetes` only for the primary domain;
- always apply `elixpoo-generated`.

Require Discussions and Issues write permission on the source repository. Never
reuse a label ID from another repository because labels are repository-scoped.

GitHub’s public GraphQL API does not create native poll options. Publish numbered
options in the Poll body and ask readers to reply with an option plus reasoning.
Require 2–6 non-empty options.

## Keep publication idempotent

Use HTML comments so markers remain invisible in rendered prose:

```text
<!-- elixpoo-discussions:merge:<pr-node-id> -->
<!-- elixpoo-discussions:qna:<utc-date> -->
<!-- elixpoo-discussions:reply:<source-node-id> -->
```

Check top-level comments and nested replies. A workflow retry must find the marker
and exit successfully without generating or posting again.

## Handle failures

- Missing credentials or repository: fail the run with a configuration hint.
- Missing category or GraphQL error: fail without falling back to another identity.
- Unsafe draft: log a redacted block reason and exit without publishing.
- Non-eligible mention or duplicate: log a skip and exit successfully.
- Provider or GitHub transient error: allow the client’s bounded retry policy; do
  not add an unbounded loop.

Never log API keys, authorization headers, full webhook payloads, or user secrets.
