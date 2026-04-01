'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import Link from 'next/link';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            {post.published_as && post.published_as.startsWith('org:') && (
              <><span style={{ color: 'var(--text-secondary)' }}>in {post.published_as.replace(/^org:.*/, author.username)}</span><span className="mx-0.5" style={{ color: 'var(--text-faint)' }}>&middot;</span></>
            )}
            <span style={{ color: 'var(--text-secondary)' }}>{author.display_name || author.username}</span>
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
          {post.cover_image_r2_key && (
            <img src={post.cover_image_r2_key} alt="" className="w-[120px] h-[80px] rounded-md object-cover flex-shrink-0 hidden sm:block" />
          )}
          {!post.cover_image_r2_key && (
            <div className="w-[120px] h-[80px] rounded-md flex-shrink-0 hidden sm:block" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          )}
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
          {/* Topic Tabs */}
          <div className="sticky top-14 z-40 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-app) 92%, transparent)', borderBottom: '1px solid var(--divider)' }}>
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
