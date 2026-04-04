export const runtime = 'edge';
// Server-side proxy for lixsearch AI streaming
// Proxies SSE from search.elixpo.com session chat completions

import { enforceAILimits } from '../../../../lib/aiRateLimit';

const LIXSEARCH_BASE = 'https://search.elixpo.com';

export async function POST(request) {
  const { session: userSession, error } = await enforceAILimits();
  if (error) return error;

  const body = await request.json();
  const { sessionId, messages } = body;

  if (!sessionId || !messages?.length) {
    return new Response(JSON.stringify({ error: 'Missing sessionId or messages' }), { status: 400 });
  }

  try {
    const aiRes = await fetch(`${LIXSEARCH_BASE}/api/session/${sessionId}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return new Response(JSON.stringify({ error: `LixSearch error: ${err}` }), { status: aiRes.status });
    }

    // Pass through the SSE stream
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
