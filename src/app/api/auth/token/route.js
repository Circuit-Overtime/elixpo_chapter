const ACCOUNTS_BASE = 'https://accounts.elixpo.com';

export async function POST(request) {
  const body = await request.json();

  const res = await fetch(`${ACCOUNTS_BASE}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
