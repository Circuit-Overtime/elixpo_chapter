# Cloudflare deployment

The dashboard uses two independently deployable Cloudflare services:

- **Pages** serves the static Next.js frontend at `agent.elixpo.com`.
- **agent-elixpo-api Worker** serves live GitHub data at `agent.elixpo.com/api/*`.

The frontend has no credentials or mutation controls. The Worker owns the optional read-only GitHub token and can scale independently as floors are added.

## 1. Deploy the dashboard API Worker

```bash
cd workers/dashboard-api
npm install
npx wrangler login
npx wrangler deploy
npx wrangler secret put ELIXPO_DASHBOARD_GITHUB_TOKEN
```

Use a dedicated fine-grained GitHub token scoped only to `elixpo/agent.elixpo`, with read access to Actions, Contents, Issues, Pull requests, and Metadata. The API also works anonymously at GitHub's lower public rate limit.

The Worker configuration installs the route `agent.elixpo.com/api/*`. Do not attach the whole `agent.elixpo.com` hostname to this Worker.

## 2. Deploy the Pages frontend

From `agent.elixpo/`:

```bash
npm ci
npm run deploy
```

The deploy script performs the static Next.js export and uploads `out/` to the `agent-elixpo-web` Pages project. This distinct name avoids colliding with the obsolete `agent-elixpo` SSR Worker. For Git integration use:

- Root directory: `agent.elixpo`
- Build command: `npm run build`
- Build output directory: `out`
- Production branch: `main`

No frontend secret or API URL is required in production because it calls the same-origin `/api/snapshot` route. For local development against `wrangler dev --port 8788`, set:

```bash
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:8788
```

## 3. Attach the domain

1. Remove the existing `agent.elixpo.com` Custom Domain and catch-all route from the old `agent-elixpo` SSR Worker.
2. Add `agent.elixpo.com` as the `agent-elixpo-web` Pages project's Custom Domain.
3. Keep the Worker route `agent.elixpo.com/api/*` assigned to `agent-elixpo-api`.

Cloudflare serves Pages for the site and intercepts only `/api/*` for live data.
