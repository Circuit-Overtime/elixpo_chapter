// Server-side proxy for Pollinations AI streaming
// Keeps API key server-side, streams SSE to client

const POLLINATIONS_BASE = 'https://gen.pollinations.ai/v1';

export async function POST(request) {
  const apiKey = process.env.POLLINATIONS_TEXT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500 });
  }

  const body = await request.json();
  const { systemPrompt, userPrompt, model = 'openai', temperature = 0.7 } = body;

  if (!userPrompt) {
    return new Response(JSON.stringify({ error: 'Missing userPrompt' }), { status: 400 });
  }

  const aiRes = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt },
      ],
      temperature,
      stream: true,
    }),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    return new Response(JSON.stringify({ error: `AI error: ${err}` }), { status: aiRes.status });
  }

  // Pass through the SSE stream directly
  return new Response(aiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
