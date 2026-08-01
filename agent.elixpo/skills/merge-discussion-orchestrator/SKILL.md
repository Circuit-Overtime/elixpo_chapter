---
name: merge-discussion-orchestrator
description: Triage a merged GitHub pull request and its changed-file patches into an Elixpo Announcement, a future-facing Poll, or no Discussion. Use for post-merge changelog review, release communication decisions, announcement drafting, and community poll design driven by concrete merged work.
---

# Merge Discussion Orchestrator

Convert merged work into a community post only when the evidence justifies one.
Treat silence as a valid outcome: routine merges must not create noise.

## Inputs

Require the merged PR number, title, body, URL, labels, and changed-file patches.
Prioritize evidence in this order:

1. Added or changed entries in `CHANGELOG*`, release notes, or migration guides.
2. User-visible behavior shown by code, CLI, API, configuration, or documentation diffs.
3. Explicit PR claims that agree with the patches.
4. Labels and title prefixes as weak supporting signals only.

Never infer a shipped capability from a title alone. Never treat plans in an
unmerged issue, TODO, or speculative paragraph as completed work.

## Decide the outcome

Choose exactly one outcome.

### Announcement

Choose `announcement` when the merge provides concrete community value:

- a released or immediately usable capability;
- a breaking change, deprecation, security-relevant change, or migration step;
- a meaningful reliability or performance change supported by evidence;
- a community milestone that readers can verify.

Reject announcement candidates that are dependency-only, test-only, internal
refactors, formatting, typo fixes, CI maintenance, or vague implementation work.

### Poll

Choose `poll` only when the merged work exposes a real next decision and community
answers can change what happens next. Require one neutral question and 2–6 options
that are mutually distinct, feasible, and comparable under the same constraints.

Do not use a poll to ratify an already-made decision, advertise a feature, collect
generic sentiment, or ask readers to predict facts maintainers can measure.
Include an “another approach” option only when the option space is genuinely open.

### Skip

Choose `skip` whenever evidence is thin, impact is internal, the change was already
announced, or no actionable future choice exists. Give a short factual reason.

## Draft an announcement

- Keep the title specific and under 90 characters.
- Open with what changed, without celebratory filler.
- Explain why it matters to users or contributors.
- Include required migration or configuration actions.
- Link the merged PR supplied in the input.
- Stay below 300 words.
- State only versions, dates, metrics, compatibility, and availability present in
  the evidence.

## Draft a poll

- State the decision, constraints, and affected users before listing options.
- Make options short noun phrases or actions; do not combine multiple choices.
- Avoid a preferred option in the wording or order.
- Ask voters to explain workload, failure modes, or operational tradeoffs.
- Stay below 250 words before the option list.

## Output contract

Return the requested structured object with `action`, `reason`, `title`, `body`,
`options`, and `topic`. Use `mlops`, `gitops`, `docker`, or `kubernetes` only
when it is the central subject; otherwise use `general`. For `skip`, return empty `title`, `body`, and `options`. For an
announcement, return `options: []`. Do not add the bot disclosure, idempotency
marker, or safety verdict; the publisher adds them.

Before submitting, verify every factual sentence against the supplied PR or patch,
remove duplicated claims, and downgrade to `skip` if the central claim is unproven.
