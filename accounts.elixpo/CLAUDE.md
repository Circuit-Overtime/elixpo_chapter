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
  |-- 5. GET /api/auth/me ------------>|
  |   Authorization: Bearer <token>    |
  |                                    |
  |<-- 6. User profile data ----------|
```

### Step 1: Redirect to Authorization

Redirect the user's browser to:

```
https://accounts.elixpo.com/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &state=RANDOM_CSRF_TOKEN
  &scope=openid profile email
```

| Parameter       | Required | Description                                      |
|-----------------|----------|--------------------------------------------------|
| response_type   | Yes      | Must be `code`                                   |
| client_id       | Yes      | Your registered OAuth app's Client ID            |
| redirect_uri    | Yes      | Must exactly match a registered redirect URI      |
| state           | Yes      | Random string for CSRF protection — verify on callback |
| scope           | No       | Space-separated scopes (default: `openid profile email`) |
| nonce           | No       | Optional nonce for replay protection             |

If the user is not logged in, they'll be redirected to the Elixpo login page and then back to the consent screen automatically.

### Step 2: Handle the Callback

After the user approves (or denies), they're redirected to your `redirect_uri`:

**On approval:**
```
https://yourapp.com/callback?code=code_abc123...&state=YOUR_STATE
```

**On denial:**
```
https://yourapp.com/callback?error=access_denied&error_description=User+denied+access&state=YOUR_STATE
```

Always verify that `state` matches what you sent in Step 1.

### Step 3: Exchange Code for Tokens

Make a server-side POST request (do **not** expose your client secret in frontend code):

```bash
curl -X POST https://accounts.elixpo.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "code_abc123...",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "https://yourapp.com/callback"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "scope": "openid profile email"
}
```

The authorization code is single-use and expires after 10 minutes.

### Step 4: Get User Info

Use the access token to fetch the authenticated user's profile:

```bash
curl https://accounts.elixpo.com/api/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Response:**
```json
{
  "id": "user-uuid",
  "userId": "user-uuid",
  "email": "user@example.com",
  "displayName": "swift-falcon",
  "isAdmin": false,
  "provider": "email",
  "avatar": null,
  "emailVerified": true,
  "expiresAt": "2026-03-08T12:30:00.000Z"
}
```

### Step 5: Refresh Tokens

Access tokens expire in 15 minutes by default. Use the refresh token to get a new pair:

```bash
curl -X POST https://accounts.elixpo.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "client_id": "YOUR_CLIENT_ID"
  }'
```

**Response:**
```json
{
  "access_token": "NEW_ACCESS_TOKEN",
  "refresh_token": "NEW_REFRESH_TOKEN",
  "token_type": "Bearer",
  "expires_in": 900
}
```

Refresh tokens are rotated on each use (the old one is revoked).

### Error Responses

All error responses follow the OAuth 2.0 error format:

```json
{
  "error": "invalid_client",
  "error_description": "Client not found"
}
```

| Error Code                | HTTP Status | Meaning                                |
|---------------------------|-------------|----------------------------------------|
| invalid_request           | 400         | Missing or malformed parameters        |
| invalid_client            | 401         | Unknown client_id or bad client_secret |
| invalid_grant             | 400         | Code expired, used, or redirect mismatch |
| access_denied             | 403         | User denied consent                    |
| unsupported_response_type | 400         | Only `code` is supported               |
| server_error              | 500         | Internal error                         |

### Example Integration (Node.js)

```js
// 1. Generate authorization URL
const state = crypto.randomUUID();
// Store state in session for CSRF validation
const authUrl = `https://accounts.elixpo.com/oauth/authorize?` +
  `response_type=code&client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&state=${state}&scope=openid profile email`;

// Redirect user to authUrl...

// 2. In your callback handler
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  // Verify state matches session...

  // 3. Exchange code for tokens
  const tokenRes = await fetch('https://accounts.elixpo.com/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  });
  const tokens = await tokenRes.json();

  // 4. Fetch user profile
  const userRes = await fetch('https://accounts.elixpo.com/api/auth/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json();

  // user.id, user.email, user.displayName are now available
  // Create a session in your app for this user...
});
```

## Development

```bash
npm run dev          # Local dev server (next dev)
npm run pages:build  # Cloudflare Pages build
```

Migrations are in `src/workers/migrations/` and applied via `wrangler d1 execute`.
