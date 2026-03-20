import { NextResponse } from 'next/server';
import { POLLI_TOKEN, POLLI_BASE } from '../../pollinations';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, imageUrl, model = 'gptimage', width = 1024, height = 576 } = body;

    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ error: 'Image URL is required for editing' }, { status: 400 });

    const polliBody = {
      prompt,
      model,
      image: imageUrl,
      size: `${width}x${height}`,
      response_format: 'b64_json',
      nologo: true,
      user: 'elixpoart',
    };

    const headers = { 'Content-Type': 'application/json' };
    if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;

    const res = await fetch(`${POLLI_BASE}/v1/images/edits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(polliBody),
    });

    if (!res.ok) {
      let userMessage = 'Edit failed. Please try again.';
      if (res.status === 403) userMessage = 'This edit was flagged by content moderation. Try rephrasing your description.';
      else if (res.status === 429) userMessage = 'Too many requests. Please wait a moment.';
      else if (res.status >= 500) userMessage = 'The editing service is temporarily unavailable.';
      return NextResponse.json({ error: userMessage, code: res.status }, { status: res.status });
    }

    const data = await res.json();
    const imageData = data.data?.[0]?.b64_json;
    const resultUrl = data.data?.[0]?.url;

    if (!imageData && !resultUrl) {
      return NextResponse.json({ error: 'No image data returned' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageData: imageData ? `data:image/png;base64,${imageData}` : null,
      imageUrl: resultUrl || null,
      model,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Edit failed' }, { status: 500 });
  }
}
