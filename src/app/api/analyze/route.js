import { NextResponse } from 'next/server';
import { POLLI_TOKEN, POLLI_BASE } from '../pollinations';

export async function POST(request) {
  try {
    const { image, query } = await request.json();
    if (!image || !query) {
      return NextResponse.json({ error: 'Image and query are required' }, { status: 400 });
    }

    const headers = { 'Content-Type': 'application/json' };
    if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;

    const res = await fetch(`${POLLI_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'openai',
        messages: [
          {
            role: 'system',
            content: 'You are a precise image analysis assistant. Analyze images and reply ONLY with valid JSON, no markdown, no extra text, no code blocks.',
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image } },
              { type: 'text', text: query },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error('[analyze] API error:', res.status);
      return NextResponse.json({ hasCharacter: true, characters: [], reason: 'Analysis unavailable' });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    // Try to parse JSON — may be wrapped in markdown code block
    const jsonMatch = raw.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      } catch {}
    }

    // Fallback
    const lower = raw.toLowerCase();
    const hasCharacter = lower.includes('true') || lower.includes('yes');
    return NextResponse.json({ hasCharacter, characters: [], reason: raw.slice(0, 200) });
  } catch (err) {
    console.error('[analyze] Error:', err.message);
    return NextResponse.json({ hasCharacter: true, characters: [], reason: 'Analysis failed' });
  }
}
