import { NextResponse } from 'next/server';
import { POLLI_TOKEN, POLLI_BASE } from '../../pollinations';
import { getVideoCost } from '../../../lib/credits';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, model = 'wan', width = 1024, height = 576, duration = 5, imageUrl } = body;

    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    // Build video URL with query params
    const encoded = encodeURIComponent(prompt);
    const q = new URLSearchParams();
    q.set('model', model);
    q.set('duration', String(duration));
    q.set('nologo', 'true');
    q.set('referrer', 'elixpoart');

    // Determine aspect ratio
    if (width > height) q.set('aspectRatio', '16:9');
    else if (height > width) q.set('aspectRatio', '9:16');
    // else 1:1 is default

    if (imageUrl) q.set('image', imageUrl);

    const videoUrl = `${POLLI_BASE}/video/${encoded}?${q.toString()}`;

    const headers = {};
    if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;

    const res = await fetch(videoUrl, { headers });
    if (!res.ok) {
      let userMessage = 'Video generation failed. Please try again.';
      if (res.status === 403) userMessage = 'This prompt was flagged by content moderation. Try rephrasing.';
      else if (res.status === 429) userMessage = 'Too many requests. Please wait a moment.';
      else if (res.status >= 500) userMessage = 'The video service is temporarily unavailable.';
      return NextResponse.json({ error: userMessage, code: res.status }, { status: res.status });
    }

    const blob = await res.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const base64Video = buffer.toString('base64');

    return NextResponse.json({
      success: true,
      videoData: `data:video/mp4;base64,${base64Video}`,
      model,
      duration,
      creditsCost: getVideoCost(model),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Video generation failed' }, { status: 500 });
  }
}

export const maxDuration = 120; // Allow up to 2 minutes for video generation
