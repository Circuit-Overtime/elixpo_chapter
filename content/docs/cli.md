# LixBlogs CLI

`@elixpo/lixblogs-cli` is the supported command-line client for creators and automation. It uses Accounts device authorization and the versioned LixBlogs API. It never needs a password, browser session cookie, D1 binding, or application secret.

## Install

```bash
npm install --global @elixpo/lixblogs-cli
lixblogs --help
```

Node.js 18 or newer is required.

## Sign in

```bash
lixblogs login --open
lixblogs whoami
lixblogs logout
```

`login` displays a verification URL and one-time code. Approve only the scopes you need. `register` opens the official Accounts registration page and continues into the same device flow. The longer `auth login`, `auth status`, and `auth logout` forms remain supported aliases.

Credentials are stored in the operating-system keychain. On a headless system, the CLI fails closed unless you explicitly select its non-persistent fallback.

## Profiles and scopes

```bash
lixblogs login --profile work --scope openid --scope profile \
  --scope lixblogs:profile:read --scope lixblogs:blog:read \
  --scope lixblogs:blog:write
lixblogs profiles
lixblogs use work
lixblogs whoami --profile work --json
```

Read and draft workflows need `lixblogs:blog:read` and `lixblogs:blog:write`. Publishing, organization management, collaboration, and deletion use separate scopes. `whoami` reports the active profile, identity, environment, scopes, and expiry without exposing credentials.

## Draft and revise Markdown

```bash
lixblogs blog list --status draft
lixblogs blog create --file post.md --title "A post" --tag engineering
cat post.md | lixblogs blog edit BLOG_ID --stdin
lixblogs blog edit BLOG_ID --editor
lixblogs blog get BLOG_ID --json
```

Use one content source: `--file`, `--stdin`, `--content`, or `--editor`. `--publication personal` is the default; organization targets use `--publication org:ORG_ID` and optionally `--collection COLLECTION_ID`. Use `--dry-run` to validate without writing.

Edits carry the current ETag. A concurrent change exits with code 3 and stores the local input and latest server Markdown under `.lixblogs-conflicts/` instead of overwriting either version.

## Publish and recover

```bash
lixblogs blog publish BLOG_ID --dry-run
lixblogs blog publish BLOG_ID --yes
lixblogs blog unpublish BLOG_ID --yes
lixblogs blog delete BLOG_ID --yes
lixblogs blog restore BLOG_ID --yes
```

Publishing and state transitions require `--yes`. Deletion moves a post to trash by default. Permanent deletion additionally needs `--permanent`, the permanent-delete scope, and explicit confirmation.

## Automation contract

Use `--json --no-input` in scripts and agent workflows:

```bash
lixblogs blog list --status draft --json --no-input
lixblogs blog publish BLOG_ID --dry-run --json --no-input
lixblogs blog publish BLOG_ID --yes --json --no-input
```

- stdout contains data; diagnostics use stderr.
- JSON mode has no ANSI styling, banners, or prompts.
- `--quiet` suppresses non-essential human output.
- Mutations accept `--idempotency-key`; safe reads and idempotent writes retry one transient response.
- Errors contain `code`, `message`, `hint`, and `requestId`. Credentials are redacted.

Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Request or server failure |
| `2` | Invalid command or flag |
| `3` | Revision conflict |
| `4` | Login or scope failure |
| `5` | Required confirmation missing |

## Troubleshooting and revocation

- `account_not_provisioned`: sign in to LixBlogs once, then retry.
- `insufficient_scope`: run `lixblogs login` again with the named scope.
- `revision_conflict`: inspect `.lixblogs-conflicts/`, merge, then retry against the new revision.
- expired device code: restart `lixblogs login`.
- unavailable keychain: configure the OS keychain or explicitly use the documented non-persistent fallback.

`lixblogs auth revoke --yes` revokes the server credential and clears its local profile. `logout` only clears local credentials.
