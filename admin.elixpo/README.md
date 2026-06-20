# Elixpo Admin

The admin control plane for the entire Elixpo Cloudflare account, at
**https://admin.elixpo.com**.

- **Gated** — only users flagged `is_admin` in [accounts.elixpo](https://accounts.elixpo.com)
  can enter (OAuth2 authorization-code SSO + admin check).
- **Auto-discovery** — enumerates every Pages project, Worker, D1, KV, Queue,
  Durable Object, Container and Workflow live from the Cloudflare API. New
  resources appear automatically; nothing is hardcoded.
- **Full observability** — mirrors every chart Cloudflare provides: traffic
  overview, DNS, Gateway (HTTP/DNS), error monitoring, Log Explorer usage, and
  per-resource metrics for Workers, D1, KV, Queues, Durable Objects, Workflows
  and Containers.
- **Management** (phased) — read-only first; D1/KV/queue/deploy actions land
  later, each audit-logged.

## Stack

Next.js 15 (App Router) on Cloudflare Pages via `@cloudflare/next-on-pages`,
MUI v7 + Tailwind v4, signed-cookie sessions, Biome, SOPS+age secrets — matching
the rest of the Elixpo ecosystem (see payouts.elixpo / mail.elixpo).

## Develop

```bash
npm install
./sops-reencrypt.sh --decrypt   # .env -> .env.local (needs the age key)
npm run dev                     # uses the Cloudflare REST API for bindings locally
```

## Deploy

```bash
./deploy.sh                     # push secrets + build + deploy to Pages
```

See `.env.example` for required environment variables.
