'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '../components/AppShell';
import { generateBlogBanner } from '../utils/pixelAvatar';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'blogs', label: 'Blogs' },
  { id: 'people', label: 'People' },
  { id: 'orgs', label: 'Organizations' },
];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Avatar({ src, name, size = 40, rounded = 'rounded-full' }) {
  if (src) {
    return <img src={src} alt="" className={`${rounded} object-cover flex-shrink-0`} style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={`${rounded} flex items-center justify-center font-bold flex-shrink-0`}
      style={{ width: size, height: size, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: size * 0.4 }}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function SectionHeading({ children, count }) {
  return (
    <h2 className="text-[13px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-faint)' }}>
      {children}
      {count > 0 && <span className="font-normal normal-case tracking-normal">({count})</span>}
    </h2>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = (searchParams.get('q') || '').trim();
  const tab = searchParams.get('tab') || 'all';

  const [input, setInput] = useState(q);
  const [results, setResults] = useState({ blogs: [], users: [], orgs: [] });
  const [loading, setLoading] = useState(!!q);

  // Keep the box in sync when the URL changes underneath us (back/forward, or a
  // link into /search?q=…).
  useEffect(() => { setInput(q); }, [q]);

  const runSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setResults({ blogs: [], users: [], orgs: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const enc = encodeURIComponent(query);
    try {
      const [blogs, users, orgs] = await Promise.all([
        fetch(`/api/search/blogs?q=${enc}&limit=20&fields=slugid,slug,title,author,tags,likes,comments`).then(r => r.json()).catch(() => ({ blogs: [] })),
        fetch(`/api/search/users?q=${enc}&limit=20&fields=id,username,display_name,avatar_url,bio,followers,blogs`).then(r => r.json()).catch(() => ({ users: [] })),
        fetch(`/api/search/orgs?q=${enc}&limit=20&fields=id,slug,name,logo_url,description,members,blogs`).then(r => r.json()).catch(() => ({ orgs: [] })),
      ]);
      setResults({ blogs: blogs.blogs || [], users: users.users || [], orgs: orgs.orgs || [] });
    } catch {
      setResults({ blogs: [], users: [], orgs: [] });
    }
    setLoading(false);
  }, []);

  useEffect(() => { runSearch(q); }, [q, runSearch]);

  // The URL is the source of truth: submitting pushes a new query so results stay
  // linkable and the back button walks the search history.
  const submit = (e) => {
    e?.preventDefault();
    const next = input.trim();
    if (!next) return;
    router.push(`/search?q=${encodeURIComponent(next)}${tab !== 'all' ? `&tab=${tab}` : ''}`);
  };

  const setTab = (id) => {
    router.push(`/search?q=${encodeURIComponent(q)}${id !== 'all' ? `&tab=${id}` : ''}`);
  };

  const showBlogs = tab === 'all' || tab === 'blogs';
  const showPeople = tab === 'all' || tab === 'people';
  const showOrgs = tab === 'all' || tab === 'orgs';
  const totalCount = results.blogs.length + results.users.length + results.orgs.length;
  const nothing = !loading && q.length >= 2 && totalCount === 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Search box */}
        <form onSubmit={submit} className="mb-6">
          <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <ion-icon name="search-outline" style={{ fontSize: '18px', color: 'var(--text-faint)' }} />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Search blogs, people, topics..."
              autoFocus={!q}
              className="flex-1 bg-transparent outline-none text-[15px]"
              style={{ color: 'var(--text-primary)' }}
            />
            {input && (
              <button type="button" onClick={() => setInput('')} className="flex items-center justify-center w-6 h-6 rounded-full" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}>
                <ion-icon name="close" style={{ fontSize: '14px' }} />
              </button>
            )}
          </div>
        </form>

        {!q ? (
          <p className="text-center py-16 text-[14px]" style={{ color: 'var(--text-faint)' }}>
            Type something and press Enter to search.
          </p>
        ) : (
          <>
            <p className="text-[13px] mb-5" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Searching' : `${totalCount} result${totalCount === 1 ? '' : 's'}`} for{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>“{q}”</span>
            </p>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-7 border-b" style={{ borderColor: 'var(--border-default)' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="px-3 py-2 text-[13px] font-medium transition-colors"
                  style={{
                    color: tab === t.id ? 'var(--text-primary)' : 'var(--text-faint)',
                    borderBottom: `2px solid ${tab === t.id ? '#9b7bf7' : 'transparent'}`,
                    marginBottom: '-1px',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />)}
              </div>
            ) : nothing ? (
              <div className="text-center py-16">
                <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No results for “{q}”</p>
                <p className="text-[13px]" style={{ color: 'var(--text-faint)' }}>Try a different spelling or a broader term.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Blogs */}
                {showBlogs && results.blogs.length > 0 && (
                  <section>
                    <SectionHeading count={results.blogs.length}>Blogs</SectionHeading>
                    <div className="space-y-1">
                      {results.blogs.map(b => (
                        <Link
                          key={b.slugid}
                          href={`/${b.author_username || 'blog'}/${b.slug}`}
                          className="flex gap-4 p-3 -mx-3 rounded-xl transition-colors hover:bg-[var(--bg-surface)]"
                        >
                          <img
                            src={b.cover_image_r2_key || generateBlogBanner(b.slugid || b.slug)}
                            alt=""
                            className="w-24 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                              {b.page_emoji ? `${b.page_emoji} ` : ''}{b.title}
                            </p>
                            {b.subtitle && (
                              <p className="text-[13px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{b.subtitle}</p>
                            )}
                            <p className="text-[11px] mt-1.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-faint)' }}>
                              {b.author_name || b.author_username ? <span>{b.author_name || b.author_username}</span> : null}
                              {b.published_at ? <><span>·</span><span>{timeAgo(b.published_at)}</span></> : null}
                              {b.read_time_minutes ? <><span>·</span><span>{b.read_time_minutes} min read</span></> : null}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* People */}
                {showPeople && results.users.length > 0 && (
                  <section>
                    <SectionHeading count={results.users.length}>People</SectionHeading>
                    <div className="space-y-1">
                      {results.users.map(u => (
                        <Link
                          key={u.id}
                          href={`/${u.username}`}
                          className="flex items-center gap-3 p-3 -mx-3 rounded-xl transition-colors hover:bg-[var(--bg-surface)]"
                        >
                          <Avatar src={u.avatar_url} name={u.display_name || u.username} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.display_name || u.username}</p>
                            <p className="text-[12px] truncate" style={{ color: 'var(--text-faint)' }}>
                              @{u.username}
                              {typeof u.followers === 'number' ? ` · ${u.followers} follower${u.followers === 1 ? '' : 's'}` : ''}
                            </p>
                            {u.bio && <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{u.bio}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Organizations */}
                {showOrgs && results.orgs.length > 0 && (
                  <section>
                    <SectionHeading count={results.orgs.length}>Organizations</SectionHeading>
                    <div className="space-y-1">
                      {results.orgs.map(o => (
                        <Link
                          key={o.id}
                          href={`/${o.slug}`}
                          className="flex items-center gap-3 p-3 -mx-3 rounded-xl transition-colors hover:bg-[var(--bg-surface)]"
                        >
                          <Avatar src={o.logo_url} name={o.name || o.slug} rounded="rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{o.name || o.slug}</p>
                            <p className="text-[12px] truncate" style={{ color: 'var(--text-faint)' }}>
                              @{o.slug}
                              {typeof o.member_count === 'number' ? ` · ${o.member_count} member${o.member_count === 1 ? '' : 's'}` : ''}
                            </p>
                            {(o.description || o.bio) && (
                              <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{o.description || o.bio}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Tab-scoped empty states */}
                {showBlogs && tab === 'blogs' && results.blogs.length === 0 && (
                  <p className="text-center py-12 text-[13px]" style={{ color: 'var(--text-faint)' }}>No blogs match “{q}”.</p>
                )}
                {showPeople && tab === 'people' && results.users.length === 0 && (
                  <p className="text-center py-12 text-[13px]" style={{ color: 'var(--text-faint)' }}>No people match “{q}”.</p>
                )}
                {showOrgs && tab === 'orgs' && results.orgs.length === 0 && (
                  <p className="text-center py-12 text-[13px]" style={{ color: 'var(--text-faint)' }}>No organizations match “{q}”.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
