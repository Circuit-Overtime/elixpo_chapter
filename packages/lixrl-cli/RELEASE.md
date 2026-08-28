# Release 1.0.1

1. Merge the three CLI PRs in stack order.
2. Run `npm ci` and `npm test` in `packages/lixrl-cli`.
3. Run `npm pack --dry-run` and inspect the included files.
4. Configure `NPM_TOKEN` in the protected GitHub `production` environment.
5. Tag merged `main` as `lixrl-cli-v1.0.1`, or dispatch the publish workflow on merged `main`.
6. Verify `npm view @elixpo/lixrl-cli@1.0.1 version dist.integrity`.
