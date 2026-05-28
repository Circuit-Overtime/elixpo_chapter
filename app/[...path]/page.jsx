export const runtime = 'edge';

import { headers } from 'next/headers';
import CatchAllClient from './client';

// Per-blog SEO: shared links pick up the blog's cover (if set) + title/author,
// otherwise a dynamic GitHub-style card from /api/og.
export async function generateMetadata({ params }) {
  const { path } = await params;
  const name = (path?.[0] || '').toLowerCase();
  const len = path?.length || 0;
  const slug = len === 2 ? (path[1] || '').toLowerCase() : len === 3 ? (path[2] || '').toLowerCase() : '';
  const collection = len === 3 ? (path[1] || '').toLowerCase() : '';

  // Only blogs (2- or 3-segment paths) get rich cards; profiles fall back to defaults.
  if (!name || !slug) return {};

  try {
    const h = await headers();
    const host = h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    const qs = new URLSearchParams({ name, slug });
    if (collection) qs.set('collection', collection);

    const res = await fetch(`${origin}/api/resolve?${qs}`, { headers: { 'user-agent': 'lixblogs-ssr' } });
    if (!res.ok) return {};
    const data = await res.json();
    if (data.type !== 'blog' || !data.blog) return {};

    const b = data.blog;
    const title = b.title || 'Untitled';
    const authorName = b.author_name || b.author_username || '';
    const description = (b.subtitle || '').slice(0, 200) || `By ${authorName} on LixBlogs`;
    const url = `${origin}/${path.join('/')}`;

    const ogImage = b.cover_image_r2_key
      || `${origin}/api/og?${new URLSearchParams({ title, author: authorName, emoji: b.page_emoji || '' })}`;

    return {
      title,
      description,
      openGraph: {
        type: 'article',
        title,
        description,
        url,
        siteName: 'LixBlogs',
        publishedTime: b.published_at ? new Date(b.published_at * 1000).toISOString() : undefined,
        authors: authorName ? [authorName] : undefined,
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {};
  }
}

export default function CatchAllHandle({ params }) {
  return <CatchAllClient params={params} />;
}
