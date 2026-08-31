# @elixpo/lixblogs-cli

The official CLI for LixBlogs — publish, manage, and inspect blogs through
the supported API. Built for creators and agent/automation use.

This package implements production device-flow authentication and the core
blog lifecycle over the stable LixBlogs API v1 contract. Its output stays
compact and predictable for both terminals and automation.

## Install (local development)

```bash
cd packages/lixblogs-cli
npm install
```

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
node bin/lixblogs.mjs login
# Credentials are saved under the authenticated username and made active.

# Save credentials under an explicit local profile name
node bin/lixblogs.mjs login --profile personal

# Check login status
node bin/lixblogs.mjs whoami

# List profiles and choose the active one
node bin/lixblogs.mjs profiles
node bin/lixblogs.mjs use work

# Log out (clears local credentials only)
node bin/lixblogs.mjs logout

# Revoke the token server-side and clear local credentials (destructive)
node bin/lixblogs.mjs auth revoke --yes
```

Interactive login shows one compact device card and stays quiet while Accounts
approval is pending. Press Enter to open the verification URL locally, use
`--open` to open it immediately, or copy the URL to any browser when connected
to a VPS. Device authorization does not require a localhost callback or an
exposed port. The authenticated username becomes the local profile alias unless
`--profile` explicitly overrides it. Run `lixblogs login` again to add another
account, `lixblogs profiles` to list saved accounts, and
`lixblogs use <username>` to switch the active one.

### Blog lifecycle

Request the permissions needed for the operations you intend to use:

```bash
node bin/lixblogs.mjs auth login \
  --scope openid --scope profile --scope lixblogs:blog:read \
  --scope lixblogs:blog:write --scope lixblogs:blog:publish \
  --scope lixblogs:blog:delete
```

Then work with Markdown without any database or Cloudflare credentials:

```bash
lixblogs blog list --status draft
lixblogs blog create --file post.md --title "A new post" --tag engineering
lixblogs blog get <id> --json
lixblogs blog edit <id> --editor
lixblogs blog publish <id> --yes
lixblogs blog unpublish <id> --yes
lixblogs blog delete <id> --yes
lixblogs blog list --status trashed
lixblogs blog restore <id> --yes
lixblogs blog history <id>
lixblogs blog restore-version <id> --version <version-id> --yes
```

Titles, subtitles, slugs, tags, icon emoji, cover URL/position/zoom, publication target, collection, comment policy, membership, secret state, and published/unlisted visibility are supported by `blog create`, `blog edit`, and `blog publish`.

Inspect valid publication targets before assigning organization metadata:

```bash
lixblogs org list
lixblogs org get ORG_ID
lixblogs org collections ORG_ID
lixblogs org members ORG_ID
lixblogs org targets --json
```

Organization lookup is membership-bound. A slug alone never grants access;
the API resolves the authenticated user's role before returning tenant data.

Editorial collaboration stays separate from publishing:

```bash
lixblogs collab invitations
lixblogs collab list BLOG_ID
lixblogs collab invite BLOG_ID --user reviewer --role viewer --yes
lixblogs collab role BLOG_ID --user reviewer --role editor --yes
lixblogs collab accept BLOG_ID --yes
lixblogs collab decline BLOG_ID --yes
```

Viewer, editor, and admin roles grant different editorial authority. None of
these commands publishes a post; public-state changes still use `blog publish`
with the publish scope and a separate confirmation.

### Creator analytics

Analytics is read-only and uses bounded date ranges and dimensions:

```bash
lixblogs login --scope openid --scope profile --scope lixblogs:analytics:read
lixblogs analytics query --range 30d --dimension overview --json --no-input
lixblogs analytics query --scope org:ORG_ID --range custom \
  --from 2026-07-01 --to 2026-07-31 --dimension posts --limit 25 --json --no-input
lixblogs analytics export --dimension timeline --format csv --output analytics.csv
```

Organization analytics also requires `lixblogs:organizations:read`. Results contain
aggregates only; the API does not expose visitor identifiers or credentials.
Exports refuse to overwrite an existing file.

### Comments and media

```bash
lixblogs comment list BLOG_ID
lixblogs comment add BLOG_ID --content "Clear explanation"
lixblogs comment reply BLOG_ID --parent COMMENT_ID --content "Following up"
lixblogs comment delete BLOG_ID --comment COMMENT_ID --yes

lixblogs media upload --file diagram.webp --blog BLOG_ID --type inline --attach
lixblogs integrations pollinations-status --json
lixblogs media generate --prompt "Editorial illustration" --model flux \
  --blog BLOG_ID --type cover --attach --output cover.jpg
