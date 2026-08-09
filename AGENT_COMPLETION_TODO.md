# Elixpoo agent completion checklist

This is the execution checklist for taking `agent.elixpo` from a working
contribution pipeline to a complete, recoverable, observable autonomous system.
Items are ordered by dependency, not by issue number.

## Completed foundation

- [x] Scout discovers active Python, TypeScript, JavaScript, and Shell repositories.
- [x] Triage scores bounded community issues without requiring `good first issue`.
- [x] Pick enforces the ledger, blocklist, daily cap, and one-active-PR policy.
- [x] Vet reads the complete conversation and rejects occupied, resolved, tracking,
      ambiguous, or oversized work.
- [x] Solve creates an isolated fork workspace, runs the CCR coding harness through
      RTK, verifies the diff, and creates a reviewed local commit.
- [x] Submit pushes the reviewed branch and opens a disclosed upstream PR.
- [x] Steward registers submitted PRs in shared Gist memory and responds to exact
      `@elixpoo` mentions with progress receipts and a safety gate.
- [x] New explicit issue-work mentions enter the normal Pick/Vet/Solve pipeline.
- [x] Discussions support Q&A, announcements, polls, mood variance, labels, emoji
      titles, direct events, and cross-repository mention polling.

## 1. Doctor — completed

- [x] Create `agents/doctor/` as an independent squad and add its rich `SKILL.md`.
- [x] Consume only versioned `doctor_pending` receipts; never inspect an unrecorded
      live process to guess what happened.
- [x] Define a strict decision schema with `retry`, `terminate`, `preserve`, and
      `cleanup_authorized` outcomes plus evidence and retry parameters.
- [x] Make deterministic decisions for known failures before considering a cheap
      routed model call:
  - [x] authentication and permission failures;
  - [x] provider connection, rate-limit, and unavailable-model failures;
  - [x] timeouts and stalled tool loops;
  - [x] token-target and hard-ceiling breaches;
  - [x] malformed structured output;
  - [x] dependency/setup failures;
  - [x] verification or review failures;
  - [x] unsuitable or changed issues.
- [x] Detect repeated failure fingerprints and forbid whole-pipeline retry loops.
- [x] Allow at most one stage-scoped retry unless policy explicitly permits more.
- [x] Record token deltas, elapsed time, model route, retry count, and final reason
      in `state/doctor.json`; preserve Solve as the owner of token-ledger writes.
- [x] Never publish externally and never modify a target repository.
- [x] Add serialized Doctor execution to the failing Solve runner before cleanup.
- [x] Add unit tests for every decision category, idempotency, and loop prevention.

## 2. Janitor — completed

- [x] Create `agents/janitor/` as an independent squad and add its rich `SKILL.md`.
- [x] Accept cleanup only when Doctor records `cleanup_authorized` or a terminal
      decision; fail closed for active, missing, or mismatched runs.
- [x] Validate every resource against its recorded kind, locator, and safe root.
- [x] Remove only the exact recorded workspace under `/tmp/elixpoo-workspaces`.
- [x] Terminate only the CCR process group or PID recorded for that Solve run; never
      use broad process-name killing on a shared host.
- [x] Remove isolated CCR configuration, context bundles, dependency caches created
      for the run, and other explicitly recorded temporary resources.
- [x] Preserve shared forks and any workspace Doctor marked for inspection.
- [x] Make cleanup idempotent and emit `state/janitor.json` with per-resource results.
- [x] Add a bounded orphan audit for expired partial cleanup whose owning run is terminal.
- [x] Add filesystem/process tests using temporary directories and fake PIDs.
- [x] Run Janitor after Doctor in the same Solve job, including an `always()` fallback
      that records cleanup failure without hiding the original Solve failure.

## 3. Complete Steward follow-through

- [ ] Implement `agents/steward/fix.py` for maintainer change requests and CI failures.
- [ ] Reuse the existing fork branch and reviewed PR identity from Gist memory.
- [ ] Run a fresh bounded Solve session only against the requested delta.
- [ ] Push additional commits only after verification and safety checks.
- [ ] Update the progress checklist and Gist receipt after every terminal outcome.
- [ ] Implement `agents/steward/celebrate.py` for merged PRs.
- [ ] Mark the ledger merged, remove active follow-up memory, and retain a bounded
      completion receipt.
- [ ] Make celebration posts optional, cooldown-aware, and safety-gated.
- [ ] Add workflows for review comments, requested changes, CI failure, merge, and
      webhook-loss polling.
- [ ] Add rich skills for Steward Fix and Celebrate.

## 4. Gist memory and cache custodian

