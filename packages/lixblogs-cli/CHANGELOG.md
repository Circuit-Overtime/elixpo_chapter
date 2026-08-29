# Changelog

Release notes are generated from merged pull requests. This file records contract-level changes that users must see before upgrading.

## 1.3.4

- Ship the complete CLI as one minified Node executable while retaining the
  native keychain integration and all five agent skills.
- Enforce a 100 KiB unpacked-package budget in the GitHub release gate.
- Publish a SHA-256 checksum beside the provenance-attested npm artifact.

## 1.3.0

- Added scoped organization and editorial commands.
- Added bounded, read-only creator analytics with JSON and CSV export.
- Bundled five independently installable LixBlogs agent skills.
- Added packed-artifact, Accounts device-flow, Blogs resource-contract, provenance, and rollback release gates.
