# ElixpoURL Docs — Overview

Source: https://lixrl.com/docs

This is one section of the ElixpoURL developer documentation. ElixpoURL is an open URL shortener built on Cloudflare's edge — short links, click analytics, and a REST API.

---
# Overview

ElixpoURL is an open URL shortener built on Cloudflare's edge. Short links, real-time click analytics, and a developer-first REST API — for any app you ship, Elixpo or not.

## What you get

- Edge-native redirects — every short link resolves on Cloudflare's edge, sub-50ms anywhere.
- Click analytics — counts, geo, referrers, devices, browsers; no third-party script.
- REST API + API keys with scoped permissions.
- Custom slugs, bulk operations, soft-delete, and TTLs.
- Sign in via Elixpo Accounts SSO — no separate password.

## Get started

Three ways into ElixpoURL, depending on how you like to work.

## How sign-in works

ElixpoURL doesn't store passwords. Every user signs in through Elixpo Accounts SSO — the same login that opens chat, art, blogs, and the rest of the ecosystem. Hit /api/auth/login to start the OAuth flow; we handle the callback, set the session cookie, and bounce you to your dashboard.

For machine-to-machine access, mint an API key from your dashboard and send it in the Authorization header.

## Conventions

- Base URL: https://lixrl.com
- API path prefix: /api
- All requests/responses are JSON unless stated otherwise.
- Errors follow the format { "error": "code", "message": "..." } — see Error Reference.

# ElixpoURL Docs — Shortening API

Source: https://lixrl.com/docs/api

This is one section of the ElixpoURL developer documentation. ElixpoURL is an open URL shortener built on Cloudflare's edge — short links, click analytics, and a REST API.

---
# Shortening API

Create and manage account-owned short links, or use the browser-only guest flow for one temporary link. This reference documents request fields, response bodies, tier restrictions, pagination, expiry, and failure behavior as implemented by the edge routes.

## Authentication

Account endpoints accept a scoped API key in the standard Bearer header. Create a key under Profile → API Keys. Never place API keys in URLs or browser-delivered JavaScript.

```
Authorization: Bearer elu_YOUR_API_KEY
```

## Guest shortening

Creates one temporary short link from the public landing page. The service fixes the expiry at 24 hours, generates the code, stores no click analytics, and returns 429 while the derived guest identity is still inside its quota window.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| url | string | Yes | Absolute HTTP or HTTPS destination, maximum 2,048 characters. Private, loopback, unsafe, and denylisted hosts are rejected. |

```
fetch('/api/guest/urls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/article' })
})
```

```
{
  "short_url": "https://lixrl.com/gA1b2C3",
  "short_code": "gA1b2C3",
  "original_url": "https://example.com/article",
  "expires_at": "2026-08-02T10:30:00.000Z",
  "guest": true
}
```

### Guest quota response

```
{
  "error": "Your guest link has already been used. Sign in for persistent links.",
  "account_required": true,
  "available_at": "2026-08-02T10:30:00.000Z"
}
```

The response includes Retry-After in seconds. Guest links cannot be listed, edited, recovered, or converted into account links after creation.

## Create an account link

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| url | string | Yes | Absolute HTTP or HTTPS destination. The same private-network and safe-content checks used by guest shortening apply. |
| title | string | No | Human-readable label between 1 and 255 characters. |
| custom_code | string | No | Pro or higher. A unique 3–32 character slug containing letters, digits, hyphens, or underscores. |
| expires_at | ISO 8601 | No | Pro or higher. A future timestamp; null/omitted links do not expire. |

```
curl -X POST https://lixrl.com/api/urls \
  -H "Authorization: Bearer elu_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/long-url",
    "title": "Launch announcement",
    "custom_code": "launch",
    "expires_at": "2026-12-31T23:59:59.000Z"
  }'
```

```
{
  "short_url": "https://lixrl.com/launch",
  "short_code": "launch",
  "original_url": "https://example.com/long-url",
  "title": "Launch announcement",
  "created_at": "2026-08-01 10:30:00",
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

Free accounts can own up to 25 links. A duplicate custom code returns 409; unavailable tier features and exhausted account quotas return 403.

## List account links

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| limit | integer | No | Page size from 1–100. Defaults to 50. |
| offset | integer | No | Number of matching records to skip. Defaults to 0; maximum 100,000. |
| search | string | No | Case-insensitive match against short code, destination, or title. Input is capped at 100 characters. |

```
curl 'https://lixrl.com/api/urls?limit=20&offset=0&search=example' \
  -H "Authorization: Bearer elu_YOUR_KEY"
```

```
{
  "urls": [
    {
      "id": 42,
      "user_id": 7,
      "short_code": "launch",
      "original_url": "https://example.com/long-url",
      "title": "Launch announcement",
      "is_active": 1,
      "clicks": 18,
      "created_at": "2026-08-01 10:30:00",
      "updated_at": "2026-08-01 10:30:00",
      "expires_at": null
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## Get an account link

Returns the complete URL record shown in the list response. Ownership is enforced: an unknown code or a code belonging to another account returns 404.

```
curl https://lixrl.com/api/urls/launch \
  -H "Authorization: Bearer elu_YOUR_KEY"
```

## Update an account link

Send at least one mutable field. The short code itself cannot be changed.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| url | string | No | New validated HTTP or HTTPS destination. |
| title | string \| null | No | New 1–255 character title, or null to remove it. |
| is_active | boolean | No | False disables redirects without deleting the record or analytics. |
| expires_at | ISO 8601 \| null | No | Future timestamp, or null to remove expiry. |

```
curl -X PATCH https://lixrl.com/api/urls/launch \
  -H "Authorization: Bearer elu_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/new","title":null,"is_active":true}'
```

```
{
  "success": true
}
```

## Delete an account link

Permanently removes the link and its click records. This operation is irreversible; use is_active: false when you may need to restore the redirect later.

```
curl -X DELETE https://lixrl.com/api/urls/launch \
  -H "Authorization: Bearer elu_YOUR_KEY"
```

```
{
  "success": true
}
```

## Status codes and retries

| Status | Meaning | Action |
| --- | --- | --- |
| 400 | Malformed input or unsupported field value. | Correct the request before retrying. |
| 401 | Missing, invalid, expired, or revoked credentials. | Replace the API key. |
| 403 | Tier restriction, quota, risk rejection, or CSRF failure. | Read the error string; signing in or upgrading may be required. |
| 404 | The account does not own a matching short code. | Verify the code and credentials. |
| 409 | Requested custom code is already taken. | Choose another code or omit custom_code. |
| 422 | Safe Browsing rejected the destination. | Use a safe destination; do not retry unchanged. |
| 429 | Rate or guest quota exceeded. | Wait for Retry-After before retrying. |
| 500/503 | Transient service or configuration failuregit. | Retry with capped exponential backoff. |

See the dedicated error reference for response conventions and retry guidance.
