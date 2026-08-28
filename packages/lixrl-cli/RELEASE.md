# Release 1.0.1

1. Merge the CLI PR stack into `main`.
2. Confirm `NPM_TOKEN` exists in the protected GitHub `production` environment.
3. `deploy.yml` detects the changed package and runs `./deploy.sh --package --name lixrl-cli build deploy`.
4. The following GitHub job mirrors the same version with `./deploy.sh --github --name lixrl-cli build deploy`.
5. Verify `npm view @elixpo/lixrl-cli@1.0.1 version dist.integrity`.
