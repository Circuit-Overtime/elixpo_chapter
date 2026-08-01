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
      const readTime = b.read_time_minutes ? `${b.read_time_minutes} min read` : '';
      // Prefer the author's own subtitle, then the generated excerpt, and only then
      // a synthesised line. Append the facts that help a reader decide to click:
      // who wrote it, how long it takes, what it covers.
      const byline = secret ? 'Published anonymously on LixBlogs.' : (primary ? `By ${primary} on LixBlogs.` : 'Published on LixBlogs.');
      const tagLine = (b.tags || []).length ? `Topics: ${b.tags.slice(0, 4).join(', ')}.` : '';
      const description = describe([
        b.subtitle || b.excerpt || '',
        byline,
        readTime ? `${readTime}.` : '',
        tagLine,
      ]);
      const og = ogUrl({
        type: 'blog', title, subtitle: b.subtitle || '', sub, readTime,
        cover: httpImg(b.cover_image_r2_key),
        seed: b.id || b.slugid || b.slug || title,
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
        ...((secret || b.status !== 'published') ? { robots: { index: false, follow: false } } : {}),
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
      const posts = (data.blogs || []).length;
      const description = describe([
        data.collection.description,
        `${title} is a collection of posts by ${orgName} on LixBlogs.`,
        posts ? `${plural(posts, 'post', 'posts')} in this series.` : '',
      ]);
      const og = ogUrl({ type: 'profile', kind: 'Collection', title, sub: orgName, subtitle: data.collection.description || '', avatar: httpImg(data.owner?.logo_url || data.owner?.logo_r2_key) });
      return cardMeta({ title: `${title}, a collection by ${orgName} on LixBlogs`, description, url, og, ogType: 'website' });
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
      return {
        ...cardMeta({ title: `Invitation · ${title}`, description, url, og, ogType: 'website' }),
        robots: { index: false, follow: false },
      };
    }

    // Normal blog → mark + title + author list (small). Secret blogs never reach
    // here — resolve 404s them on author-namespaced paths — but blogMeta is
    // secret-safe regardless.
    return blogMeta(b, url);
  } catch {
    return {};
  }
}

// Structured data for rich results. Emitted server-side so crawlers get it without
// running JS. This re-fetches /api/resolve, but with identical URL + options to
// generateMetadata, so Next's per-request fetch memoization serves both from one call.
//
// Secret posts get NO structured data at all. They're already noindex, and JSON-LD
// exists to describe authorship — exactly what an anonymous post must never publish.
async function buildJsonLd(path, origin) {
  const name = (path?.[0] || '').toLowerCase();
  const len = path?.length || 0;
  if (!name) return null;
  const slug = len === 2 ? (path[1] || '').toLowerCase() : len === 3 ? (path[2] || '').toLowerCase() : '';
  const collection = len === 3 ? (path[1] || '').toLowerCase() : '';

  const img = (u) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : undefined);
  const crumb = (items) => ({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
    })),
  });

  try {
    const qs = new URLSearchParams({ name });
    if (slug) qs.set('slug', slug);
    if (collection) qs.set('collection', collection);
    const res = await fetch(`${origin}/api/resolve?${qs}`, { headers: { 'user-agent': 'lixblogs-ssr' } });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.type === 'user' && data.user) {
      const u = data.user;
      const dn = u.display_name || u.username || name;
      const url = `${origin}/${name}`;
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ProfilePage',
            '@id': `${url}#profile`,
            url,
            name: `${dn} on LixBlogs`,
            mainEntity: { '@id': `${url}#person` },
            isPartOf: { '@id': `${origin}/#website` },
          },
          {
            '@type': 'Person',
            '@id': `${url}#person`,
            name: dn,
            alternateName: u.username ? `@${u.username}` : undefined,
            description: u.bio || undefined,
            image: img(u.avatar_url),
            url,
            sameAs: u.website ? [u.website] : undefined,
          },
        ],
      };
    }

    if (data.type === 'org' && data.org) {
      const o = data.org;
      const url = `${origin}/${name}`;
      return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${url}#org`,
        name: o.name || name,
        alternateName: o.slug ? `@${o.slug}` : undefined,
        description: o.description || o.bio || undefined,
        logo: img(o.logo_url || o.logo_r2_key),
        url,
        sameAs: o.website ? [o.website] : undefined,
      };
    }

    if (data.type === 'blog' && data.blog) {
      const b = data.blog;
      if (b.secret) return null; // never describe the authorship of an anonymous post
      const url = `${origin}/${path.join('/')}`;
      const authors = [
        b.author_name || b.author_username,
        ...(b.co_authors || []).map((c) => c.display_name || c.username),
      ].filter(Boolean);
      const orgOwner = data.owner?.type === 'org' ? data.owner : null;
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting',
            '@id': `${url}#post`,
            headline: (b.title || 'Untitled').slice(0, 110), // schema.org caps headline at 110
            description: b.subtitle || b.excerpt || undefined,
            image: img(b.cover_image_r2_key),
            datePublished: b.published_at ? new Date(b.published_at * 1000).toISOString() : undefined,
            dateModified: b.updated_at ? new Date(b.updated_at * 1000).toISOString() : undefined,
            author: authors.map((n) => ({ '@type': 'Person', name: n })),
            publisher: orgOwner
              ? { '@type': 'Organization', name: orgOwner.name, logo: img(orgOwner.logo_url || orgOwner.logo_r2_key) }
              : { '@id': `${origin}/#organization` },
            keywords: (b.tags || []).length ? b.tags.join(', ') : undefined,
            timeRequired: b.read_time_minutes ? `PT${b.read_time_minutes}M` : undefined,
            inLanguage: 'en',
            mainEntityOfPage: { '@type': 'WebPage', '@id': url },
            isPartOf: { '@id': `${origin}/#website` },
          },
          crumb([
            { name: 'LixBlogs', url: origin },
            { name: data.owner?.name || b.author_name || name, url: `${origin}/${name}` },
            { name: b.title || 'Post', url },
          ]),
        ],
      };
    }

    if (data.type === 'collection' && data.collection) {
      const url = `${origin}/${path.join('/')}`;
      return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${url}#collection`,
        url,
        name: data.collection.name || 'Collection',
        description: data.collection.description || undefined,
        isPartOf: { '@id': `${origin}/#website` },
      };
    }
    return null;
  } catch {
    return null; // structured data is an enhancement; never break the page for it
  }
}

export default async function CatchAllHandle({ params }) {
  const { path } = await params;
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
  const rawName = path?.[0] || '';
  const slug = path?.length === 2 ? (path[1] || '').toLowerCase() : path?.length === 3 ? (path[2] || '').toLowerCase() : '';
  const collection = path?.length === 3 ? (path[1] || '').toLowerCase() : '';
  const qs = new URLSearchParams({ name: rawName });
  if (slug) qs.set('slug', slug);
  if (collection) qs.set('collection', collection);
  const [jsonLd, initialData] = await Promise.all([
    buildJsonLd(path, origin),
    fetch(`${origin}/api/resolve?${qs}`, { headers: { 'user-agent': 'lixblogs-ssr' } })
      .then((response) => response.ok ? response.json() : null)
      .catch(() => null),
  ]);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CatchAllClient params={params} initialData={initialData} />
    </>
  );
}
