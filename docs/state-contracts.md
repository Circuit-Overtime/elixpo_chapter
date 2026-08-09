# Squad state contracts

Squad payloads remain plain JSON in `state/`. A separate
`state/contracts.json` registry binds each migrated payload to a versioned
contract without breaking operator inspection or existing `jq` checks.

Each contract records:

- schema version and state filename;
- producing squad and monotonically increasing sequence;
- SHA-256 of canonical JSON;
- status, issue key, and run ID where applicable;
- production time and optional expiry.

The payload is written first and its contract second. The contract is the commit
point: a crash between writes leaves a digest mismatch that consumers reject.
Workflows must commit the payload and `state/contracts.json` together under the
shared state-writing concurrency lock.

## Boundary rules

Consumers use `StateStore.read_state()` and declare the expected producer plus
any known run ID, issue key, maximum age, or expiry. A missing contract, unknown
future schema, altered payload, stale receipt, expired receipt, or identity
mismatch raises `StateBoundaryError` before the next squad performs work.

`allow_legacy=True` is a temporary migration control. Use it only while a named
upstream producer has not yet been converted, and remove it after all committed
state has passed through the new writer.

Producers use `StateStore.write_state()`. Do not edit `contracts.json` directly,
contract it recursively, or copy a contract between payloads.

## Current migration

- Pick and Steward Intake produce a 24-hour `pick.json` contract.
- Vet consumes that contract, preserves its run/key identity, and produces a
  24-hour `vet.json` contract.
- Solve validates the matching Pick/Vet handoff, then contracts every live and
  terminal `solve.json` receipt under its execution run ID.
- Submit consumes a fresh Solve receipt and contracts `submit.json` plus the
  terminal Submit-owned `solve.json` handoff for Steward and Janitor.

Remaining producers and consumers must be migrated before legacy compatibility
is removed globally: Scout, Triage, Doctor, Janitor, Steward, Project, and the
auxiliary ledger/rejection receipts.
