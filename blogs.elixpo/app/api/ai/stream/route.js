export const runtime = 'edge';
// Server-side proxy for lixsearch AI streaming
// Uses GET /api/search?query=...&stream=true&session_id=... which auto-creates sessions

import { enforceAILimits } from '../../../../lib/aiRateLimit';

const LIXSEARCH_BASE = 'https://search.elixpo.com';

export async function POST(request) {
  const { error } = await enforceAILimits();
  if (error) return error;

  const body = await request.json();
  const { sessionId, query } = body;

  if (!sessionId || !query) {
    return new Response(JSON.stringify({ error: 'Missing sessionId or query' }), { status: 400 });
  }

  try {
    const url = `${LIXSEARCH_BASE}/api/search?query=${encodeURIComponent(query)}&stream=true&session_id=${encodeURIComponent(sessionId)}`;

    const aiRes = await fetch(url);

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return new Response(JSON.stringify({ error: `LixSearch error: ${err}` }), { status: aiRes.status });
    }

    return new Response(aiRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Stream request failed' }), { status: 500 });
  }
}
