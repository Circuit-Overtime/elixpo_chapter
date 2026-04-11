export const runtime = 'edge';
import { NextResponse } from 'next/server';

// Simple meta tag extractor — no DOM parser needed on edge
function extractMeta(html, property) {
  // Match <meta property="og:..." content="..."> or <meta name="..." content="...">
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return '';
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : '';
}

function extractFavicon(html, origin) {
  // Look for <link rel="icon" href="..."> or <link rel="shortcut icon" href="...">
  const m = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
  if (m) {
    const href = m[1];
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return origin + href;
    return origin + '/' + href;
  }
  // Fallback to Google's favicon service
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=32`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(parsed.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LixBlogs-LinkPreview/1.0',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({
        title: parsed.hostname,
        description: '',
        image: '',
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=32`,
        domain: parsed.hostname,
      }, {
        headers: { 'Cache-Control': 'public, max-age=3600' },
      });
    }

    // Only read first 50KB to avoid downloading huge pages
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let bytesRead = 0;
    const maxBytes = 50000;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }
    reader.cancel();

    const origin = parsed.origin;
    const ogTitle = extractMeta(html, 'og:title');
    const ogDesc = extractMeta(html, 'og:description') || extractMeta(html, 'description');
    const ogImage = extractMeta(html, 'og:image');
    const title = ogTitle || extractTitle(html) || parsed.hostname;
    const favicon = extractFavicon(html, origin);

    // Resolve relative og:image
    let image = ogImage;
    if (image && !image.startsWith('http')) {
      if (image.startsWith('//')) image = 'https:' + image;
      else if (image.startsWith('/')) image = origin + image;
      else image = origin + '/' + image;
    }

    return NextResponse.json({
      title,
      description: ogDesc || '',
      image: image || '',
      favicon,
      domain: parsed.hostname,
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    // On timeout or fetch error, return minimal data
    return NextResponse.json({
      title: parsed.hostname,
      description: '',
      image: '',
      favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=32`,
      domain: parsed.hostname,
    }, {
      headers: { 'Cache-Control': 'public, max-age=600' },
    });
  }
}
