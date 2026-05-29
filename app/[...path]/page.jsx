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

  if (!name) return {};

  // Profile cards (1-segment paths) — a user or org gets an avatar + name + bio card.
  if (!slug) {
    try {
      const h = await headers();
      const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
      const httpImg = (u) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : '');
      const res = await fetch(`${origin}/api/resolve?name=${encodeURIComponent(name)}`, { headers: { 'user-agent': 'lixblogs-ssr' } });
      if (!res.ok) return {};
      const data = await res.json();
      const url = `${origin}/${name}`;
      let dn, description, avatar, handle;
      if (data.type === 'user' && data.user) {
        dn = data.user.display_name || data.user.username || name;
        description = (data.user.bio || `@${data.user.username || name} on LixBlogs`).slice(0, 200);
        avatar = httpImg(data.user.avatar_url);
        handle = `@${data.user.username || name}`;
      } else if (data.type === 'org' && data.org) {
        dn = data.org.name || name;
        description = (data.org.description || data.org.bio || `${dn} on LixBlogs`).slice(0, 200);
        avatar = httpImg(data.org.logo_url || data.org.logo_r2_key);
        handle = `@${data.org.slug || name}`;
      } else {
        return {};
      }
      const og = `${origin}/api/og?${new URLSearchParams({ title: dn, subtitle: description, author: handle, avatar })}`;
      return {
        title: dn,
        description,
        alternates: { canonical: url },
        openGraph: { type: 'profile', title: dn, description, url, siteName: 'LixBlogs', images: [{ url: og, secureUrl: og, type: 'image/png', width: 1200, height: 630, alt: dn }] },
        twitter: { card: 'summary_large_image', title: dn, description, images: [og] },
      };
    } catch {
      return {};
    }
  }

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

    // Always render the composed card (banner + author avatar + title + tagline)
    // so every platform (WhatsApp, Twitter, Slack) shows the same generic preview.
    // Only forward http(s) media — a data:/blob: cover would bloat the URL and break crawlers.
    const httpOnly = (u) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : '');
    const ogImage = `${origin}/api/og?${new URLSearchParams({
      title,
      subtitle: b.subtitle || '',
      author: authorName,
      avatar: httpOnly(b.author_avatar),
      cover: httpOnly(b.cover_image_r2_key),
      emoji: b.page_emoji || '',
    })}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'article',
        title,
        description,
        url,
        siteName: 'LixBlogs',
        publishedTime: b.published_at ? new Date(b.published_at * 1000).toISOString() : undefined,
        authors: authorName ? [authorName] : undefined,
        images: [{ url: ogImage, secureUrl: ogImage, type: 'image/png', width: 1200, height: 630, alt: title }],
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
