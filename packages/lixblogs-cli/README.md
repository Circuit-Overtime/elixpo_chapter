# @elixpo/lixblogs-cli

The official CLI for LixBlogs — publish, manage, and inspect blogs through
the supported API. Built for creators and agent/automation use.

**Status: early, in progress.** This package currently implements the
device-flow authentication foundation (`lixblogs auth ...`) only. Blog
publishing, media, organizations, and analytics commands are not yet
implemented — see the [Roadmap](#roadmap) below.

## Install (local development)

```bash
cd packages/lixblogs-cli
npm install
```

There's no published npm release yet. Once available, install will be:
```bash
npm install -g @elixpo/lixblogs-cli
```

## Usage

```bash
node bin/lixblogs.mjs --help
```

### Authentication

```bash
# Log in via device authorization
node bin/lixblogs.mjs auth login

# Check login status
node bin/lixblogs.mjs auth status

# List profiles and choose the active one
node bin/lixblogs.mjs auth profiles
node bin/lixblogs.mjs auth use work

# Log out (clears local credentials only)
node bin/lixblogs.mjs auth logout

# Revoke the token server-side and clear local credentials (destructive)
node bin/lixblogs.mjs auth revoke --yes
```

Global flags:
- `--profile <name>` — named profile to use (default: `"default"`)
- `--env <environment>` — override environment (`development` | `staging` | `production`)
- `--scope <scope>` — request an additional/alternate OAuth scope; repeatable
- `--open` — open the verification URL with the device code pre-filled
- `--accounts-url <url>` — override the Accounts issuer for local/staging tests
- `--api-url <url>` — override the LixBlogs API origin; production defaults to
  `https://blogs.elixpo.com`
- `--json` — machine-readable JSON output
- `--quiet` — suppress non-essential output
- `--yes`, `-y` — auto-confirm destructive actions (required for `revoke`)
- `--allow-insecure-fallback` — explicit opt-in: if the OS keychain is
  unavailable, use a non-persistent in-memory store instead of failing

### Service boundary

- `https://accounts.elixpo.com` issues, refreshes, and revokes OAuth tokens.
- `https://blogs.elixpo.com/api/v1` is the only production resource API.
- The CLI discovers Accounts endpoints before login and rejects incompatible
  contract versions or endpoints on an unexpected origin.
- The mock provider is available only with an explicit non-production
  environment, for example `--env development --auth-provider mock`.

The production client is public and has no client secret. Never add one to
CLI configuration, package files, or GitHub secrets.

## Development

```bash
npm test          # runs the full CLI test suite
```

Tests exercise both a mocked auth provider and, where relevant, the real
OS keychain backend on whatever machine runs them — see
`THREAT_MODEL.md` and inline comments in `src/config/KeychainCredentialStore.js`
for known platform-specific behavior (e.g. a documented WSL/keyring-rs quirk).

## Architecture

```
bin/lixblogs.mjs         CLI entry point (Node's native util.parseArgs, no
                         third-party parsing dependency)
src/auth/                Accounts provider, development mock, refresh-safe
                         authenticated client, and production safety gate
src/commands/auth/       Command logic (login, status, logout, revoke) —
                         framework-agnostic, testable independently of the CLI shell
src/config/              Credential storage (real keychain + gated fallback),
                         profile registry, config resolution, token redaction
tests/                   Full test suite
THREAT_MODEL.md          Security threat model for the auth system
```

Command logic under `src/commands/` is deliberately decoupled from the CLI
parsing layer in `bin/`, so the parser (or any other interface built on top
of these commands later) can change without touching command logic or its
tests.

## Roadmap

See [#135](https://github.com/elixpo/blogs.elixpo/issues/135) for the full
scope. Rough remaining order:

1. Finalize the versioned bearer-token API contract
   ([#136](https://github.com/elixpo/blogs.elixpo/issues/136))
2. Blog, media, organization, and stats commands
3. Interactive/browser login polish and packaging
4. Agent skill packages and cross-repository E2E coverage

## Contributing

This package is part of the [blogs.elixpo](https://github.com/elixpo/blogs.elixpo)
monorepo. See the root repository's contribution guidelines.
