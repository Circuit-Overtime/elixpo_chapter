/**
 * Elixpo Accounts OAuth 2.0 — Authorization Code flow.
 *
 * Flow:
 * 1. User clicks "Sign in" -> redirect to Elixpo authorize URL
 * 2. User approves -> redirected back to /api/auth/callback?code=...&state=...
 * 3. Callback route exchanges code for tokens server-side
 * 4. Tokens + user info stored in localStorage
 */

const ELIXPO_BASE = "https://accounts.elixpo.com";

const CLIENT_ID = process.env.NEXT_PUBLIC_ELIXPO_ACCOUNTS_CLIENT_ID || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

/** Generate a random state token for CSRF protection */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Start the OAuth flow — redirects the browser */
export function startLogin() {
  const state = generateState();
  sessionStorage.setItem("oauth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: "openid profile email",
  });

  window.location.href = `${ELIXPO_BASE}/oauth/authorize?${params}`;
}

/** Verify the state parameter matches what we stored */
export function verifyState(state: string): boolean {
  const stored = sessionStorage.getItem("oauth_state");
  sessionStorage.removeItem("oauth_state");
  return stored === state;
}

export { CLIENT_ID, REDIRECT_URI, ELIXPO_BASE };
