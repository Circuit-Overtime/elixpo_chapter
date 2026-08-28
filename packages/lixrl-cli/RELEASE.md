# Release 1.0.1

1. Merge the three CLI PRs in stack order.
2. Run `npm ci` and `npm test` in `packages/lixrl-cli`.
3. Run `npm pack --dry-run` and inspect the included files.
4. Confirm `npm whoami` uses the Elixpo publishing account.
5. Publish with `npm publish --access public` from `packages/lixrl-cli`.
6. Verify `npm view @elixpo/lixrl-cli@1.0.1 version dist.integrity`.
