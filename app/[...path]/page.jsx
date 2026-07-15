export const runtime = 'edge';

import { headers } from 'next/headers';
import CatchAllClient from './client';

// Per-blog SEO: shared links pick up the blog's cover (if set) + title/author,
// otherwise a dynamic GitHub-style card from /api/og.
const httpImg = (u) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : '');

// `title.absolute` opts out of the root layout's "%s | LixBlogs" template. These
// titles already carry the brand, and without this they render double-branded:
// "Ankit Dey | LixBlogs Author Profile | LixBlogs".
function cardMeta({ title, description, url, og, ogType = 'website' }) {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: ogType, title, description, url, siteName: 'LixBlogs', images: [{ url: og, secureUrl: og, type: 'image/png', width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

// Search engines cut descriptions around 155-160 chars. Build from the most specific
// signal available and fall back to something that still describes the page, rather
// than "@handle on LixBlogs", which tells a reader nothing and wastes the snippet.
function describe(parts, max = 160) {
  const s = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  // Cut on a word boundary so the snippet doesn't end mid-word.
  return `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

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
    // Member+ authors/owners get unbranded share cards.
    const noBrand = (tier) => (tier && tier !== 'free' ? { brand: '0' } : {});

    // Blog card. /api/resolve already strips every author field from a secret blog,
    // so the byline, avatar and tier hint would fall away on their own — but assert
    // it explicitly here too. A share card is the one artifact that outlives the page,
    // and it must never carry the author of an anonymous post.
    const blogMeta = (b, url) => {
      const secret = !!b.secret;
      const title = b.title || 'Untitled';
      const primary = secret ? '' : (b.author_name || b.author_username || '');
      const coAuthors = secret
        ? []
        : (b.co_authors || []).map((c) => c.display_name || c.username).filter(Boolean);
      const authorList = [primary, ...coAuthors].filter(Boolean);
      const sub = authorList.length
        ? `by ${authorList.slice(0, 4).join(', ')}${authorList.length > 4 ? ` +${authorList.length - 4}` : ''}`
        : '';
      const description = (b.subtitle || '').slice(0, 200) || (primary ? `By ${primary} on LixBlogs` : 'On LixBlogs');
      const readTime = b.read_time_minutes ? `${b.read_time_minutes} min read` : '';
      const og = ogUrl({
        type: 'blog', title, subtitle: b.subtitle || '', sub, readTime,
        cover: httpImg(b.cover_image_r2_key),
        avatar: secret ? '' : httpImg(b.author_avatar),
        // author_tier is itself a weak author signal — never send it for a secret blog.
        ...(secret ? {} : noBrand(b.author_tier)),
      });
      return {
        title,
        description,
        alternates: { canonical: url },
        // Keep secret blogs out of search engines: an indexed anonymous post is a
        // permanent, crawlable artifact its author can never fully retract.
        ...(secret ? { robots: { index: false, follow: false } } : {}),
        openGraph: {
          type: 'article', title, description, url, siteName: 'LixBlogs',
          publishedTime: b.published_at ? new Date(b.published_at * 1000).toISOString() : undefined,
          authors: authorList.length ? authorList : undefined,
          images: [{ url: og, secureUrl: og, type: 'image/png', width: 1200, height: 630, alt: title }],
        },
        twitter: { card: 'summary_large_image', title, description, images: [og] },
      };
    };

    // ── 1-segment: user or org profile ──
    if (!slug) {
      const res = await fetch(`${origin}/api/resolve?name=${encodeURIComponent(name)}`, { headers: { 'user-agent': 'lixblogs-ssr' } });
      if (!res.ok) return {};
      const data = await res.json();
      const url = `${origin}/${name}`;

      if (data.type === 'user' && data.user) {
        const dn = data.user.display_name || data.user.username || name;
        const handle = `@${data.user.username || name}`;
        const posts = (data.blogs || []).length;
        const followers = data.user.followers || 0;
        // Lead with the bio when there is one, then add the facts a reader scanning
        // results actually wants: who this is, what they publish, how much of it.
        const stats = [
          posts ? plural(posts, 'published post', 'published posts') : '',
          followers ? plural(followers, 'follower', 'followers') : '',
        ].filter(Boolean).join(', ');
        const description = describe([
          data.user.bio,
          data.user.bio ? `Read ${dn} (${handle}) on LixBlogs.` : `${dn} (${handle}) writes and publishes on LixBlogs.`,
          stats ? `${stats}.` : '',
        ]);
        const og = ogUrl({ type: 'profile', kind: 'Author Profile', title: dn, sub: handle, subtitle: data.user.bio || '', avatar: httpImg(data.user.avatar_url), ...noBrand(data.user.tier) });
        return cardMeta({ title: `${dn} (${handle}), Author on LixBlogs`, description, url, og, ogType: 'profile' });
      }
      if (data.type === 'org' && data.org) {
        const dn = data.org.name || name;
        const handle = `@${data.org.slug || name}`;
        const ownerName = data.owner?.display_name || data.owner?.username || '';
        const members = (data.members || []).length;
        const posts = (data.blogs || []).length;
        const stats = [
          posts ? plural(posts, 'published post', 'published posts') : '',
          members ? plural(members, 'member', 'members') : '',
        ].filter(Boolean).join(', ');
        const description = describe([
          data.org.description || data.org.bio,
          `${dn} (${handle}) publishes on LixBlogs.`,
          ownerName ? `Run by ${ownerName}.` : '',
          stats ? `${stats}.` : '',
        ]);
        const og = ogUrl({ type: 'profile', kind: 'Organisation', title: dn, sub: ownerName ? `by ${ownerName}` : handle, subtitle: data.org.description || data.org.bio || '', avatar: httpImg(data.org.logo_url || data.org.logo_r2_key), ...noBrand(data.owner?.tier) });
        return cardMeta({ title: `${dn} (${handle}), Organisation on LixBlogs`, description, url, og, ogType: 'profile' });
      }
      // Short link /[slugid] — resolve falls back to a blog when the name matches no
      // namespace. This is the only path that serves a secret blog.
      if (data.type === 'blog' && data.blog) {
        return blogMeta(data.blog, url);
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
      const og = ogUrl({ type: 'profile', kind: 'Collection', title, sub: orgName, subtitle: data.collection.description || '', avatar: httpImg(data.owner?.logo_url || data.owner?.logo_r2_key) });
      return cardMeta({ title: `${title} — ${orgName} on LixBlogs`, description, url, og, ogType: 'website' });
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

    // Normal blog → mark + title + author list (small). Secret blogs never reach
    // here — resolve 404s them on author-namespaced paths — but blogMeta is
    // secret-safe regardless.
    return blogMeta(b, url);
  } catch {
    return {};
  }
}

export default function CatchAllHandle({ params }) {
  return <CatchAllClient params={params} />;
}
