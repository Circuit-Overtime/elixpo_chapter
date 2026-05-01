# Contributing to LixSketch

Thanks for considering a contribution to **LixSketch** — an open-source infinite canvas with a hand-drawn aesthetic and a Notion-like docs editor, deployed on Cloudflare's edge.

This guide covers what you need to know to land a useful PR. Repo-specific architecture notes and gotchas live in [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md). Read those before any non-trivial change.

## How to Contribute

### 1. Find something to work on

- Browse open issues: <https://github.com/elixpo/lixsketch/issues>
- Look for `good first issue` or `help wanted` if you're new.
- Triage labels (`FEATURE`, `BUG`, `DEV`, `DOCS`) tell you what kind of work each issue is.
- If you want to propose something new, **open an issue first** and discuss the approach before writing code. The canvas engine has a lot of cross-shape state — design changes that look small often aren't.

### 2. Understand the stack before you edit

This repo runs on **Cloudflare Pages with the Next.js edge runtime** (via `@cloudflare/next-on-pages`) plus a separate **Cloudflare Worker** for collaboration:

- **Frontend:** Next.js 15 + React 19 + Tailwind. The canvas itself is a vanilla-JS SVG engine (`packages/lixsketch/`) consumed by the React app under `src/`.
- **Docs editor:** BlockNote, wrapped by [`@elixpo/lixeditor`](https://www.npmjs.com/package/@elixpo/lixeditor) (published from the `blogs.elixpo` repo). All doc-editor changes happen there, not here.
- **Worker:** `worker/src/index.ts` (HTTP routes) and `worker/src/RoomDurableObject.ts` (collaboration).
- **Storage:** Cloudflare D1 (SQLite) + KV. Per-session AES encryption for both scenes and docs — the worker only ever sees ciphertext.

Edge runtime constraints to know:

- Every API route under `src/app/api/**` MUST export `export const runtime = 'edge'`.
- No Node built-ins (`fs`, `path`, `stream`, `Buffer`). Use Web APIs / `crypto.subtle`.
- D1 is SQLite — no `RETURNING *` on multi-row writes, no `JSONB`, no real foreign-key enforcement (we cascade in worker code).
- Workers have a CPU budget — avoid sync work over ~50ms in a single request.

### 3. Build an MVP

Make the smallest change that solves the problem. Don't bundle refactors, dependency upgrades, or unrelated cleanup into a feature PR. Three similar lines is fine; a premature abstraction isn't. The canvas engine is full of action-stacks and global flags — tiny changes can ripple.

### 4. Documentation contributions

Docs PRs are very welcome. The high-value targets:

- [README.md](README.md) — landing page.
- [AGENTS.md](AGENTS.md) — internal operating manual; update when you change a workflow or hit a non-obvious gotcha.
- [CLAUDE.md](CLAUDE.md) — repo guide for Claude Code / agent runs.
- [`packages/lixsketch/README.md`](packages/lixsketch/README.md) — engine consumer docs.
- Inline JSDoc on exported helpers in `src/hooks/`, `src/store/`, and `packages/lixsketch/src/`.

### 5. Code contributions

We welcome PRs across the surface area:

- **Bug fixes** — pointer/zoom math, autosave races, tool flag conflicts, sidebars not closing.
- **Features** — new shape tools, exports, doc/canvas linking, comments, real-time collab improvements.
- **Hardening** — rate limiting, auth on worker endpoints, message-size caps, conflict detection.
- **Performance** — bundle size, lazy-loading heavy deps (Mermaid, KaTeX), D1 query patterns.

## Getting Started

1. **Fork** the repo and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/lixsketch.git
   cd lixsketch
   ```

2. **Install dependencies** (Node 20+):

   ```bash
   npm install
   ```

   If `npm install` errors with peer-dep conflicts (BlockNote / Mantine / React 19), use `npm install --legacy-peer-deps`.

3. **Set up Cloudflare bindings**: D1 and KV ids are committed in [wrangler.toml](wrangler.toml) and mirrored in [next.config.mjs](next.config.mjs). For local dev, apply migrations to your local D1 once:

   ```bash
   npm run db:migrate:local
   ```

   See [AGENTS.md](AGENTS.md) for the full local Cloudflare setup if you need to point at your own D1 / KV.

4. **Create a branch** off `main`:

   - `feat/<slug>` — new features
   - `fix/<slug>` — bug fixes
   - `docs/<slug>` — documentation
   - `chore/<slug>` / `refactor/<slug>` — internal work

   ```bash
   git checkout -b feat/my-feature
   ```

   Never commit directly to `main` — it is branch-protected.

5. **Develop and verify**:

   ```bash
   npm run dev              # Next dev server (Turbopack)
   npm run build            # production build via webpack — also catches edge-runtime issues
   npm run worker:dev       # local worker (wrangler) for collab/auth/scene routes
   ```

   We don't have unit tests yet. Test plans go in the PR body — describe what you clicked, in which mode, and what you expected. UI changes should include a screenshot or short clip.

6. **Commit** using conventional commits, with the issue/PR number when applicable:

   ```bash
   git commit -m "feat(canvas): straight-line constraint while holding shift (#42)"
   ```

   Allowed prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`, `perf:`.

   Scopes that show up often: `canvas`, `docs`, `worker`, `auth`, `ui`, `pricing`, `ai-modal`, `migration`.

7. **Push** and **open a PR** against `main`:

   ```bash
   git push -u origin feat/my-feature
   ```

   - End the PR body with `Fixes #N` (or `Closes #N`) so GitHub auto-closes the linked issue.
   - The PR description should explain *why* the change is needed and how to verify it. The diff already shows *what* changed.
   - For UI changes, include a screenshot or short clip.
   - Don't bundle unrelated changes — open a separate PR for each.

8. **Respond to review**. Push fixes as new commits on the same branch — don't force-push after review starts unless explicitly asked.

## Guidelines

### Code style

- No formatter / linter is wired up yet — match the surrounding patterns. ESM imports, `camelCase` for vars/functions, `PascalCase` for classes and React components.
- React: client components only when needed (`"use client"` at top). Hooks in `src/hooks/`, Zustand stores in `src/store/`.
- Tailwind: utility-first; keep arbitrary values minimal (the linter will warn `w-[80px] → w-20` etc., apply when easy).
- Vanilla canvas engine: each tool is its own module under `packages/lixsketch/src/tools/` with `handle*MouseDown/Move/Up` exports. Cross-tool state lives in globals (`window.currentShape`, `window.shapes`, etc.) — sloppy but consistent.
- Default to writing no comments. Add one only when the *why* is non-obvious.

### Testing

- No automated test framework is set up yet. Manual verification steps go in the PR body.
- For changes to the canvas engine, test in both canvas-only and split layouts and confirm pointer math is correct under zoom.
- For worker changes, smoke-test from a real browser session: load a canvas, save, reload, verify content survives.

### Security

- Anything touching auth, sessions, encryption keys, or worker endpoints must be reviewed by a maintainer.
- Don't commit secrets, tokens, or production database dumps. The committed `wrangler.toml` only contains public binding ids — secrets are set via `wrangler secret put`.
- Found a vulnerability? Don't open a public issue. See [SECURITY.md](SECURITY.md) — short version: email **security@elixpo.com** or use GitHub's [private vulnerability reporting](https://github.com/elixpo/lixsketch/security/advisories/new).

### Database changes

- Migrations live in `worker/migrations/NNNN_<name>.sql`. Number is gapless — pick the next integer.
- One migration per logical change.
- Migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER TABLE`). The `scripts/db-migrate.mjs` runner tracks applied files in a `_migrations` table, so running it twice should be a no-op.
- Production migrations are applied via `npm run db:migrate` (remote) on the maintainer's machine — coordinate timing in the issue, since D1 briefly stops serving while a migration runs.

### Commit hygiene

- Write commit messages that explain *why*, not just *what*. The diff shows what.
- Squash trivial fixup commits before requesting review (`git rebase -i`).
- `Co-Authored-By:` lines for AI assistants are fine if you actually pair-programmed with one — don't fake it.

## Code of Conduct

Be respectful. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for the full version. TL;DR: assume good faith, criticize ideas not people, and keep the repo a place people want to contribute to.

## Getting Help

- **Stuck on the build?** Re-read the edge-runtime constraints above and in [AGENTS.md](AGENTS.md). Most build failures trace back to a Node-only API leaking into an edge route.
- **Stuck on the architecture?** Tag a maintainer in the issue. Don't guess and rewrite — ask first. The canvas engine globals make it especially easy to introduce regressions.
- **Doc-editor issues?** They probably live in the [`@elixpo/lixeditor`](https://github.com/elixpo/lixblogs/tree/main/packages/lixeditor) package, not here. File the issue there.

Thanks for contributing — every fix and feature makes LixSketch a little better.
