---
name: verify-repository-change
description: Validate one planned repository change with bounded allowlisted commands and scope checks before committing. Use for Solve test, lint, typecheck, build, changed-file validation, command safety, and incremental commit phases.
---

# Verify Repository Change

Confirm that every changed path belongs to the current step and full plan. Reject
untracked or modified scope outside those paths, symlinks, empty changes, and
generated surprises.

Parse verification commands into argument vectors and execute without a shell.
Require a configured prefix allowlist. Reject composition operators, redirects,
installers, network clients, deployment, publishing, destructive commands, and
credential access. Apply per-command timeouts and RTK output compression.

Stop on the first non-zero exit. Do not retry automatically, alter the command,
weaken configuration, or commit a failed step. Preserve compact failure output
in state for diagnosis.

After all step checks pass, stage only declared files. Require a conventional
commit message and a non-empty staged diff, then create exactly one local commit.
Require a clean working tree after the final step. Do not push.
