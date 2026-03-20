import { NextResponse } from 'next/server';

const POLLI_TOKEN = process.env.POLLINATIONS_API_TOKEN || process.env.NEXT_PUBLIC_POLLINATIONS_API_IMAGE;
const POLLI_BASE = 'https://gen.pollinations.ai';

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
      const errText = await res.text();
      return NextResponse.json({ error: `Edit failed (${res.status}): ${errText}` }, { status: res.status });
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
