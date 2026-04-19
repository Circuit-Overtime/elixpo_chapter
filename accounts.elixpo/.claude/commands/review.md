Review a PR or code change.

Focus on what needs improving, not what's already fine.

## What to look at

- **Security**: auth/authz, input validation, SQL injection, XSS, CSRF, secret exposure, rate limiting on public endpoints.
- **Edge-runtime correctness**: `export const runtime = 'edge'`, no Node built-ins, no `Buffer` misuse, no top-level `nodemailer`.
- **D1 correctness**: parameterized queries, no `RETURNING *` on multi-row, transaction boundaries, indexes on new WHERE/JOIN columns.
- **Error handling**: do errors leak D1 internals to clients? Are failures logged with enough context to debug?
- **Scope drift**: unrelated changes that should be in a separate PR.

## Don't

- Praise code that's fine.
- Repeat what the PR description already says.
- Hedge ("I think", "maybe", "might want to").
- Suggest stylistic rewrites unless they catch a real bug.
- Block on "consider adding a test" without saying what test.

## Output format

```
## Issues
- [src/path/file.ts:42] <one-line problem + why it matters>
- [src/path/file.ts:88] <same pattern>

## Suggestions
- <one-line improvement, optional>
- <another>

## Security
- <only if there's something; omit section otherwise>
```

Bullets only. Link specific lines. Under 200 words unless the PR is genuinely large.
