# Release and compatibility policy

## Compatibility

- CLI `1.x` targets LixBlogs API `/api/v1` and the Accounts OAuth discovery contract.
- Additive response fields and commands are minor releases. Fixes without contract changes are patch releases.
- Removing a command, field, scope, or error code requires a CLI major release or API `/api/v2`.
- The resource metadata `minCliVersion` is authoritative. An older client must stop before authenticated requests and ask the user to upgrade.
- Node 18 is the supported runtime floor. Release gates run on Node 22.

## Release

1. Update the package version and `CHANGELOG.md` in a reviewed PR.
2. Run the manual **LixBlogs CLI release gate**. It tests the package, installs the exact tarball, checks bundled skills, verifies Blogs resource contracts, and runs the Accounts device-flow contract.
3. Tag the reviewed commit as `lixblogs-cli-vX.Y.Z`.
4. The publish workflow reruns the gate, checks that tag and package versions match, verifies the SHA-256 checksum, signs a GitHub/Sigstore build-provenance attestation for the exact tarball, publishes that tarball through npm trusted publishing and GitHub Packages, and creates generated GitHub release notes.

No npm token is stored in this workflow. The npm package must configure this repository and `publish-lixblogs-cli.yml` as a trusted publisher.

Consumers can verify a downloaded release with:

```bash
sha256sum --check elixpo-lixblogs-cli-*.tgz.sha256
gh attestation verify elixpo-lixblogs-cli-*.tgz --repo elixpo/blogs.elixpo
```

## Smoke criteria

The packed artifact must remain within the [100 KiB distribution budget](SIZE_BUDGET.md), install into an empty prefix, render `--help`, discover all five scoped skills, and pass auth, blog lifecycle, organization, collaboration, and analytics command tests. Accounts must pass device approval, refresh rotation, replay protection, and revocation. Blogs must pass bearer validation, concurrency/idempotency, analytics, and media request-boundary tests.

## Rollback

1. Stop a broken release with `npm deprecate @elixpo/lixblogs-cli@X.Y.Z "Do not use; upgrade to X.Y.N"`.
2. Restore the previous compatible version with `npm dist-tag add @elixpo/lixblogs-cli@GOOD latest`.
3. Open a patch PR; never reuse or delete the published version.
4. Re-run the release gate and publish a new patch tag.
5. If the API contract caused the failure, raise `minCliVersion` only after the compatible patch is available.
