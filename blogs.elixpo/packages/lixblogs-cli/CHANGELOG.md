# Changelog

Release notes are generated from merged pull requests. This file records contract-level changes that users must see before upgrading.

## 1.5.0

- Add complete publish metadata, version history and restore, comments and replies, and provider-backed media deletion.
- Add Pollinations BYOP status and image generation/upload/attachment commands without exposing provider credentials.
- Bundle the `lixblogs-media` agent skill with explicit billing, retry, and recovery rules.

## 1.4.2

- Use the package-local, lockfile-pinned esbuild binary so packing does not
  depend on an ephemeral `npx` cache.
- Publish the attested release tarball to GitHub Packages as well as npm and
  GitHub Releases.

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
