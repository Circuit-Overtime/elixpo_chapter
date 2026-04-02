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
    <article className="group py-6" style={{ borderBottom: '1px solid var(--divider)' }}>
      <Link href={`/${author.username || 'unknown'}/${post.slug}`} className="block cursor-pointer">
        <div className="flex items-center gap-2 mb-2.5">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
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
        </div>
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-bold leading-[1.3] mb-1.5 group-hover:opacity-75 transition-opacity font-serif tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
              {post.page_emoji && <span className="mr-1.5">{post.page_emoji}</span>}
              {post.title || 'Untitled'}
            </h2>
            {post.subtitle && (
              <p className="text-[15px] leading-[1.5] line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>
                {post.subtitle}
              </p>
            )}
            <div className="flex items-center gap-3.5 text-[12px]" style={{ color: 'var(--text-faint)' }}>
              {(post.tags || []).length > 0 && (
                <span className="text-[#9b7bf7] text-[11px] bg-[#9b7bf714] px-2.5 py-0.5 rounded-full font-medium">{post.tags[0]}</span>
              )}
              <span>{timeAgo(post.published_at)}</span>
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
          <img
            src={post.cover_image_r2_key || generateBlogBanner(post.id || post.slug)}
            alt=""
            className="w-[140px] h-[90px] rounded-lg flex-shrink-0 hidden sm:block object-cover"
          />
        </div>
      </Link>
      {post.can_edit && (
        <div className="mt-2 flex items-center">
          <Link
            href={`/edit/${post.id}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors"
            style={{ color: 'var(--text-faint)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            onClick={e => e.stopPropagation()}
          >
            <ion-icon name="create-outline" style={{ fontSize: '13px' }} />
            Edit
          </Link>
        </div>
      )}
    </article>
  );
}

function TopPickCard({ post }) {
  const author = post.author || {};
  return (
    <Link href={`/${author.username || 'unknown'}/${post.slug}`}>
      <div className="py-3.5 cursor-pointer group" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>
              {(author.display_name || author.username || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {author.display_name || author.username}
          </span>
        </div>
        <h3 className="text-[14px] font-bold leading-[1.35] group-hover:opacity-75 transition-opacity font-serif" style={{ color: 'var(--text-primary)' }}>
          {post.page_emoji && <span className="mr-1">{post.page_emoji}</span>}
          {post.title || 'Untitled'}
        </h3>
        <span className="text-[11px] mt-1 block" style={{ color: 'var(--text-faint)' }}>{timeAgo(post.published_at)}</span>
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

const RECOMMENDED_TOPICS = [
  'Programming', 'Self Improvement', 'Data Science', 'Writing',
  'Relationships', 'Technology', 'Design', 'Startups',
];

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
    ...(user ? [{ label: 'Following', icon: null, filter: 'following' }] : []),
  ];
  const interestTabs = (user ? userInterests : popularTags.slice(0, 6)).map(tag => ({ label: tag, icon: null, tag }));
  const topics = [...fixedTabs, ...interestTabs];

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
          <div className="px-6">
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
            <h3 className="text-[14px] font-bold pb-2 mb-1 tracking-wide" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--divider)' }}>Top Picks</h3>
            {topPicks.length > 0 ? (
              <div>
                {topPicks.map(pick => <TopPickCard key={pick.id} post={pick} />)}
              </div>
            ) : (
              <p className="text-[13px] py-4" style={{ color: 'var(--text-faint)' }}>No picks yet</p>
            )}
          </div>

          {/* Recommended Topics */}
          <div className="mb-8">
            <h3 className="text-[14px] font-bold mb-3 tracking-wide" style={{ color: 'var(--text-primary)' }}>Recommended Topics</h3>
            <div className="flex flex-wrap gap-2">
              {(popularTags.length > 0 ? popularTags.slice(0, 8) : RECOMMENDED_TOPICS).map(topic => (
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
