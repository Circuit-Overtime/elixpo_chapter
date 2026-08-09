---
name: clean-agent-resources
description: Validate and clean exact resources from a Doctor-authorized agent cleanup manifest. Use after Doctor chooses retry or termination, for idempotent workspace removal, verified isolated CCR process-group termination, shared-fork preservation, cleanup receipts, and local recovery audits; never use on active or undecided runs.
---

# Clean agent resources

Treat cleanup as a low-freedom destructive operation. State is untrusted until
every target is validated. Never broaden a locator, infer a resource, expand a
glob, follow a symlink, or clean by process name.

## Require authorization

- Doctor and Solve must name the same failure fingerprint.
- Doctor must explicitly set `cleanup_authorized` after `retry` or `terminate`.
- Solve cleanup status must be `authorized`.
- A `preserve` decision creates a preservation receipt without mutation.
- An existing complete receipt for the fingerprint makes the run idempotent.

Reject missing, active, mismatched, malformed, or overlarge manifests.

## Validate every resource before mutation

Preflight the whole manifest; if one resource is unsafe, clean nothing.

- Workspace: absolute, non-symlink, direct child of the configured resolved
  `/tmp/elixpoo-workspaces` root, never the root itself.
- Fork: disposition must be `preserve_shared_resource`; never delete it.
- Process group: use only an exact recorded numeric group, never the current
  group. Verify a same-user process in that group is an isolated CCR router whose
  command and temporary HOME both carry the expected markers.
- Reject unknown kinds and dispositions.

## Execute and record

Remove a validated workspace recursively. A missing workspace is a successful
idempotent result. Terminate a verified group with TERM followed by bounded KILL
only if still present. Continue across execution errors only after all resources
passed preflight, and record each outcome.

Write a bounded Janitor receipt containing the run ID, issue key, Doctor
fingerprint, status, per-resource results, and timestamp. Mark Solve cleanup
complete or partial. Never hide the original failure, delete shared forks,
touch credentials, or publish externally.
