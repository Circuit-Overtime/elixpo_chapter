# Elixpo Accounts — OAuth 2.0 Integration Spec

Base URL: https://accounts.elixpo.com

## Quick Start
1. Register an OAuth app at https://accounts.elixpo.com/dashboard/oauth-apps
2. Note your Client ID and Client Secret (shown once at creation)
3. Register up to 5 Redirect URI(s) — HTTP and HTTPS are both allowed

## Authorization Code Flow

### Step 1 — Redirect user to authorize
GET https://accounts.elixpo.com/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &state=RANDOM_CSRF_TOKEN
  &scope=openid profile email

### Step 2 — Handle the callback
On approval:  ?code=CODE&state=STATE
On denial:    ?error=access_denied&state=STATE

### Step 3 — Exchange code for tokens
POST https://accounts.elixpo.com/api/auth/token
Content-Type: application/json
{
  "grant_type": "authorization_code",
  "code": "CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/callback"
}

Response:
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "eyJ...",
  "scope": "openid profile email"
}

### Step 4 — Get user info
GET https://accounts.elixpo.com/api/auth/me
Authorization: Bearer ACCESS_TOKEN

Response:
{
  "id": "user-uuid",
  "email": "user@example.com",
  "displayName": "swift-falcon",
  "isAdmin": false,
  "provider": "email",
  "emailVerified": true
}

### Step 5 — Refresh tokens
POST https://accounts.elixpo.com/api/auth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "eyJ...",
  "client_id": "YOUR_CLIENT_ID"
}

## Error Codes
| Code                      | HTTP | Meaning                               |
|---------------------------|------|---------------------------------------|
| invalid_request           | 400  | Missing or malformed parameters       |
| invalid_client            | 401  | Unknown client_id or bad secret       |
| invalid_grant             | 400  | Code expired / used / redirect mismatch|
| access_denied             | 403  | User denied consent                   |
| unsupported_response_type | 400  | Only "code" is supported              |
| server_error              | 500  | Internal error                        |

## Notes
- Authorization codes are single-use and expire after 10 minutes
- Access tokens expire in 15 minutes by default
- Refresh tokens are rotated on each use (old one is revoked)
- Redirect URIs must exactly match a registered URI (no wildcards)
- Up to 5 redirect URIs per application
