# Release @elixpo/lixrl-cli

1. Merge the package version and changelog into `main`.
2. Confirm the publishing account with `npm whoami`.
3. Run `./deploy.sh --package build deploy --no-bump` from the repository root. The command installs, tests, packs, and publishes the current version.
4. Alternatively, dispatch `publish-lixrl-cli.yml` on merged `main` for the protected, attested npm and GitHub release. Do not run both publication paths for the same version.
5. Verify the released version and integrity with `npm view @elixpo/lixrl-cli@<version> version dist.integrity`.
