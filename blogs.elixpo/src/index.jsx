'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateBlogBanner } from './utils/pixelAvatar';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], orgs: [], blogs: [] });
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch suggestions on empty/short query, search results on longer query
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ users: [], orgs: [], blogs: [] });
      if (query.length === 0) {
        fetch('/api/search/suggestions').then(r => r.json()).then(d => setSuggestions(d.suggestions || [])).catch(() => {});
      }
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(query)}&scope=all`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => ({ suggestions: [] })),
      ]).then(([searchData, sugData]) => {
        setResults({ users: searchData.users || [], orgs: searchData.orgs || [], blogs: searchData.blogs || [] });
        setSuggestions(sugData.suggestions || []);
        setLoading(false);
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (type, item) => {
    setOpen(false);
    setQuery('');
    // Record search
    fetch('/api/search/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }).catch(() => {});
    if (type === 'user') router.push(`/${item.username}`);
    else if (type === 'org') router.push(`/${item.slug}`);
    else if (type === 'blog') router.push(`/${item.author_username || 'blog'}/${item.slug}`);
    else if (type === 'suggestion') { setQuery(item.query); setOpen(true); }
  };

  const hasResults = results.users.length > 0 || results.orgs.length > 0 || results.blogs.length > 0;

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <ion-icon name="search-outline" style={{ fontSize: '16px', color: 'var(--text-faint)' }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search blogs, people, topics..."
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ color: 'var(--text-primary)' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="flex items-center justify-center w-6 h-6 rounded-full transition-colors" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}>
            <ion-icon name="close" style={{ fontSize: '14px' }} />
          </button>
        )}
        <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)', border: '1px solid var(--border-default)' }}>
          /
        </kbd>
      </div>

      {open && (hasResults || suggestions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto" style={{ backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)' }}>

          {/* Suggestions */}
          {!hasResults && suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect('suggestion', s)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg transition-colors text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ion-icon name={s.type === 'recent' ? 'time-outline' : 'pricetag-outline'} style={{ fontSize: '14px', color: 'var(--text-faint)' }} />
                  {s.query}
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--text-faint)' }}>{s.type === 'recent' ? 'Recent' : 'Topic'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Blog results */}
          {results.blogs.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Blogs</p>
              {results.blogs.map(b => (
                <button key={b.slugid || b.id} onClick={() => handleSelect('blog', b)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <ion-icon name="document-text-outline" style={{ fontSize: '16px', color: 'var(--text-faint)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{b.title || 'Untitled'}</p>
                    {b.author_name && <p className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>by {b.author_name}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* User results */}
          {results.users.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>People</p>
              {results.users.map(u => (
                <button key={u.id} onClick={() => handleSelect('user', u)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" /> :
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>{(u.display_name || u.username || '?')[0].toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.display_name || u.username}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Org results */}
          {results.orgs.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Organizations</p>
              {results.orgs.map(o => (
                <button key={o.id} onClick={() => handleSelect('org', o)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <ion-icon name="people-outline" style={{ fontSize: '16px', color: 'var(--text-faint)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{o.name}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>@{o.slug}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && !hasResults && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-faint)' }}>Searching...</div>
          )}

          {!loading && query.length >= 2 && !hasResults && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-faint)' }}>No results for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedCard({ post }) {
  const author = post.author || {};
  return (
    <article
      className="group rounded-xl p-5 mb-3 transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Link href={`/${author.username || 'unknown'}/${post.slug}`} className="block cursor-pointer">
        <div className="flex items-center gap-2 mb-3">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-[var(--border-default)]" />
          ) : (
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>
              {(author.display_name || author.username || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-[13px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            {post.is_staff && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: '#9b7bf718', color: '#9b7bf7', border: '1px solid #9b7bf730' }}>Staff</span>
            )}
            {post.org && (
              <><span style={{ color: 'var(--text-secondary)' }}>in {post.org.name}</span><span className="mx-0.5" style={{ color: 'var(--text-faint)' }}>&middot;</span></>
            )}
            <span style={{ color: 'var(--text-secondary)' }}>{author.display_name || author.username}</span>
            {post.co_author_count > 0 && (
              <span style={{ color: 'var(--text-faint)' }}>+ {post.co_author_count} {post.co_author_count === 1 ? 'other' : 'others'}</span>
            )}
          </span>
          <span className="ml-auto text-[11px]" style={{ color: 'var(--text-faint)' }}>{timeAgo(post.published_at)}</span>
        </div>
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold leading-[1.3] mb-1 group-hover:opacity-75 transition-opacity font-serif tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
              {post.page_emoji && <span className="mr-1.5">{post.page_emoji}</span>}
              {post.title || 'Untitled'}
            </h2>
            {post.subtitle && (
              <p className="text-[14px] leading-[1.55] line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>
                {post.subtitle}
              </p>
            )}
            <div className="flex items-center gap-3 text-[12px] flex-wrap" style={{ color: 'var(--text-faint)' }}>
              {(post.tags || []).slice(0, 2).map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>{tag}</span>
              ))}
              {post.read_time_minutes > 0 && <span>{post.read_time_minutes} min read</span>}
              {post.like_count > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {post.like_count}
                </span>
              )}
              {post.comment_count > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {post.comment_count}
                </span>
              )}
            </div>
          </div>
          <div className="w-[100px] h-[100px] rounded-xl flex-shrink-0 hidden sm:block overflow-hidden self-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <img
              src={post.cover_image_r2_key || generateBlogBanner(post.id || post.slug)}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      </Link>
      {post.can_edit && (
        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--divider)' }}>
          <Link
            href={`/edit/${post.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{ color: 'var(--text-faint)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            onClick={e => e.stopPropagation()}
          >
            <ion-icon name="create-outline" style={{ fontSize: '13px' }} />
            Edit
          </Link>
          <Link
            href={`/edit/${post.id}?panel=settings`}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: 'var(--text-faint)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            onClick={e => e.stopPropagation()}
            title="Blog settings"
          >
            <ion-icon name="settings-outline" style={{ fontSize: '14px' }} />
          </Link>
        </div>
      )}
    </article>
  );
}

