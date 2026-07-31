export const runtime = 'edge';

import { enforceAILimits } from '../../../../lib/aiRateLimit';

const ALLOWED_MODELS = new Set(['flux', 'gptimage']);

export async function POST(request) {
  const { error } = await enforceAILimits({ requireMember: true });
  if (error) return error;

  try {
    const { prompt, model = 'flux' } = await request.json();
    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt || cleanPrompt.length > 1000) {
      return Response.json(
        { error: cleanPrompt ? 'Prompt must be 1000 characters or fewer' : 'Missing prompt' },
        { status: 400 },
      );
    }
    if (!ALLOWED_MODELS.has(model)) {
      return Response.json({ error: 'Unsupported image model' }, { status: 400 });
    }

    const apiKey = process.env.POLLINATIONS_IMAGE_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Image generation is not configured' }, { status: 503 });
    }

    const seed = Math.floor(Math.random() * 1000000000);
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(cleanPrompt)}?model=${model}&seed=${seed}&nologo=true`;
    const imgRes = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (!imgRes.ok) {
      const status = imgRes.status === 429 ? 429 : 502;
      return Response.json(
        { error: status === 429 ? 'Image generation limit reached. Try again shortly.' : 'Image generation service unavailable' },
        { status },
      );
    }

    return new Response(imgRes.body, {
      headers: {
        'Content-Type': imgRes.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[ai/image] generation failed:', err);
    return Response.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
