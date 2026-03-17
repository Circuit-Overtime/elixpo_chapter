'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Chip, Alert, Snackbar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// LLM-optimized spec (plain text for clipboard)
// ---------------------------------------------------------------------------
const LLM_SPEC = `# Elixpo Accounts — OAuth 2.0 Integration Spec

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
`;

// ---------------------------------------------------------------------------
// Section data for the docs page
// ---------------------------------------------------------------------------
const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: `Elixpo Accounts is an OAuth 2.0 Identity Provider. Any third-party application can register as an OAuth client and authenticate users through the standard **Authorization Code** flow.

After registering your app you receive a **Client ID** and a **Client Secret**. Users are redirected to the Elixpo consent screen, approve access, and your app receives an authorization code that can be exchanged for access and refresh tokens.`,
  },
  {
    id: 'register',
    title: '1. Register Your Application',
    content: `Go to the **Dashboard > OAuth Apps** page and click **New OAuth App**.

You will need:
- **Application name** — shown to users on the consent screen
- **Homepage URL** — your application's homepage
- **Redirect URI(s)** — the callback URL(s) where users are sent after authorization. You can register up to **5** URIs. Both HTTP and HTTPS are accepted.

After creation you'll see the **Client ID** and **Client Secret**. The secret is only shown once — store it securely.`,
  },
  {
    id: 'authorize',
    title: '2. Redirect to Authorization',
    code: `GET /oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &state=RANDOM_CSRF_TOKEN
  &scope=openid profile email`,
    content: `Redirect the user's browser to the URL above. If the user is not logged in they will be shown the Elixpo login page first.

| Parameter     | Required | Description |
|---------------|----------|-------------|
| response_type | Yes      | Must be \`code\` |
| client_id     | Yes      | Your OAuth app's Client ID |
| redirect_uri  | Yes      | Must exactly match a registered redirect URI |
| state         | Yes      | Random string for CSRF protection |
| scope         | No       | Space-separated scopes (default: \`openid profile email\`) |`,
  },
  {
    id: 'callback',
    title: '3. Handle the Callback',
    content: `After the user approves (or denies) access, they are redirected back to your \`redirect_uri\`:

**Approved:**
\`\`\`
https://yourapp.com/callback?code=code_abc123&state=YOUR_STATE
\`\`\`

**Denied:**
\`\`\`
https://yourapp.com/callback?error=access_denied&state=YOUR_STATE
\`\`\`

Always verify that the returned \`state\` matches what you sent in the previous step.`,
  },
  {
    id: 'token',
    title: '4. Exchange Code for Tokens',
    code: `POST /api/auth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "code_abc123",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/callback"
}`,
    content: `This must be done **server-side** — never expose your client secret in frontend code.

The authorization code is **single-use** and expires after **10 minutes**.

**Response:**
\`\`\`json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "eyJ...",
  "scope": "openid profile email"
}
\`\`\``,
  },
  {
    id: 'userinfo',
    title: '5. Fetch User Profile',
    code: `GET /api/auth/me
Authorization: Bearer ACCESS_TOKEN`,
    content: `**Response:**
\`\`\`json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "displayName": "swift-falcon",
  "isAdmin": false,
  "provider": "email",
  "emailVerified": true
}
\`\`\`

Use \`id\` as the stable unique identifier for the user.`,
  },
  {
    id: 'refresh',
    title: '6. Refresh Tokens',
    code: `POST /api/auth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "eyJ...",
  "client_id": "YOUR_CLIENT_ID"
}`,
    content: `Access tokens expire in **15 minutes** by default. Use the refresh token to get a new pair.

Refresh tokens are **rotated** on each use — the old token is revoked and a new one is issued. Store the new refresh token securely.`,
  },
  {
    id: 'errors',
    title: 'Error Reference',
    content: `All errors follow the standard OAuth 2.0 format:

\`\`\`json
{ "error": "invalid_client", "error_description": "Client not found" }
\`\`\`

| Error Code | HTTP | Meaning |
|---|---|---|
| \`invalid_request\` | 400 | Missing or malformed parameters |
| \`invalid_client\` | 401 | Unknown client_id or bad client_secret |
| \`invalid_grant\` | 400 | Code expired, used, or redirect mismatch |
| \`access_denied\` | 403 | User denied consent |
| \`unsupported_response_type\` | 400 | Only \`code\` is supported |
| \`server_error\` | 500 | Internal error |`,
  },
  {
    id: 'example',
    title: 'Node.js Example',
    code: `// 1. Generate authorization URL
const state = crypto.randomUUID();
const authUrl = \`https://accounts.elixpo.com/oauth/authorize?\` +
  \`response_type=code&client_id=\${CLIENT_ID}\` +
  \`&redirect_uri=\${encodeURIComponent(REDIRECT_URI)}\` +
  \`&state=\${state}&scope=openid profile email\`;
// Redirect user to authUrl...

// 2. In your callback handler
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  // Verify state matches session...

  // 3. Exchange code for tokens
  const tokenRes = await fetch(
    'https://accounts.elixpo.com/api/auth/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    }
  );
  const tokens = await tokenRes.json();

  // 4. Fetch user profile
  const userRes = await fetch(
    'https://accounts.elixpo.com/api/auth/me',
    { headers: { Authorization: \`Bearer \${tokens.access_token}\` } }
  );
  const user = await userRes.json();
  // user.id, user.email, user.displayName now available
});`,
    content: '',
  },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const cardSx = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  p: 3,
  mb: 3,
};