function TopPickCard({ post, index }) {
  const author = post.author || {};
  const gradients = [
    'linear-gradient(135deg, rgba(155,123,247,0.1) 0%, rgba(96,165,250,0.06) 100%)',
    'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(74,222,128,0.06) 100%)',
    'linear-gradient(135deg, rgba(244,114,182,0.1) 0%, rgba(155,123,247,0.06) 100%)',
  ];
  const accents = ['#9b7bf7', '#60a5fa', '#f472b6'];
  return (
    <Link href={`/${author.username || 'unknown'}/${post.slug}`}>
      <div
        className="p-3.5 rounded-xl cursor-pointer group mb-2.5 transition-all duration-200 hover:scale-[1.02]"
        style={{
          background: gradients[index % 3],
          border: `1px solid color-mix(in srgb, ${accents[index % 3]} 15%, transparent)`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10" />
          ) : (
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>
              {(author.display_name || author.username || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {author.display_name || author.username}
          </span>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--text-faint)' }}>{timeAgo(post.published_at)}</span>
        </div>
        <h3 className="text-[13.5px] font-bold leading-[1.35] group-hover:opacity-80 transition-opacity font-serif" style={{ color: 'var(--text-primary)' }}>
          {post.page_emoji && <span className="mr-1">{post.page_emoji}</span>}
          {post.title || 'Untitled'}
        </h3>
        {post.read_time_minutes > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="h-[3px] flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, post.read_time_minutes * 20)}%`, backgroundColor: accents[index % 3], opacity: 0.5 }} />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{post.read_time_minutes} min</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-6 py-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse" style={{ borderBottom: '1px solid var(--divider)', paddingBottom: '24px' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            <div className="h-3 w-32 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="h-5 w-3/4 rounded mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              <div className="h-4 w-full rounded mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              <div className="h-3 w-1/3 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            </div>
            <div className="w-[120px] h-[80px] rounded-md hidden sm:block" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const FIXED_TAGS = ['Tech', 'Finance', 'Sports', 'Entertainment'];

export default function App() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [topPicks, setTopPicks] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [userInterests, setUserInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState(0);

  // Build topic tabs
  const fixedTabs = [
    { label: 'For You', icon: 'sparkles', filter: null },
    { label: 'Following', icon: null, filter: 'following' },
  ];
  const tagTabs = FIXED_TAGS.map(tag => ({ label: tag, icon: null, tag }));
  const topics = [...fixedTabs, ...tagTabs];

  // Fetch feed
  useEffect(() => {
    const topic = topics[activeTopic];
    if (!topic) return;

    setLoading(true);
    let url = '/api/feed?limit=20';
    if (topic.filter === 'following') url += '&filter=following';
    else if (topic.tag) url += `&tag=${encodeURIComponent(topic.tag)}`;

    fetch(url)
      .then(r => r.json())
      .then(data => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [activeTopic, user]);

  // Fetch sidebar data once
  useEffect(() => {
    fetch('/api/feed/trending?limit=3').then(r => r.json()).then(d => setTopPicks(d.posts || [])).catch(() => {});
    fetch('/api/tags/popular?limit=12').then(r => r.json()).then(d => setPopularTags((d.tags || []).map(t => t.tag))).catch(() => {});
    if (user) {
      fetch('/api/users/me/interests').then(r => r.json()).then(d => setUserInterests(d.interests || [])).catch(() => {});
    }
  }, [user]);

  return (
    <AppShell>
      <div className="flex">
        {/* Center Feed */}
        <div className="flex-1 min-w-0" style={{ borderRight: '1px solid var(--divider)' }}>
          {/* Search + Topic Tabs — sticky header */}
          <div className="sticky top-14 z-40 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-app) 92%, transparent)', borderBottom: '1px solid var(--divider)' }}>
            {/* Search bar */}
            <div className="px-6 pt-3 pb-2">
              <SearchBar />
            </div>
            {/* Topic tabs */}
            <div className="flex items-center gap-0 px-6 overflow-x-auto scrollbar-none">
              {topics.map((topic, i) => (
                <button
                  key={topic.label}
                  onClick={() => setActiveTopic(i)}
                  className="flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0"
                  style={{
                    color: i === activeTopic ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderBottomColor: i === activeTopic ? 'var(--text-primary)' : 'transparent',
                  }}
                >
                  {topic.icon && <ion-icon name={topic.icon} style={{ fontSize: '14px' }} />}
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div className="px-6 pt-4">
            {loading ? (
              <FeedSkeleton />
            ) : posts.length > 0 ? (
              posts.map(post => <FeedCard key={post.id} post={post} />)
            ) : topics[activeTopic]?.filter === 'following' ? (
              <div className="text-center py-20">
                <ion-icon name="people-outline" style={{ fontSize: '44px', color: 'var(--text-faint)' }} />
                <p className="text-[17px] font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>Your following feed is empty</p>
                <p className="text-[14px] mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                  Follow writers and organizations to see their latest posts here.
                </p>
                <button
                  onClick={() => setActiveTopic(0)}
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-[14px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-full transition-colors"
                >
                  <ion-icon name="sparkles" style={{ fontSize: '16px' }} />
                  Discover writers
                </button>
              </div>
            ) : (
              <div className="text-center py-20">
                <ion-icon name="document-text-outline" style={{ fontSize: '40px', color: 'var(--text-faint)' }} />
                <p className="text-[15px] mt-4" style={{ color: 'var(--text-muted)' }}>No posts yet</p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-faint)' }}>
                  {user ? 'Follow writers or pick topics you like to fill your feed.' : 'Be the first to publish something.'}
                </p>
                {user && (
                  <Link href="/new-blog" className="inline-block mt-4 px-5 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-full transition-colors">
                    Start writing
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-[340px] flex-shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto px-8 py-6 scrollbar-thin">
          {/* Top Picks */}
          <div className="mb-8">
            <h3 className="text-[13px] font-bold pb-2 mb-3 tracking-wider uppercase flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <ion-icon name="trophy-outline" style={{ fontSize: '14px', color: '#9b7bf7' }} />
              Top Picks
            </h3>
            {topPicks.length > 0 ? (
              <div>
                {topPicks.map((pick, i) => <TopPickCard key={pick.id} post={pick} index={i} />)}
              </div>
            ) : (
              <p className="text-[13px] py-4" style={{ color: 'var(--text-faint)' }}>No picks yet</p>
            )}
          </div>

          {/* Recommended Topics */}
          <div className="mb-8">
            <h3 className="text-[14px] font-bold mb-3 tracking-wide" style={{ color: 'var(--text-primary)' }}>Recommended Topics</h3>
            <div className="flex flex-wrap gap-2">
              {(popularTags.length > 0 ? popularTags.slice(0, 8) : FIXED_TAGS).map(topic => (
                <button
                  key={topic}
                  onClick={() => {
                    const idx = topics.findIndex(t => t.label === topic);
                    if (idx >= 0) setActiveTopic(idx);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-[13px] transition-colors"
                  style={{ color: 'var(--text-body)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Writing Prompt */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <h3 className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Writing on LixBlogs</h3>
            <ul className="text-[13px] space-y-1.5 mt-3" style={{ color: 'var(--text-muted)' }}>
              <li><Link href="/elixpo/guides/getting-started" className="hover:opacity-70 transition-opacity">New to LixBlogs? Start here</Link></li>
              <li><Link href="/elixpo/guides/writing-tips" className="hover:opacity-70 transition-opacity">Read LixBlogs writing tips</Link></li>
              <li><Link href="/elixpo/guides/practical-advice" className="hover:opacity-70 transition-opacity">Get practical writing advice</Link></li>
            </ul>
            <Link
              href="/new-blog"
              className="inline-block mt-4 px-5 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-full transition-colors"
            >
              Start writing
            </Link>
          </div>

          {/* Footer Links */}
          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-faint)' }}>
            <span className="cursor-pointer transition-colors hover:opacity-70">Help</span>
            <span className="cursor-pointer transition-colors hover:opacity-70">Status</span>
            <span className="cursor-pointer transition-colors hover:opacity-70">About</span>
            <span className="cursor-pointer transition-colors hover:opacity-70">Blog</span>
            <span className="cursor-pointer transition-colors hover:opacity-70">Privacy</span>
            <span className="cursor-pointer transition-colors hover:opacity-70">Terms</span>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
