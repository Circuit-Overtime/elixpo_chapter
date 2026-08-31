# @elixpo/lixblogs-cli

Publish, manage, and inspect LixBlogs through its stable API v1. The CLI uses
device authorization and predictable terminal or JSON output.

```bash
npm install -g @elixpo/lixblogs-cli
lixblogs --help
```

### Authentication

```bash
node bin/lixblogs.mjs login
node bin/lixblogs.mjs login --profile personal
node bin/lixblogs.mjs whoami
node bin/lixblogs.mjs profiles
node bin/lixblogs.mjs use work
node bin/lixblogs.mjs logout
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

Pollinations generation uses the creator's BYOP connection in Settings. The
CLI never stores its key or retries a billable generation automatically. Keep
the local output for a manual `media upload` retry.

### Agent skills

The npm artifact bundles each skill independently:

```bash
lixblogs skill list
lixblogs skill inspect lixblogs-author
lixblogs skill install lixblogs-author --target .agents/skills --dry-run
lixblogs skill install lixblogs-author --target .agents/skills --yes
```

Install only the needed skill. Existing files require explicit `--force --yes`.
Each skill declares its minimum CLI version and scopes.

`create`, `edit`, `publish`, `unpublish`, `delete`, and `restore` accept
`--dry-run`. Content input is mutually exclusive: `--file`, `--stdin`,
`--content`, or `--editor`. Permanent deletion requires
`--permanent --yes` and the `lixblogs:blog:delete:permanent` scope.

Edits use the server ETag. Conflicts exit with code 3 and retain both versions
under `.lixblogs-conflicts/` without overwriting the server revision.

### Service boundary

- `https://accounts.elixpo.com` issues, refreshes, and revokes OAuth tokens.
- `https://blogs.elixpo.com/api/v1` is the only production resource API.
- Incompatible discovery metadata and unexpected origins are rejected.
- See the [API contract](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/API.md), [release policy](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/RELEASE.md), and [changelog](https://github.com/elixpo/blogs.elixpo/blob/main/packages/lixblogs-cli/CHANGELOG.md).

The public production client has no client secret. Never add one.

### Troubleshooting

- `invalid_scope`: Accounts has not registered the requested permission.
- `insufficient_scope`: log in again with only the reported missing scope.
- `account_not_provisioned`: sign in to LixBlogs once, then retry.
- `precondition_failed`: fetch the current post, reconcile the retained
  conflict copy, and retry with the new revision.
- `rate_limit_exceeded`: honor `Retry-After`; do not fan out retries.
- Report the request ID, never a token or credential.
