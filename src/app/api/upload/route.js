import { NextResponse } from 'next/server';

const POLLI_TOKEN = process.env.POLLINATIONS_API_TOKEN || process.env.NEXT_PUBLIC_POLLINATIONS_API_IMAGE;
const MEDIA_BASE = 'https://media.pollinations.ai';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Forward to Pollinations media storage
    const uploadForm = new FormData();
    uploadForm.append('file', file);

    const headers = {};
    if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;

    const res = await fetch(`${MEDIA_BASE}/upload`, {
      method: 'POST',
      headers,
      body: uploadForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Upload failed: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      id: data.id,
      url: data.url,
      contentType: data.contentType,
      size: data.size,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Upload failed: ' + err.message }, { status: 500 });
  }
}
