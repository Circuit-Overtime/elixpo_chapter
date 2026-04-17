# accounts.elixpo — Repo Context
> Auto-generated on 2026-04-17T13:49:38+00:00. Used by CI to give AI better context.

## Description
Elixpo OAuth SSO Provider

## Recent Activity (Last 20 Merged PRs)
- PR #5: Update README.md (merged 2026-04-16 by @idebabratadey)
- PR #2: Created the Application Sign on and the Registration function (merged 2026-03-04 by @Circuit-Overtime)

## Top-Level Structure
```
├── .elixpo/
│   └── project.yml
├── .github/
│   ├── scripts/
│   ├── workflows/
│   └── ci_config.py
├── app/
│   ├── (auth)/
│   ├── about/
│   ├── admin/
│   ├── api/
│   ├── components/
│   ├── dashboard/
│   ├── docs/
│   ├── oauth/
│   ├── setup-name/
│   ├── verify/
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── monitoring/
│   ├── grafana/
│   └── prometheus.yml
├── public/
│   └── LOGO/
├── scripts/
│   ├── create-admin.mjs
│   ├── init-db.sh
│   ├── seed-admin.ts
│   ├── setup-d1.sh
│   ├── setup-secrets.sh
│   └── test-email.js
├── src/
│   ├── lib/
│   └── workers/
├── types/
│   ├── auth.ts
│   ├── cache-life.d.ts
│   ├── routes.d.ts
│   └── validator.ts
├── CLAUDE.md
├── Dockerfile
├── README.md
├── biome.json
├── deploy.sh
├── docker-compose.yml
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── theme.js
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── wrangler.toml
```

## Recently Modified Files (Last 30 Days)
- .github/workflows/issue-description.yml
- .github/scripts/issue_description.py
- .github/workflows/artifact-update.yml
- .github/scripts/build_artifact.py
- .github/ci_config.py
- .github/workflows/pr-assign.yml
- .github/scripts/pr_assign.py
- .github/scripts/triage_issue.py
- .github/workflows/on-merge.yml
- .github/workflows/pr-review.yml
- .github/workflows/issue-comment.yml
- .github/workflows/issue-triage.yml
- .github/workflows/biome.yml
- biome.json
- .github/workflows/codeql.yml
- .github/scripts/update_readme.py
- .github/scripts/pr_review.py
- .github/scripts/merge_gist.py
- .github/scripts/issue_comment.py
- README.md
- .elixpo/project.yml
- package-lock.json
- app/dashboard/layout.tsx
- app/about/page.tsx
- src/lib/random-name.ts
- app/oauth/authorize/layout.tsx
- app/(auth)/authorize/page.tsx
- app/page.tsx
- app/admin/users/page.tsx
- app/admin/apps/page.tsx
- app/admin/logs/page.tsx
- app/admin/page.tsx
- app/admin/login/page.tsx
- app/admin/settings/page.tsx
- app/admin/api-keys/page.tsx
- app/dashboard/profile/page.tsx
- src/lib/admin-context.tsx
- theme.js
- app/dashboard/webhooks/page.tsx
- app/dashboard/oauth-apps/page.tsx

## Key Documentation
### README.md

<div align="center">
  <img src="https://github.com/user-attachments/assets/a2057d99-fc2d-4e19-ab16-661a403bc0ec" alt="Elixpo Accounts Banner" width="600"/>
  <h1>🔐 Elixpo Accounts</h1>
  <p><em>The central identity and SSO gateway for the Elixpo ecosystem.</em></p>
</div>

---

## 🌟 What is this?
Welcome to **Elixpo Accounts**! Instead of forcing users to create a new username and password for every single Elixpo tool, this acts as our Single Sign-On (SSO) service. 

If you want to use our chat application, news feed, or any other platform we build, your journey starts here. Register once, and get seamless access everywhere.

## ✨ Key Features
* **Universal Access:** One account to access all Elixpo projects.
* **Flexible Login:** Sign in securely using your existing Google or GitHub accounts, or stick to a traditional Email login.
* **Centralized Dashboard:** Manage your active sessions, connected services, and security settings all in one clean interface.

## 💻 Built With
For developers looking to contribute, this project is built on a modern, fast, and scalable stack:
* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Infrastructure:** Cloudflare Routing & Cloudflare D1 (Database)
* **Containerization:** Docker

---
*Maintained by the Elixpo Open Source Team.*

### CLAUDE.md

# Elixpo Accounts

OAuth 2.0 Identity Provider running on Cloudflare Pages with Next.js 15.

## Architecture

- **Runtime**: Cloudflare Pages (edge) via `@cloudflare/next-on-pages`
- **Database**: Cloudflare D1 (SQLite)
- **Email**: Dual transport — `cloudflare:sockets` SMTP in production, `nodemailer` fallback in local dev
- **Auth**: JWT access/refresh tokens stored in httpOnly cookies
- **Crypto**: Web Crypto API (`src/lib/webcrypto.ts`) — no Node.js `crypto` module

## Key Constraints

- All API routes **must** export `export const runtime = 'edge'` or the Cloudflare Pages build will fail.
- `nodemailer` is dynamically imported with string concatenation (`'node' + 'mailer'`) to hide it from esbuild static analysis. It is never called in production — only as a local dev fallback.
- Never use Node.js built-ins (`crypto`, `fs`, `path`) directly — use the Web Crypto equivalents in `src/lib/webcrypto.ts`.

## Project Structure

```
app/
  (auth)/login/       — Login page
  (auth)/register/    — Registration page
  setup-name/         — Post-registration display name setup
  authorize/          — OAuth consent screen
  dashboard/          — Developer portal (sidebar layout)
    oauth-apps/       — Manage registered OAuth apps
    profile/          — User profile settings
    webhooks/         — Webhook management
  admin/              — Admin panel
  api/auth/
    login/            — POST email/password login
    register/         — POST user registration
    me/               — GET current user, PATCH update profile
    token/            — POST token exchange (authorization_code, refresh_token)
    authorize/        — GET/POST OAuth authorization endpoint
    send-verification/ — POST resend email verification OTP
    oauth-clients/    — CRUD for registered OAuth apps
  oauth/authorize/    — Primary OAuth authorization entry point
src/lib/
  db.ts               — D1 database helpers
  jwt.ts              — JWT sign/verify (Web Crypto)
  webcrypto.ts        — UUID, random string, hashing (Web Crypto API)
  email.ts            — Email sending + all HTML templates
  oauth-config.ts     — OAuth provider config + client validation
  random-name.ts      — Random display name generator
  smtp-client.ts      — Cloudflare Workers SMTP client
```

## Third-Party OAuth Integration Guide

Any service that has registered an OAuth application on Elixpo Accounts can authenticate users through the standard OAuth 2.0 Authorization Code flow.

**Base URL**: `https://accounts.elixpo.com`

### Prerequisites

1. Register an OAuth app at `https://accounts.elixpo.com/dashboard/oauth-apps`
2. Note your **Client ID** and **Client Secret** (shown once at creation)
3. Register your **Redirect URI(s)** — must use HTTPS in production

### Flow Overview

```
Your App                         Elixpo Accounts
  |                                    |
  |-- 1. Redirect user to ------------>|
  |   /oauth/authorize?...            |
  |                                    |-- User logs in (if needed)
  |                                    |-- User sees consent screen
  |                                    |
  |<-- 2. Redirect back with code ----|
  |   ?code=xxx&state=yyy              |
  |                                    |
  |-- 3. POST /api/auth/token -------->|
  |   (exchange code for tokens)       |
  |                                    |
  |<-- 4. Access + Refresh tokens ----|
  |                                    |

