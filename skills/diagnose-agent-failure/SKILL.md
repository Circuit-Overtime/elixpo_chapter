---
name: diagnose-agent-failure
description: Diagnose a versioned agent failure receipt and authorize exactly one fail-closed recovery outcome. Use when Solve records doctor_pending after provider, credential, timeout, token, structured-output, workspace, verification, review, stale-issue, policy, or unknown failures; also use to detect repeated failure loops and decide retry, termination, or evidence preservation.
---

# Diagnose agent failure

Read only recorded state. Do not infer a failure from a live process, partial log,
or public conversation, and never modify a target repository or publish a reply.

## Validate the handoff

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
