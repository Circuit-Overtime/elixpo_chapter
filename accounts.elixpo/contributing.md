# Contributing to Elixpo Accounts

Thanks for considering a contribution to **Elixpo Accounts** — the OAuth 2.0 / SSO service that powers identity across the Elixpo ecosystem (chat, art, blogs, clock, jackey, sketch, and anything else we ship).

This guide covers what you need to know to land a useful PR. The full operating manual — architecture, edge-runtime constraints, repo layout, common mistakes — lives in [AGENTS.md](AGENTS.md). Read that before any non-trivial change.

## How to Contribute

### 1. Find something to work on

- Browse open issues: <https://github.com/elixpo/accounts.elixpo/issues>
- Look for the `good first issue` or `help wanted` labels if you're new.
- Triage labels (`FEATURE`, `BUGS`, `SUPPORT`, `DEV`) tell you what kind of work each issue is.
- If you want to propose something new, **open an issue first** and discuss the approach before writing code — this saves a round-trip when the design doesn't match how the rest of the system works.

### 2. Understand the stack before you edit

This repo runs on **Cloudflare Pages with the edge runtime** — not Node. That changes what code is allowed:

- Every API route under `app/api/**` MUST export `export const runtime = 'edge'`.
- No Node built-ins (`crypto`, `fs`, `path`, `stream`, `buffer`). Use Web APIs / `src/lib/webcrypto.ts`.
- `nodemailer` is dev-only and dynamically imported via string concat — don't add a top-level import.
- Database is **Cloudflare D1 (SQLite)** — not Postgres. No `RETURNING *` on multi-row writes, no `JSONB`.

The full list of constraints is in [AGENTS.md](AGENTS.md#hard-constraints-edge-runtime). Skipping it is the most common cause of a PR getting bounced.

### 3. Build an MVP

Make the smallest change that solves the problem. Don't bundle refactors, dependency upgrades, or unrelated cleanup into a feature PR — they make review harder and increase the chance of being asked to split. Three similar lines is fine; a premature abstraction isn't.

### 4. Documentation contributions

Docs PRs are welcome. The high-value targets:

- [docs/OAUTH_INTEGRATION.md](docs/OAUTH_INTEGRATION.md) — third-party integrator docs (this is what external app developers read).
- [README.md](README.md) — landing page for the repo.
- [AGENTS.md](AGENTS.md) — internal operating manual; update this when you change a workflow or hit a non-obvious gotcha worth remembering.
- Inline JSDoc on exported helpers in `src/lib/`.

### 5. Code contributions

We welcome PRs across the surface area:

- **Bug fixes** — auth flows, OAuth edge cases, dashboard regressions.
- **Feature work** — new providers, new dashboard panels, new admin tooling.
- **Hardening** — rate limiting, RBAC checks, observability, tests.
- **Edge-runtime compatibility** — moving more code off Node-only assumptions.

## Getting Started

1. **Fork** the repo and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/accounts.elixpo.git
   cd accounts.elixpo
   ```

2. **Install dependencies** (Node 20+):

   ```bash
   npm install
   ```

3. **Set up environment**: copy `.env.example` to `.env.local` and fill in the values. For Cloudflare bindings (D1, KV), see [AGENTS.md](AGENTS.md) for the local `wrangler` setup.

4. **Create a branch** off `main`. Branch naming convention:
   - `feat/<slug>` for new features
   - `fix/<slug>` for bug fixes
   - `docs/<slug>` for documentation
   - `chore/<slug>` / `refactor/<slug>` for internal work

   ```bash
   git checkout -b feat/my-feature
   ```

   Never commit directly to `main` — it is branch-protected.

5. **Develop and verify**:

   ```bash
   npm run dev              # Next dev server
   npm test                 # vitest
   ./biome.sh               # auto-fix lint/format
   ./biome.sh ci            # strict check — must pass before commit
   npm run pages:build      # catches edge-runtime incompatibilities
   ```

   `./biome.sh ci` is enforced by CI. If it fails locally, it will fail in the PR check.

6. **Commit** using conventional commits, with the issue/PR number when applicable:

   ```bash
   git commit -m "feat: add WebAuthn fallback for non-passkey browsers (#123)"
   ```

   Allowed prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`, `test:`.

7. **Push** and **open a PR** against `main`:

   ```bash
   git push -u origin feat/my-feature
   ```

   - End the PR body with `Fixes #N` (or `Closes #N`) so GitHub auto-closes the linked issue on merge.
   - The PR description should explain *why* the change is needed and how to verify it. The diff already shows *what* changed.
   - For UI changes, include a screenshot or short clip.
   - Don't bundle unrelated changes — open a separate PR for each.

8. **Respond to review**. The `@elixpoo` bot may auto-review small PRs. Org maintainers handle the rest. Push fixes as new commits on the same branch — don't force-push after review starts unless explicitly asked.

## Guidelines

### Code style

- **Biome** is the single source of truth for formatting and linting (`./biome.sh`). The vestigial ESLint config has been removed; don't reintroduce it.
- TypeScript `strict` is on. Avoid `any` outside the OAuth/auth boundaries where it's already used intentionally with runtime validation.
- Match the existing patterns in `src/lib/` — small, focused modules with explicit exports.

### Testing

- Tests live under `src/**/__tests__/*.test.ts` and run via **Vitest** (`npm test`).
- Add tests for new pure-logic helpers in `src/lib/`. Cloudflare-binding tests (D1, KV) require the `@cloudflare/vitest-pool-workers` setup — coordinate in the issue first if you're introducing the first one.
- For changes not covered by tests, document the manual verification steps in the PR body. The full manual loop is in [AGENTS.md](AGENTS.md#testing).

### Security

- Anything touching auth, tokens, sessions, or RBAC must be reviewed by a maintainer. Don't merge security-sensitive changes via the auto-review bot.
- Don't include secrets, tokens, or production database dumps in PRs, branches, or issue comments.
- Found a vulnerability? **Don't open a public issue.** Report it privately per [SECURITY.md](SECURITY.md) (or email a maintainer if that file isn't present yet).

### Database changes

- Migrations live in `src/workers/migrations/NNNN_<name>.sql`. Number is gapless — pick the next integer.
- One migration per logical change. Indexes go in the same file as the column they target.
- Production migrations are applied via CI on merge to `main` — never `wrangler d1 migrations apply --remote` from your machine.

### Commit hygiene

- Write commit messages that explain *why*, not just *what*. The diff shows what.
- Squash trivial fixup commits before requesting review (`git rebase -i`).
- Don't include `Co-Authored-By:` lines for tools or AI assistants unless the project explicitly asks for it.

## Code of Conduct

Be respectful. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for the full version. TL;DR: assume good faith, criticize ideas not people, and keep the repo a place people want to contribute to.

## Getting Help

- **Stuck on the build?** Re-read the edge-runtime constraints in [AGENTS.md](AGENTS.md). 90% of build failures trace back to one of those.
- **Stuck on the architecture?** Tag a maintainer in the issue. Don't guess and rewrite — ask first.
- **Bot issues?** If `@elixpoo` mis-handles your PR, comment `@elixpoo retry` or ping a maintainer.

Thanks for contributing — every fix and feature makes the SSO that the rest of the Elixpo ecosystem depends on a little more solid.