const codeSx = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(163,230,53,0.15)',
  borderRadius: '8px',
  p: 2,
  fontFamily: 'monospace',
  fontSize: '0.82rem',
  color: '#a3e635',
  overflowX: 'auto' as const,
  whiteSpace: 'pre' as const,
  mb: 2,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DocsPage() {
  const [copied, setCopied] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const copyLLMSpec = () => {
    navigator.clipboard.writeText(LLM_SPEC);
    setCopied(true);
  };

  const copyBlock = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)', p: 3 }}>
      <Box sx={{ maxWidth: '860px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 1 }}>
          <Button
            component={Link}
            href="/dashboard/oauth-apps"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, textTransform: 'none', '&:hover': { color: '#fff' } }}
          >
            Dashboard
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5f5f4', mb: 0.5 }}>
              Integration Docs
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>
              Authenticate users with Elixpo Accounts via OAuth 2.0
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={copyLLMSpec}
            sx={{
              color: '#a3e635',
              borderColor: 'rgba(163,230,53,0.3)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { borderColor: '#a3e635', bgcolor: 'rgba(163,230,53,0.1)' },
            }}
          >
            Copy LLM Spec
          </Button>
        </Box>

        {/* Base URL chip */}
        <Box sx={{ mb: 4 }}>
          <Chip
            label="Base URL: https://accounts.elixpo.com"
            sx={{
              bgcolor: 'rgba(163,230,53,0.1)',
              color: '#a3e635',
              border: '1px solid rgba(163,230,53,0.2)',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          />
        </Box>

        {/* Table of contents */}
        <Box sx={{ ...cardSx, mb: 4 }}>
          <Typography sx={{ color: '#f5f5f4', fontWeight: 600, mb: 1.5 }}>Contents</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {sections.map((s) => (
              <Typography
                key={s.id}
                component="a"
                href={`#${s.id}`}
                sx={{ color: '#a3e635', fontSize: '0.9rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {s.title}
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Sections */}
        {sections.map((section) => (
          <Box key={section.id} id={section.id} sx={cardSx}>
            <Typography variant="h6" sx={{ color: '#a3e635', fontWeight: 700, mb: 2 }}>
              {section.title}
            </Typography>

            {section.code && (
              <Box sx={{ position: 'relative' }}>
                <Box sx={codeSx}>{section.code}</Box>
                <Button
                  size="small"
                  onClick={() => copyBlock(section.code!, section.id)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 'auto',
                    color: copiedBlock === section.id ? '#22c55e' : 'rgba(255,255,255,0.4)',
                    fontSize: '0.7rem',
                    textTransform: 'none',
                  }}
                >
                  {copiedBlock === section.id ? 'Copied!' : 'Copy'}
                </Button>
              </Box>
            )}

            {section.content && (
              <Typography
                component="div"
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                  '& strong': { color: '#f5f5f4' },
                  '& code': {
                    background: 'rgba(163,230,53,0.1)',
                    color: '#a3e635',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                  },
                  '& pre': {
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(163,230,53,0.15)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    color: '#a3e635',
                    my: 2,
                  },
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    my: 2,
                  },
                  '& th, & td': {
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.82rem',
                  },
                  '& th': { color: '#a3e635', fontWeight: 600 },
                  '& td': { color: 'rgba(255,255,255,0.7)' },
                }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content) }}
              />
            )}
          </Box>
        ))}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            Need help? Contact <a href="mailto:accounts@elixpo.com" style={{ color: '#a3e635', textDecoration: 'none' }}>accounts@elixpo.com</a>
          </Typography>
        </Box>
      </Box>

      {/* Toast */}
      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopied(false)} severity="success" variant="filled" sx={{ bgcolor: '#15803d' }}>
          LLM spec copied to clipboard
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Minimal markdown → HTML (good enough for the content above)
// ---------------------------------------------------------------------------
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre>$2</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (_, row) => {
      const cells = row.split('|').map((c: string) => c.trim());
      return '<tr>' + cells.map((c: string) => {
        if (/^[-:]+$/.test(c)) return '';
        return `<td>${c}</td>`;
      }).join('') + '</tr>';
    })
    // Wrap table rows
    .replace(/((<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
    // Remove separator rows
    .replace(/<tr>(<td><\/td>)+<\/tr>/g, '')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}
