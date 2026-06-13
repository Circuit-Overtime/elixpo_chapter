# App-Scoped Webhook Subscriptions

Elixpo Accounts can notify your OAuth app when something happens to a user who has authorized it — most notably, when that user deletes their Elixpo account so you can purge their data.

This replaces the prior "hardcoded receiver per env-var" pattern with self-service subscriptions: any registered OAuth app can declare a webhook URL at registration time and receive signed events for its users.

## What you'll receive

| Event             | When it fires                                           | Payload                                                                |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `user.deleted`    | A user permanently deletes their Elixpo account         | `{ "elixpo_id": "...", "deleted_at": "ISO-8601 UTC" }`                 |
| `user.updated`    | A user changes profile data (email, display_name, etc.) | `{ "elixpo_id": "...", "data": { "email"?, "display_name"?, ... } }`   |
| `app.revoked`     | A user revokes your app from Connected Services         | `{ "elixpo_id": "...", "client_id": "...", "revoked_at": "ISO-8601" }` |
| `app.authorized`  | A user newly authorizes your app                        | `{ "elixpo_id": "...", "client_id": "...", "authorized_at": "ISO-8601" }` |

You only get events for users who have authorized your specific app — we don't broadcast across apps.

## Subscribing

Pass `webhook_url` and `webhook_events` when you register your OAuth app:

```bash
curl -X POST https://accounts.elixpo.com/api/auth/oauth-clients \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "redirect_uris": ["https://myapp.com/oauth/callback"],
    "scopes": ["openid", "profile", "email"],
    "webhook_url": "https://myapp.com/api/webhooks/elixpo",
    "webhook_events": ["user.deleted", "user.updated"]
  }'
```

You'll get back **once**:

```json
{
  "client_id": "cli_…",
  "client_secret": "secret_…",
  "webhook_url": "https://myapp.com/api/webhooks/elixpo",
  "webhook_events": ["user.deleted", "user.updated"],
  "webhook_secret": "whk_…",
  "_notice": "Store client_secret and webhook_secret securely. Neither will be retrievable after this response."
}
```

Store `webhook_secret` somewhere your receiver can read it (e.g. as an env var). It's never returned again — rotate via the management endpoint if you lose it.

The webhook is **optional** — leave both fields off and you get an OAuth app with no event delivery.

## Verifying deliveries

Every POST to your webhook arrives with these headers:

```
Content-Type:        application/json
X-Elixpo-Event-Id:   <uuid>
X-Elixpo-Event:      user.deleted
X-Elixpo-Timestamp:  <unix-seconds>
X-Elixpo-Signature:  sha256=<hex>
```

The signature is `HMAC-SHA256(secret, "${timestamp}.${rawBody}")`. Treat the raw body as bytes — re-serializing JSON before signing changes whitespace and breaks verification.

**You MUST:**

1. Read `X-Elixpo-Timestamp` and reject anything outside a **±5 minute** window. Stops replay attacks.
2. Recompute the HMAC over `${timestamp}.${rawBody}` using your stored `webhook_secret` and compare against `X-Elixpo-Signature` (stripping the `sha256=` prefix). Use a constant-time compare.
3. Deduplicate on `X-Elixpo-Event-Id` — we retry on 5xx, so the same event may arrive more than once.

### Reference receiver (Web Crypto, edge-runtime safe)

```ts
async function verify(
  rawBody: string,
  signatureHeader: string,
  timestampHeader: string,
  secret: string,
): Promise<boolean> {
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
    return false;
  }
  const sigHex = signatureHeader.replace(/^sha256=/, "");
  if (!/^[0-9a-f]{64}$/.test(sigHex)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sig = new Uint8Array(sigHex.length / 2);
  for (let i = 0; i < sigHex.length; i += 2) {
    sig[i / 2] = parseInt(sigHex.slice(i, i + 2), 16);
  }
  return crypto.subtle.verify(
    "HMAC",
    key,
    sig.buffer,
    new TextEncoder().encode(`${ts}.${rawBody}`),
  );
}
```

## Response semantics

| Your response | What we do                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------ |
| **2xx**       | Mark delivered, stop retrying.                                                             |
| **4xx**       | Stop retrying. We treat 4xx as "your endpoint rejected it, fix and we'll catch up later."  |
| **5xx**       | Retry. (Future: exponential backoff over the next ~30 minutes.)                            |
| timeout (5s)  | Retry.                                                                                    |

The retry window for a single delivery is 30 minutes; use the `X-Elixpo-Event-Id` dedupe so you don't double-process when a delivery succeeded but your 2xx was lost in transit.

## What gets blocked

- `webhook_url` must use `https://` in production (`http://` is accepted in dev for localhost).
- You can only subscribe to events in the supported list above — unknown event names are rejected at registration.
- The dispatcher only targets users who have authorized your app (an active row in `refresh_tokens` for that `client_id`). We don't leak events for users your app has never seen.

## Operational notes

- **Secret storage**: D1 holds only the SHA-256 hash of your `webhook_secret`. The plaintext lives in KV under `webhook_secret:<client_id>` and is fetched on every dispatch. If you rotate the secret, both KV and D1 get updated atomically and the old secret stops being honored immediately.
- **No queue**: deliveries fire on the request that triggered the event (e.g. POST `/api/auth/delete-account`). The route doesn't `await` the dispatch — it runs via `Promise.allSettled` so a slow webhook can't slow user-facing requests, but if Cloudflare's edge tears down the worker mid-dispatch you may lose retries until a future event. Don't depend on real-time, in-order delivery; use the `X-Elixpo-Event-Id` for dedupe and treat events as eventually consistent.
- **Visibility**: `webhook_last_delivery_at` on `oauth_clients` records the most recent successful delivery to that app — useful when an integrator says "we stopped seeing webhooks last Tuesday".

## Updating a subscription

Use the management endpoint (PATCH `/api/auth/oauth-clients/:client_id/webhook`, doc-stubbed for a follow-up PR) to change `webhook_url` or `webhook_events`. Rotating the secret happens via a separate POST that returns the new plaintext exactly once and atomically swaps the hash + KV entry.

## Existing user-scoped webhooks

The legacy `webhooks` table — where individual users add webhook URLs to receive events about their own data — remains in place and is unaffected by this change. Use that if you need a per-user webhook (e.g. an admin who wants `auth.login_failed` events delivered to their own monitoring stack). Use the app-scoped path described here if you're an integrator who needs events about your users.
