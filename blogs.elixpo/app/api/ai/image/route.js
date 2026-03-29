// Server-side proxy for Pollinations image generation
// Keeps API key server-side

import { enforceAILimits } from '../../../../lib/aiRateLimit';

const POLLINATIONS_IMAGE_BASE = 'https://gen.pollinations.ai/v1/images/generations';

export const maxDuration = 120; // Allow up to 2 minutes for image generation

export async function POST(request) {
  const apiKey = process.env.POLLINATIONS_IMAGE_API_KEY || process.env.POLLINATIONS_TEXT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Image AI not configured' }), { status: 500 });
  }

  const { error } = await enforceAILimits();
  if (error) return error;

  const body = await request.json();
  const { prompt, model = 'gptimage', width = 1024, height = 768 } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 });
  }

  try {
    const imageRes = await fetch(POLLINATIONS_IMAGE_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        size: `${width}x${height}`,
        response_format: 'b64_json',
        n: 1,
      }),
    });

    if (!imageRes.ok) {
      const err = await imageRes.text();
      return new Response(JSON.stringify({ error: `Image generation failed: ${err}` }), { status: imageRes.status });
    }

    const data = await imageRes.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
