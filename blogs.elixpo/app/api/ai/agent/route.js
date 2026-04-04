export const runtime = 'edge';
// Non-streaming AI endpoint via lixsearch session chat completions
// Fallback for cases where streaming isn't needed

import { enforceAILimits } from '../../../../lib/aiRateLimit';

const LIXSEARCH_BASE = 'https://search.elixpo.com';

export async function POST(request) {
  const { error } = await enforceAILimits();
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
        stream: false,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return new Response(JSON.stringify({ error: `LixSearch error: ${err}` }), { status: aiRes.status });
    }

    const data = await aiRes.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'AI request failed' }), { status: 500 });
  }
}