- [ ] Create a small Gist custodian squad and skill; it must not import other squads.
- [ ] Own schema migrations, TTL pruning, compaction, and corrupted-file recovery.
- [ ] Keep follow-up memory, merge summaries, and model cache in separate Gist files.
- [ ] Use conditional updates or revision checks to prevent concurrent lost writes.
- [ ] Bound completed receipts and handled-comment IDs.
- [ ] Never store credentials, repository source, hidden prompts, or raw model context.
- [ ] Add a manual repair command and a scheduled low-frequency purge workflow.

## 5. Discussion reliability pass

- [ ] Test a real top-level and nested `@elixpoo` reply in `elixpo/elixpo`.
- [ ] Confirm the ten-minute poll is the authoritative cross-repository fallback.
- [ ] Add pagination and per-run cursors so active threads cannot starve older mentions.
- [ ] Record handled source IDs durably instead of depending only on HTML markers.
- [ ] Isolate one failed Discussion so the remainder of the poll still completes.
- [ ] Verify Announcement, Q&A, and Poll category aliases in production.
- [ ] Verify label creation permissions and graceful behavior when labels are blocked.
- [ ] Add dry-run/preview modes for Q&A, pulse, and merge-generated posts.
- [ ] Document the mood cadence, cooldowns, and deterministic safety constraints.

## 6. End-to-end orchestration

- [ ] Define one versioned state contract for every squad input and output.
- [ ] Validate state at workflow boundaries and reject stale/mismatched receipts.
- [ ] Ensure every state-writing workflow uses the shared `state-write` concurrency lock.
- [ ] Make workflow chaining explicit from Scout through Janitor/Steward completion.
- [ ] Add bounded retries only for transient network/provider operations.
- [ ] Add a daily summary workflow for picks, rejections, PRs, merges, failures,
      token spend, and cleanup outcomes.
- [ ] Finish webhook ingress and verify signatures, replay protection, and dispatch
      allowlists while retaining polling as the loss-recovery path.
- [ ] Remove or implement every remaining `not implemented yet` entrypoint.

## 7. Security and public-action controls

- [ ] Audit each token against its exact job and remove fallback credential sharing.
- [ ] Keep target-repository commands credential-free inside the coding sandbox.
- [ ] Redact secrets, router URLs, web tokens, and authorization headers from logs.
- [ ] Require `qwen-safety` before every public comment, Discussion, PR, or issue post.
- [ ] Enforce repository opt-out/blocklist changes immediately and permanently.
- [ ] Add prompt-injection fixtures for issues, comments, repository instructions,
      command output, and dependency metadata.
- [ ] Add rate limits for comments, model calls, forks, PRs, and Discussions.
- [ ] Verify all public posts honestly disclose autonomous contribution where needed.

## 8. Cost, observability, and anomaly controls

- [ ] Give Doctor, Janitor, Steward Fix, Celebrate, and Gist Custodian explicit budgets.
- [ ] Record input, cached, output, and total tokens per role and external CCR session.
- [ ] Add alerts for repeated reads, repeated failed edits, exponential context growth,
      provider loops, and abnormally high memory/disk use.
- [ ] Report token target separately from the hard emergency ceiling.
- [ ] Prefer deterministic processing and `nova-fast`; reserve `qwen-coder` for code
      work and `perplexity-fast` for an evidenced external-search blocker.
- [ ] Add run-level correlation IDs across workflow, state, Gist, and logs.
- [ ] Expose squad health, queue depth, token spend, success rate, and cleanup debt in
      the frontend without exposing secrets or private metadata.

## 9. Validation and release gates

- [ ] Add an end-to-end owned-repository fixture covering Vet → Solve → Submit →
      Steward → Doctor/Janitor → merge completion.
- [ ] Add failure fixtures for authentication, provider outage, timeout, token breach,
      malformed output, failed setup, failed tests, and disk exhaustion.
- [ ] Test duplicate webhook delivery and concurrent scheduled runs.
- [ ] Test restart/recovery using only committed state plus Gist memory.
- [ ] Run the read-only Scout/Triage pipeline for one week and review its queue.
- [ ] Run contribution mode first against owned or pre-coordinated repositories.
- [ ] Define launch thresholds for Vet precision, successful PR rate, merge rate,
      token cost, public-post error rate, and leaked-resource count.
- [ ] Update `docs/refactor_plan.md` to match the implemented budgets, workflows,
      models, state contracts, and polling cadence.
- [ ] Publish an operator runbook covering setup, testing, failure recovery, secret
      rotation, emergency stop, blocklisting, and manual cleanup.

## Immediate execution order

1. Steward Fix.
2. Steward Celebrate.
3. Gist Custodian.
4. Discussion reliability pass.
5. End-to-end orchestration and failure testing.
6. Security/cost audit, documentation, and controlled release.