lixblogs media delete MEDIA_ID --yes
```

Pollinations generation uses the creator's BYOP connection in LixBlogs Settings. The provider key is never stored by the CLI. Generation is an explicit billable request and is not retried automatically; retain the local output and use `media upload` if Cloudinary persistence needs to be retried.

### Agent skills

The npm artifact bundles each skill independently:

```bash
lixblogs skill list
lixblogs skill inspect lixblogs-author
lixblogs skill install lixblogs-author --target .agents/skills --dry-run
lixblogs skill install lixblogs-author --target .agents/skills --yes
```

Install only the skill needed by the current agent. Existing files are not
replaced unless `--force --yes` is explicit. The bundled skill declares its
minimum compatible CLI version and scopes.

`create`, `edit`, `publish`, `unpublish`, `delete`, and `restore` accept
`--dry-run`. Content input is mutually exclusive: `--file`, `--stdin`,
`--content`, or `--editor`. Permanent deletion additionally requires
`--permanent --yes` and the `lixblogs:blog:delete:permanent` scope.

Edits use the server ETag automatically. If another editor wins the race, the
command exits with code 3 and retains both versions under
`.lixblogs-conflicts/`; it never overwrites the newer server revision.

Global flags:
- `--profile <name>` — override the username-based local account alias
- `--env <environment>` — override environment (`development` | `staging` | `production`)
- `--scope <scope>` — request an additional/alternate OAuth scope; repeatable
- `--open` — open the verification URL with the device code pre-filled
- `--accounts-url <url>` — override the Accounts issuer for local/staging tests
- `--api-url <url>` — override the LixBlogs API origin; production defaults to
  `https://blogs.elixpo.com`
- `--json` — machine-readable JSON output
- `--quiet` — suppress non-essential output
- `--yes`, `-y` — confirm publishing and destructive state changes
- `--allow-insecure-fallback` — explicit opt-in: if the OS keychain is
  unavailable, use a non-persistent in-memory store instead of failing

### Service boundary

- `https://accounts.elixpo.com` issues, refreshes, and revokes OAuth tokens.
- `https://blogs.elixpo.com/api/v1` is the only production resource API.
- The CLI discovers Accounts endpoints before login and rejects incompatible
  contract versions or endpoints on an unexpected origin.
- The mock provider is available only with an explicit non-production
  environment, for example `--env development --auth-provider mock`.
- The resource contract, scopes, pagination, errors, and mutation guarantees
  are documented in the [API reference](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/API.md).
- Release compatibility, provenance, smoke gates, and rollback are documented
  in the [release policy](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/RELEASE.md).
  Contract changes are summarized in the
  [changelog](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/CHANGELOG.md).

The production client is public and has no client secret. Never add one to
CLI configuration, package files, or GitHub secrets.

### Configuration precedence

Configuration resolves in this order: command flags, `LIXBLOGS_*` environment
variables, the selected named profile, then production-safe defaults. Use
`lixblogs whoami --json --no-input` to verify the active profile, environment,
granted scopes, and expiry before automation. Flags are best for one command;
environment values are best for a contained CI job. Credentials remain in the
OS keychain and are never read from environment variables.

### Troubleshooting

- `invalid_scope`: Accounts has not registered the requested permission for
  this client; do not substitute a broader token.
- `insufficient_scope`: log in again with only the reported missing scope.
- `account_not_provisioned`: sign in to LixBlogs once with the same Accounts
  identity before retrying the CLI.
- `precondition_failed`: fetch the current post, reconcile the retained
  conflict copy, and retry with the new revision.
- `rate_limit_exceeded`: honor `Retry-After`; do not fan out retries.
- Include the returned request ID in a report, never a token or credential.

## Development

```bash
npm test          # runs the full CLI test suite
```

Tests exercise both a mocked auth provider and, where relevant, the real
OS keychain backend on whatever machine runs them — see
the [threat model](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/THREAT_MODEL.md)
and inline comments in `src/config/KeychainCredentialStore.js`
for known platform-specific behavior (e.g. a documented WSL/keyring-rs quirk).

## Architecture

```
bin/lixblogs.mjs         Source CLI entry point (Node's native util.parseArgs)
dist/lixblogs.mjs        Minified executable shipped in the npm package
src/auth/                Accounts provider, development mock, refresh-safe
                         authenticated client, and production safety gate
src/commands/auth/       Command logic (login, status, logout, revoke) —
                         framework-agnostic, testable independently of the CLI shell
src/commands/blog/       Blog lifecycle commands and Markdown/editor input
src/api/                 Versioned LixBlogs resource client and stable errors
src/content/             Dependency-free Markdown/block conversion
src/config/              Credential storage (real keychain + gated fallback),
                         profile registry, config resolution, token redaction
tests/                   Full test suite
THREAT_MODEL.md          Security threat model (repository documentation)
```

Command logic under `src/commands/` is deliberately decoupled from the CLI
parsing layer in `bin/`, so the parser (or any other interface built on top
of these commands later) can change without touching command logic or its
tests.

## Roadmap

See [#135](https://github.com/elixpo/blogs.elixpo/issues/135) for the full
scope. Rough remaining order:

1. Interactive terminal UI and branding in a separate issue

## Contributing

This package is part of the [blogs.elixpo](https://github.com/elixpo/blogs.elixpo)
monorepo. See the root repository's contribution guidelines.
