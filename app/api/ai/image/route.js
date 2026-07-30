export const runtime = 'edge';

import { enforceAILimits } from '../../../../lib/aiRateLimit';

export async function POST(request) {
  const { error } = await enforceAILimits();
  if (error) return error;

  try {
    const { prompt, model = 'flux' } = await request.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 });
    }

    const apiKey = process.env.POLLINATIONS_IMAGE_API_KEY || '';
    const seed = Math.floor(Math.random() * 1000000000);
    // Pollinations image URL format:
    // https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&seed=${seed}&nologo=true
    
    let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&seed=${seed}&nologo=true`;
    
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const imgRes = await fetch(url, { headers });
    if (!imgRes.ok) {
       throw new Error(`Pollinations API error: ${imgRes.status}`);
    }

    return new Response(imgRes.body, {
      headers: {
        'Content-Type': imgRes.headers.get('Content-Type') || 'image/jpeg',
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Image generation failed' }), { status: 500 });
  }
}
