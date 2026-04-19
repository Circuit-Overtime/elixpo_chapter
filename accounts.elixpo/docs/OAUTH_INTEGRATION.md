# Elixpo OAuth 2.0 Integration Guide

For third-party services integrating with Elixpo Accounts as an OAuth identity provider.

**Base URL**: `https://accounts.elixpo.com`

## Prerequisites

1. Register an OAuth app at `https://accounts.elixpo.com/dashboard/oauth-apps`
2. Save your **Client ID** and **Client Secret** (secret is shown once at creation)
3. Register your **Redirect URI(s)** — HTTPS in production

## Flow Overview

Standard OAuth 2.0 Authorization Code flow:

```
Your App                         Elixpo Accounts
  |                                    |
  |-- 1. Redirect to /oauth/authorize->|
  |                                    |-- User logs in (if needed)
  |                                    |-- User sees consent screen
  |<-- 2. Redirect with code ----------|
  |                                    |
  |-- 3. POST /api/auth/token -------->|
  |<-- 4. Access + Refresh tokens -----|
  |                                    |
  |-- 5. GET /api/auth/me ------------>|
  |<-- 6. User profile data -----------|
```

## Step 1 — Authorization Request

Redirect the user to:

```
https://accounts.elixpo.com/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &state=RANDOM_CSRF_TOKEN
  &scope=openid profile email
```

| Parameter       | Required | Description |
|-----------------|----------|-------------|
| `response_type` | Yes      | Must be `code` |
| `client_id`     | Yes      | Your registered OAuth app's Client ID |
| `redirect_uri`  | Yes      | Must exactly match a registered redirect URI |
| `state`         | Yes      | Random string for CSRF protection — verify on callback |
| `scope`         | No       | Space-separated (default: `openid profile email`) |
| `nonce`         | No       | Optional nonce for replay protection |

If the user is not logged in, they are redirected to the Elixpo login page and back to the consent screen automatically.

## Step 2 — Handle the Callback

**On approval:**
```
https://yourapp.com/callback?code=code_abc123...&state=YOUR_STATE
```

**On denial:**
```
https://yourapp.com/callback?error=access_denied&error_description=User+denied+access&state=YOUR_STATE
```

Always verify that `state` matches what you sent. Reject otherwise.

## Step 3 — Exchange Code for Tokens

Server-side only — never expose the client secret in frontend code.

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

The authorization code is **single-use** and expires after 10 minutes.

## Step 4 — Fetch User Info

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

## Step 5 — Refresh Tokens

Access tokens expire in 15 minutes. Use the refresh token to rotate:

```bash
curl -X POST https://accounts.elixpo.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "client_id": "YOUR_CLIENT_ID"
  }'
```

Refresh tokens are **rotated on each use** — the old one is revoked. Store the new one.

## Error Responses

Standard OAuth 2.0 error format:

```json
{
  "error": "invalid_client",
  "error_description": "Client not found"
}
```

| Error Code                  | HTTP | Meaning |
|-----------------------------|------|---------|
| `invalid_request`           | 400  | Missing or malformed parameters |
| `invalid_client`            | 401  | Unknown client_id or bad client_secret |
| `invalid_grant`             | 400  | Code expired, reused, or redirect mismatch |
| `access_denied`             | 403  | User denied consent |
| `unsupported_response_type` | 400  | Only `code` is supported |
| `server_error`              | 500  | Internal error — retry later or contact support |

## Example — Node.js

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
  // Verify state matches session — reject if not

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

  // user.id, user.email, user.displayName — create a session in your app
});
```

## Support

Issues: https://github.com/elixpo/accounts.elixpo/issues
