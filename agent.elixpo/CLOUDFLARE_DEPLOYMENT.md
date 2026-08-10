# Cloudflare deployment

This frontend is a read-only, dynamically rendered Next.js application deployed as a Cloudflare Worker through the OpenNext adapter.

## First deployment

From `agent.elixpo/`:

```bash
npm ci
npx wrangler login
npx wrangler secret put ELIXPO_DASHBOARD_GITHUB_TOKEN
npm run deploy
```

`ELIXPO_DASHBOARD_GITHUB_TOKEN` is optional for a public control repository, but avoids GitHub's anonymous API rate limit. Use a dedicated fine-grained token scoped only to `elixpo/agent.elixpo` with read access to Actions, Contents, Issues, Pull requests, and Metadata. Never reuse an OreoFlow mutation token.

The committed Wrangler configuration supplies `ELIXPO_GITHUB_CONTROL_REPO=elixpo/agent.elixpo`. No secret value is committed.

## Validate in the Workers runtime

```bash
npm run preview
```

The command builds `.open-next/` and starts Wrangler locally. The regular development server remains `npm run dev`.

## Custom domain

After the first deployment, attach `agent.elixpo.com` from **Cloudflare Dashboard → Workers & Pages → agent-elixpo → Settings → Domains & Routes**. The hostname is intentionally absent from `wrangler.jsonc`, so deployment cannot create or replace its DNS record.

## Updating production

```bash
npm ci
npm run lint
npm run build:cloudflare
npm run deploy
```
