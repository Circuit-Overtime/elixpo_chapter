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
        model: 'gemini-fast',
        messages: [
          {
            role: 'system',
            content: 'Analyze this image and answer the question. Reply ONLY with valid JSON, no extra text.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: query },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ hasCharacter: true, reason: 'Analysis unavailable, proceeding' });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    // Parse JSON from response (may be wrapped in markdown code block)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      } catch {}
    }

    // Fallback: check for yes/true keywords
    const lower = raw.toLowerCase();
    const hasCharacter = lower.includes('true') || lower.includes('yes');
    return NextResponse.json({ hasCharacter, reason: raw.slice(0, 100) });
  } catch (err) {
    // On error, allow through (don't block the feature)
    return NextResponse.json({ hasCharacter: true, reason: 'Analysis failed, proceeding' });
  }
}
