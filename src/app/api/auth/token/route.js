const ACCOUNTS_BASE = 'https://accounts.elixpo.com';
const CLIENT_SECRET = process.env.ELIXPO_CLIENT_SECRET || '';

export async function POST(request) {
  const body = await request.json();

  // Inject client_secret server-side — never exposed to the browser
  const payload = { ...body };
  if (body.grant_type === 'authorization_code') {
    payload.client_secret = CLIENT_SECRET;
  }

  const res = await fetch(`${ACCOUNTS_BASE}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
