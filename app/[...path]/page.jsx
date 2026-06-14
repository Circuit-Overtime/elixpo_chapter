export const runtime = 'edge';

import { headers } from 'next/headers';
import CatchAllClient from './client';

// Per-blog SEO: shared links pick up the blog's cover (if set) + title/author,
// otherwise a dynamic GitHub-style card from /api/og.
const httpImg = (u) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : '');

function cardMeta({ title, description, url, og, ogType = 'website' }) {
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: ogType, title, description, url, siteName: 'LixBlogs', images: [{ url: og, secureUrl: og, type: 'image/png', width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

export async function generateMetadata({ params, searchParams }) {
  const { path } = await params;
  const sp = searchParams ? await searchParams : {};
  const name = (path?.[0] || '').toLowerCase();
  const len = path?.length || 0;
  const slug = len === 2 ? (path[1] || '').toLowerCase() : len === 3 ? (path[2] || '').toLowerCase() : '';
  const collection = len === 3 ? (path[1] || '').toLowerCase() : '';
  const isInvite = !!(sp.invite);

  if (!name) return {};

  try {
    const h = await headers();
    const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
    const ogUrl = (p) => `${origin}/api/og?${new URLSearchParams(p)}`;

    // ── 1-segment: user or org profile ──
    if (!slug) {
      const res = await fetch(`${origin}/api/resolve?name=${encodeURIComponent(name)}`, { headers: { 'user-agent': 'lixblogs-ssr' } });
      if (!res.ok) return {};
      const data = await res.json();
      const url = `${origin}/${name}`;

      if (data.type === 'user' && data.user) {
        const dn = data.user.display_name || data.user.username || name;
        const handle = `@${data.user.username || name}`;
        const description = (data.user.bio || `${handle} on LixBlogs`).slice(0, 200);
        const og = ogUrl({ type: 'profile', kind: 'Profile', title: dn, sub: handle, avatar: httpImg(data.user.avatar_url) });
        return cardMeta({ title: dn, description, url, og, ogType: 'profile' });
      }
      if (data.type === 'org' && data.org) {
        const dn = data.org.name || name;
        const ownerName = data.owner?.display_name || data.owner?.username || '';
        const description = (data.org.description || data.org.bio || `${dn} on LixBlogs`).slice(0, 200);
        const og = ogUrl({ type: 'profile', kind: 'Organization', title: dn, sub: ownerName ? `by ${ownerName}` : `@${data.org.slug || name}`, avatar: httpImg(data.org.logo_url || data.org.logo_r2_key) });
        return cardMeta({ title: dn, description, url, og, ogType: 'profile' });
      }
      return {};
    }

    // ── 2/3-segment: blog, collection, or a blog invite link ──
    const qs = new URLSearchParams({ name, slug });
    if (collection) qs.set('collection', collection);
    const res = await fetch(`${origin}/api/resolve?${qs}`, { headers: { 'user-agent': 'lixblogs-ssr' } });
    if (!res.ok) return {};
    const data = await res.json();
    const url = `${origin}/${path.join('/')}`;

    // Collection → org-branded card (org avatar + collection name + org name).
    if (data.type === 'collection' && data.collection) {
      const orgName = data.owner?.name || name;
      const title = data.collection.name || 'Collection';
      const description = (data.collection.description || `A collection by ${orgName} on LixBlogs`).slice(0, 200);
      const og = ogUrl({ type: 'profile', kind: 'Collection', title, sub: orgName, avatar: httpImg(data.owner?.logo_url || data.owner?.logo_r2_key) });
      return cardMeta({ title, description, url, og, ogType: 'website' });
    }

    if (data.type !== 'blog' || !data.blog) return {};
    const b = data.blog;

    // Blog invite link (?invite=) → show who's inviting (org or author).
    if (isInvite) {
      const ownerIsOrg = data.owner?.type === 'org';
      const inviterName = ownerIsOrg ? (data.owner.name || '') : (data.owner?.display_name || data.owner?.username || b.author_name || '');
      const avatar = httpImg(ownerIsOrg ? (data.owner.logo_url || data.owner.logo_r2_key) : (data.owner?.avatar_url || b.author_avatar));
      const title = inviterName || 'LixBlogs';
      const description = `You're invited to collaborate on "${b.title || 'a post'}".`;
      const og = ogUrl({ type: 'profile', kind: 'Invitation to collaborate', title, sub: `on "${(b.title || 'a post').slice(0, 50)}"`, avatar });
      return cardMeta({ title: `Invitation · ${title}`, description, url, og, ogType: 'website' });
    }

    // Normal blog → mark + title + author list (small).
    const title = b.title || 'Untitled';
    const primary = b.author_name || b.author_username || '';
    const coAuthors = (b.co_authors || []).map((c) => c.display_name || c.username).filter(Boolean);
    const authorList = [primary, ...coAuthors].filter(Boolean);
    const sub = authorList.length ? `by ${authorList.slice(0, 4).join(', ')}${authorList.length > 4 ? ` +${authorList.length - 4}` : ''}` : '';
    const description = (b.subtitle || '').slice(0, 200) || (primary ? `By ${primary} on LixBlogs` : 'On LixBlogs');
    const og = ogUrl({ type: 'blog', title, subtitle: b.subtitle || '', sub, avatar: httpImg(b.author_avatar) });

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'article', title, description, url, siteName: 'LixBlogs',
        publishedTime: b.published_at ? new Date(b.published_at * 1000).toISOString() : undefined,
        authors: authorList.length ? authorList : undefined,
        images: [{ url: og, secureUrl: og, type: 'image/png', width: 1200, height: 630, alt: title }],
      },
      twitter: { card: 'summary_large_image', title, description, images: [og] },
    };
  } catch {
    return {};
  }
}

export default function CatchAllHandle({ params }) {
  return <CatchAllClient params={params} />;
}
