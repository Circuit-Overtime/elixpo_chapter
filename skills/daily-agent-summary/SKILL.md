---
name: daily-agent-summary
description: Build a deterministic sanitized daily summary of OreoFlow queues, PR outcomes, failures, token spend, and cleanup status from contracted control-repository state. Use for daily health reporting and operator review.
---

# Daily agent summary

Read only contracted state and append-only token telemetry. Never include issue
bodies, comments, prompts, source code, credentials, router URLs, or raw tool
output. Report boundary validation failures as degraded health rather than
silently trusting a raw payload.

Summaries are deterministic and use no model. Count queues, latest execution
statuses, ledger PR outcomes, and current-day tokens by role. Write one
`daily_summary.json` contract with an eight-day TTL under the shared state lock.
