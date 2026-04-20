<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=180&section=header&text=Elixpo%20Accounts&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=The%20central%20identity%20and%20SSO%20gateway%20for%20the%20Elixpo%20ecosystem&descAlignY=62&descAlign=50" width="100%" alt="Elixpo Accounts" />

<br/>

<img src="https://github.com/user-attachments/assets/a2057d99-fc2d-4e19-ab16-661a403bc0ec" alt="Elixpo Accounts Banner" width="620"/>

<br/><br/>

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MUI](https://img.shields.io/badge/MUI-7-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com/)

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Biome](https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white)](https://biomejs.dev/)
[![Wrangler](https://img.shields.io/badge/Wrangler-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers/wrangler/)

<br/>

[![License](https://img.shields.io/github/license/elixpo/accounts.elixpo?style=flat-square&color=blue)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/elixpo/accounts.elixpo?style=flat-square&color=informational)](https://github.com/elixpo/accounts.elixpo/commits/main)
[![Issues](https://img.shields.io/github/issues/elixpo/accounts.elixpo?style=flat-square&color=yellow)](https://github.com/elixpo/accounts.elixpo/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/elixpo/accounts.elixpo/pulls)
[![Stars](https://img.shields.io/github/stars/elixpo/accounts.elixpo?style=flat-square&color=gold)](https://github.com/elixpo/accounts.elixpo/stargazers)

</div>

---

## 🌟 What is this?

**Elixpo Accounts** is the Single Sign-On (SSO) service behind every product in the Elixpo ecosystem. Register once and get access to chat, art, blogs, clock, jackey, sketch, and anything else we ship — all under a single account.

If you're building a third-party app and want to let users sign in with Elixpo, jump to **[docs/OAUTH_INTEGRATION.md](docs/OAUTH_INTEGRATION.md)**.

---

## ✨ Features

<table>
  <tr>
    <td>🔑</td>
    <td><b>Universal SSO</b> — one account, every Elixpo service</td>
    <td>🌐</td>
    <td><b>OAuth 2.0 Provider</b> — Authorization Code flow for integrators</td>
  </tr>
  <tr>
    <td>🔐</td>
    <td><b>Passkey / WebAuthn</b> — phishing-resistant passwordless login</td>
    <td>👤</td>
    <td><b>Social login</b> — Google, GitHub, email + password</td>
  </tr>
  <tr>
    <td>📊</td>
    <td><b>Developer dashboard</b> — OAuth apps, webhooks, API keys</td>
    <td>🛡️</td>
    <td><b>Admin panel</b> — RBAC, audit trail, user management</td>
  </tr>
  <tr>
    <td>📨</td>
    <td><b>Transactional email</b> — OTP, verification, password reset</td>
    <td>⚡</td>
    <td><b>Edge-native</b> — runs globally on Cloudflare Pages + D1</td>
  </tr>
</table>

---

## 🏗️ Architecture

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, edge runtime) |
| **Language** | TypeScript 5 |
| **UI** | MUI 7 + Tailwind CSS 4 + Emotion |
| **Database** | Cloudflare D1 (SQLite) |
| **Auth** | JWT via Web Crypto (HS256) — 15 min access / rotated refresh |
| **Email** | `cloudflare:sockets` SMTP in prod, `nodemailer` in dev |
| **WebAuthn** | `@simplewebauthn/server` |
| **Hosting** | Cloudflare Pages (edge) |
| **Tooling** | Biome, Wrangler, Docker |

For the full operating manual (edge-runtime constraints, migrations, conventions, common mistakes), see **[AGENTS.md](AGENTS.md)**.

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/elixpo/accounts.elixpo.git
cd accounts.elixpo

# Install
npm install

# Copy env template, fill in secrets
cp .env.example .env.local

# Apply migrations to your local D1
npm run db:migrate:local

# Run the dev server
npm run dev
```

Dev server starts on `http://localhost:3000`.

Useful scripts:

```bash
npm run pages:build    # build for Cloudflare Pages
npm run db:migrate     # apply migrations to remote D1
./biome.sh             # auto-fix lint + format
./biome.sh ci          # strict check (must exit 0 before commit)
```

---

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](AGENTS.md) | Operating manual — architecture, constraints, migrations, biome, git workflow, common mistakes |
| [docs/OAUTH_INTEGRATION.md](docs/OAUTH_INTEGRATION.md) | Third-party OAuth 2.0 integration guide |
| [CLAUDE.md](CLAUDE.md) | Entrypoint for AI contributors |

---

## 🔐 OAuth Quick Reference

```
GET  /oauth/authorize      → consent screen (Authorization Code grant)
POST /api/auth/token       → exchange code (or refresh) for tokens
GET  /api/auth/me          → fetch user profile (Bearer token)
```

Full flow, error codes, Node.js example → [docs/OAUTH_INTEGRATION.md](docs/OAUTH_INTEGRATION.md).

---

## 🤝 Contributing

PRs welcome. Before submitting:

1. `./biome.sh ci` must exit 0.
2. Any new API route must export `runtime = 'edge'`.
3. Never import Node built-ins (`crypto`, `fs`, `path`, `Buffer`) — use `src/lib/webcrypto.ts` instead.
4. New DB columns/tables need a migration under `src/workers/migrations/`.
5. Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`.

Report bugs or request features → **[issues](https://github.com/elixpo/accounts.elixpo/issues)**.

---

## 🌟 Stargazers

<div align="center">
  <a href="https://github.com/elixpo/accounts.elixpo/stargazers">
    <img src="https://reporoster.com/stars/elixpo/accounts.elixpo" alt="Stargazers repo roster for elixpo/accounts.elixpo" />
  </a>
</div>

---

<div align="center">

*Maintained by the **[Elixpo](https://github.com/elixpo) Open Source Team**.*

> **Note:** This README is a living document and will be updated as the project evolves.

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&reversal=false" width="100%" alt="wave footer"/>
