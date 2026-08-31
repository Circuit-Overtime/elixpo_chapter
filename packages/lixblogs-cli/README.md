# @elixpo/lixblogs-cli

The official CLI for LixBlogs — publish, manage, and inspect blogs through
the supported API. Built for creators and agent/automation use.

This package implements production device-flow authentication and the core
blog lifecycle over the stable LixBlogs API v1 contract. Its output stays
compact and predictable for both terminals and automation.

```bash
npm install -g @elixpo/lixblogs-cli
lixblogs --help
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

Press Enter to open the verification URL or copy it to another device. The
username becomes the profile alias unless `--profile` overrides it. Use
`profiles` and `use <username>` to switch accounts.

### Blog lifecycle

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

Editorial collaboration stays separate from publishing:

```bash
lixblogs collab invitations
lixblogs collab list BLOG_ID
lixblogs collab invite BLOG_ID --user reviewer --role viewer --yes
lixblogs collab role BLOG_ID --user reviewer --role editor --yes
lixblogs collab accept BLOG_ID --yes
lixblogs collab decline BLOG_ID --yes
```

### Creator analytics

Analytics is read-only and uses bounded date ranges and dimensions:

```bash
lixblogs login --scope openid --scope profile --scope lixblogs:analytics:read
lixblogs analytics query --range 30d --dimension overview --json --no-input
lixblogs analytics query --scope org:ORG_ID --range custom \
  --from 2026-07-01 --to 2026-07-31 --dimension posts --limit 25 --json --no-input
lixblogs analytics export --dimension timeline --format csv --output analytics.csv
```

Organization analytics also requires `lixblogs:organizations:read`. Results are
aggregate-only, and exports refuse to overwrite an existing file.

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

### Service boundary

- `https://accounts.elixpo.com` issues, refreshes, and revokes OAuth tokens.
- `https://blogs.elixpo.com/api/v1` is the only production resource API.
- The CLI rejects incompatible discovery metadata and unexpected origins.
- See the repository [API contract](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/API.md), [release policy](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/RELEASE.md), and [changelog](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/CHANGELOG.md).

The production client is public and has no client secret. Never add one to
CLI configuration, package files, or GitHub secrets.

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

## Contributing

This package is part of the [blogs.elixpo](https://github.com/elixpo/blogs.elixpo)
monorepo. See the root repository's contribution guidelines.
