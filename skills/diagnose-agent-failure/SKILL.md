---
name: diagnose-agent-failure
description: Supervise a running Solve harness and diagnose its versioned terminal failure receipts. Use to detect repeated tool chains, abnormal token growth, hard token ceilings, provider or workspace failures, malformed output, timeouts, verification failures, and retry loops; steer live work without blocking justified token headroom, then decide retry, termination, or evidence preservation after failure.
---

# Diagnose agent failure

Operate in two deterministic modes: live supervision from authenticated harness
events, and terminal diagnosis from recorded state. Never modify a target
repository or publish a reply.

## Supervise the live harness

Consume structured usage and tool events emitted by the supervised process; do
not scrape prose logs. Keep a bounded receipt in Solve state with run ID, token
target and ceiling, observed turns, tool/edit counts, repeated-chain signals,
warnings, and timestamps.

- Treat Vet's token target as advisory. Warn when crossed, but continue novel or
  productive work because some valid issues need the approved headroom.
- Stop at the absolute token ceiling.
- Steer three identical calls or a repeated two-call cycle toward existing
  evidence, an edit, or StructuredOutput. Clear the recent chain after a
  successful edit.
- Stop before the ceiling only when a repeated chain and abnormal token growth
  occur together. Never stop from cost alone while still below the hard ceiling.
- Bound telemetry and stream queues so monitoring cannot create its own memory
  leak. The Python supervisor must terminate the exact harness/CCR process group
  in `finally` on every outcome.

## Validate a terminal handoff

Require all of the following before deciding:

- `state/solve.json.status` is `doctor_pending`.
- Failure evidence has a supported schema version, category, stage, exception
  type, bounded message, retryability signal, candidate action, and timestamp.
- Cleanup belongs to Janitor and remains `blocked_on_doctor`.
- Token spend, token limit, elapsed time, run ID, and issue key come from the
  same Solve receipt.

Reject malformed, stale, or mismatched state. Do not repair it by guessing.

## Decide deterministically

Fingerprint stable failure evidence after removing temporary paths and random
identifiers. Consult bounded Doctor history before selecting an action.

- `retry`: only a transient provider/workspace failure, timeout, turn limit,
  context miss, or malformed model handoff may receive one fresh-run retry.
- `terminate`: credentials, provider funding/request, policy, token ceiling,
  stale issue, verification, or rejected review require external change.
- `preserve`: unknown or internally inconsistent failures require inspection;
  do not authorize cleanup.

The same fingerprint may consume at most one retry. A repeated fingerprint is
terminal even when the original failure was retryable. Doctor never retries a
tool call or Solve directly; it records authorization for the orchestrator.

## Record the receipt

Write a strict current decision and append it to a bounded history. Include the
run ID, issue key, fingerprint, category, stage, action, reason, retry count,
bounded delay, cleanup authorization, token evidence, elapsed time, and decision
timestamp. Carry the recorded model route and token overage without inventing
missing telemetry. Mirror only the decision identity into Solve state.

Authorize cleanup for `retry` and `terminate`. Mark `preserve` evidence as
inspection-required. Never delete files, terminate processes, adjust budgets,
change credentials, or post publicly.
