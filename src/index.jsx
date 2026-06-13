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

// Stacked author avatars (primary + co-authors).
function AuthorStack({ authors }) {
  const shown = authors.slice(0, 3);
  return (
    <div className="flex -space-x-1.5">
      {shown.map((a, i) => (
        a.avatar_url ? (
          <img key={i} src={a.avatar_url} alt="" title={a.display_name || a.username} className="h-5 w-5 rounded-full object-cover" style={{ boxShadow: '0 0 0 2px var(--bg-app)' }} />
        ) : (
          <div key={i} title={a.display_name || a.username} className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)', boxShadow: '0 0 0 2px var(--bg-app)' }}>{(a.display_name || a.username || '?')[0].toUpperCase()}</div>
        )
      ))}
    </div>
  );
}

// "..." menu — follow author/publication, mute author/publication/topics, report.
function FeedCardMenu({ post, onHide }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [fAuthor, setFAuthor] = useState(false);
  const [fOrg, setFOrg] = useState(false);
  const ref = useRef(null);
  const author = post.author || {};
  const org = post.org || null;

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Resolve current follow state when the menu opens, to grey out what's already followed.
  useEffect(() => {
    if (!open || !user) return;
    if (author.username) fetch(`/api/users/${author.username}/follow`).then(r => r.ok ? r.json() : null).then(d => d && setFAuthor(!!d.following)).catch(() => {});
    if (org?.slug) fetch(`/api/orgs/${org.slug}/follow`).then(r => r.ok ? r.json() : null).then(d => d && setFOrg(!!d.following)).catch(() => {});
  }, [open, user]);

  const needAuth = () => { if (!user) { window.location.href = '/sign-in?next=/'; return true; } return false; };
  const post_ = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});

  const followAuthor = () => { if (needAuth() || fAuthor) return; setFAuthor(true); post_(`/api/users/${author.username}/follow`); setOpen(false); };
  const followOrg = () => { if (needAuth() || fOrg) return; setFOrg(true); post_(`/api/orgs/${org.slug}/follow`); setOpen(false); };
  const muteAuthor = () => { if (needAuth()) return; post_('/api/mutes', { targetType: 'author', targetId: post.author_id }); setOpen(false); onHide?.(post.id); };
  const muteOrg = () => { if (needAuth()) return; post_('/api/mutes', { targetType: 'org', targetId: org.id }); setOpen(false); onHide?.(post.id); };
  const muteTopics = () => { if (needAuth()) return; (post.tags || []).forEach(t => post_('/api/mutes', { targetType: 'tag', targetId: t })); setOpen(false); onHide?.(post.id); };
  const report = () => {
    if (needAuth()) return;
    setOpen(false);
    if (!confirm('Report this story to the moderators?')) return;
    post_(`/api/blogs/${post.id}/report`, { reason: 'other', detail: 'Reported from feed' });
  };

  const item = (label, fn, danger, badge, disabled) => (
    <button onClick={disabled ? undefined : fn} disabled={disabled} className="w-full text-left px-4 py-2 text-[13px] flex items-center gap-2 transition-colors"
      style={{ color: danger ? '#f87171' : 'var(--text-body)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
      {label}{badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#16a34a', color: '#fff' }}>New</span>}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.preventDefault(); setOpen(o => !o); }} className="flex items-center justify-center w-8 h-8 rounded-full transition-colors" style={{ color: 'var(--text-faint)' }} title="More" onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
        <ion-icon name="ellipsis-horizontal" style={{ fontSize: '18px' }} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-56 rounded-xl py-1.5 overflow-hidden" style={{ backgroundColor: 'var(--dropdown-bg, var(--bg-surface))', border: '1px solid var(--border-default)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
          {item(fAuthor ? `Following ${author.display_name || author.username}` : `Follow ${author.display_name || author.username}`, followAuthor, false, false, fAuthor)}
          {org && item(fOrg ? `Following ${org.name}` : `Follow ${org.name}`, followOrg, false, false, fOrg)}
          <div className="my-1.5" style={{ borderTop: '1px solid var(--divider)' }} />
          {item('Mute author', muteAuthor)}
          {org && item('Mute publication', muteOrg)}
          {(post.tags || []).length > 0 && item('Mute topics', muteTopics, false, true)}
          <div className="my-1.5" style={{ borderTop: '1px solid var(--divider)' }} />
          {item('Report story…', report, true)}
        </div>
      )}
    </div>
  );
}

// Action bar — like, comment, repost, save, "..." menu.
function FeedCardActions({ post, onHide }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [saved, setSaved] = useState(!!post.bookmarked);
  const [reposted, setReposted] = useState(!!post.reposted);
  const [repostCount, setRepostCount] = useState(post.repost_count || 0);
  const [toast, setToast] = useState('');
  const href = `/${(post.org?.slug) || post.author?.username || 'unknown'}/${post.slug}`;
  // Author / co-authors / org members can't repost their own blog.
  const cannotRepost = !!(post.is_author || post.is_co_author || post.can_edit);

  const guard = (fn) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { window.location.href = '/sign-in?next=/'; return; }
    fn();
  };
  const like = guard(() => {
    const was = liked; setLiked(!was); setLikeCount(c => Math.max(0, c + (was ? -1 : 1)));
    fetch(`/api/blogs/${post.id}/like`, { method: 'POST' })
      .then(r => r.ok ? r.json() : Promise.reject()).then(d => { setLiked(!!d.liked); setLikeCount(d.count || 0); })
      .catch(() => { setLiked(was); setLikeCount(c => Math.max(0, c + (was ? 1 : -1))); });
  });
  const flashToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const save = guard(() => {
    const was = saved; setSaved(!was);
    (was ? fetch(`/api/library/bookmarks/${post.id}`, { method: 'DELETE' })
         : fetch('/api/library/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blogId: post.id }) }))
      .then(r => { if (!r.ok) throw new Error(); if (!was) flashToast('Saved to your reading list'); }).catch(() => setSaved(was));
  });
  const repost = guard(() => {
    if (cannotRepost) return;
    const was = reposted; setReposted(!was); setRepostCount(c => Math.max(0, c + (was ? -1 : 1)));
    fetch(`/api/blogs/${post.id}/repost`, { method: was ? 'DELETE' : 'POST' })
      .then(r => r.ok ? r.json() : Promise.reject()).then(d => { setReposted(!!d.reposted); setRepostCount(d.count || 0); if (!was) flashToast('Reposted to your followers'); })
      .catch(() => { setReposted(was); setRepostCount(c => Math.max(0, c + (was ? 1 : -1))); });
  });

  return (
    <div className="flex items-center gap-5 mt-3">
      {/* like */}
      <button onClick={like} className="flex items-center gap-1.5 text-[13px] transition-colors" style={{ color: liked ? '#f43f5e' : 'var(--text-muted)' }} title={liked ? 'Unlike' : 'Like'}>
        <svg className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
        {likeCount > 0 && <span>{likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}</span>}
      </button>
      {/* comments */}
      <Link href={`${href}#comments`} className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-muted)' }} title="Comments" onClick={e => e.stopPropagation()}>
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        {post.comment_count > 0 && <span>{post.comment_count}</span>}
      </Link>
      {/* repost — greyed/disabled on your own blog */}
      <button
        onClick={repost}
        disabled={cannotRepost}
        title={cannotRepost ? "You can't repost your own blog" : 'Repost'}
        className="flex items-center gap-1.5 text-[13px] transition-colors"
        style={{ color: reposted ? '#16a34a' : 'var(--text-muted)', opacity: cannotRepost ? 0.4 : 1, cursor: cannotRepost ? 'not-allowed' : 'pointer' }}
      >
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
        {repostCount > 0 && <span>{repostCount}</span>}
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={save} className="flex items-center justify-center w-8 h-8 rounded-full transition-colors" style={{ color: saved ? '#9b7bf7' : 'var(--text-faint)' }} title="Save to reading list" onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <ion-icon name={saved ? 'bookmark' : 'bookmark-outline'} style={{ fontSize: '18px' }} />
        </button>
        <FeedCardMenu post={post} onHide={onHide} />
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-app)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
          <ion-icon name="bookmark" style={{ fontSize: '15px' }} /> {toast}
        </div>
      )}
    </div>
  );
}

function FeedCard({ post, onHide }) {
  const author = post.author || {};
  const cover = post.cover_image_r2_key || generateBlogBanner(post.id || post.slug);
  const href = `/${(post.org?.slug) || author.username || 'unknown'}/${post.slug}`;
  const allAuthors = [{ display_name: author.display_name, username: author.username, avatar_url: author.avatar_url }, ...(post.co_authors || [])];
  return (
    <article className="group py-6" style={{ borderBottom: '1px solid var(--divider)' }}>
      {post.reshared_by && (
        <div className="flex items-center gap-1.5 mb-2 text-[12px] font-medium" style={{ color: 'var(--text-faint)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
          Reposted by {post.reshared_by.display_name || post.reshared_by.username}
        </div>
      )}
      <Link href={href} className="flex gap-5 cursor-pointer">
        <div className="flex-1 min-w-0">
          {(() => {
            const names = allAuthors.slice(0, 3).map(a => a.display_name || a.username);
            const moreN = allAuthors.length - names.length;
            const namesStr = names.join(' and ') + (moreN > 0 ? ` + ${moreN} more` : '');
            const dateStr = post.published_at ? new Date(post.published_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return (
              <div className="flex items-center gap-2 mb-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                <AuthorStack authors={allAuthors} />
                <span className="truncate">
                  {post.org && <>in <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{post.org.name}</span> </>}
                  by <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{namesStr}</span>
                  {dateStr && <span style={{ color: 'var(--text-faint)' }}> · {dateStr}</span>}
                </span>
                {post.is_staff && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#9b7bf718', color: '#9b7bf7', border: '1px solid #9b7bf730' }}>Staff</span>
                )}
              </div>
            );
          })()}

          <h2 className="text-[20px] font-extrabold leading-[1.25] mb-1 group-hover:opacity-80 transition-opacity tracking-[-0.01em]" style={{ color: 'var(--text-primary)', fontFamily: "'Source Serif 4', Georgia, serif" }}>
            {post.title || 'Untitled'}
          </h2>
          {post.subtitle && (
            <p className="text-[15px] font-medium leading-[1.5] line-clamp-1 mb-1" style={{ color: 'var(--text-muted)' }}>{post.subtitle}</p>
          )}
          {post.excerpt && (
            <p className="text-[14px] leading-[1.55] line-clamp-2 mb-2" style={{ color: 'var(--text-faint)' }}>{post.excerpt}</p>
          )}
          <div className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--text-faint)' }}>
            {(post.tags || []).slice(0, 1).map(tag => (
              <span key={tag} className="text-[12px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-body)' }}>{tag}</span>
            ))}
            {post.read_time_minutes > 0 && <span>{post.read_time_minutes} min read</span>}
          </div>
        </div>

        <div className="flex-shrink-0 self-center hidden sm:block">
          <img src={cover} alt="" className="w-[112px] h-[112px] rounded-md object-cover" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </div>
      </Link>

      {/* Action bar */}
      <FeedCardActions post={post} onHide={onHide} />

      {post.can_edit && (
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/edit/${post.slug || post.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors" style={{ color: 'var(--text-faint)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <ion-icon name="create-outline" style={{ fontSize: '13px' }} /> Edit
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

function FollowSuggestion({ u }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  // Reflect the real follow state so the button isn't always "Follow".
  useEffect(() => {
    if (!user || !u.username) return;
    let active = true;
    fetch(`/api/users/${encodeURIComponent(u.username)}/follow`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (active && d) setFollowing(!!d.following); })
      .catch(() => {});
    return () => { active = false; };
  }, [u.username, user]);
  const toggle = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { window.location.href = `/sign-in?next=/`; return; }
    const was = following;
    setFollowing(!was);
    fetch(`/api/users/${encodeURIComponent(u.username)}/follow`, { method: was ? 'DELETE' : 'POST' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setFollowing(!!d.following))
      .catch(() => setFollowing(was));
  };
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <Link href={`/${u.username}`} className="flex-shrink-0">
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>{(u.display_name || u.username || '?')[0].toUpperCase()}</div>
        )}
      </Link>
      <Link href={`/${u.username}`} className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.display_name || u.username}</p>
        <p className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>@{u.username}</p>
      </Link>
      <button
        onClick={toggle}
        className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
        style={following
          ? { color: 'var(--text-muted)', border: '1px solid var(--border-default)' }
          : { color: 'var(--text-primary)', border: '1px solid var(--text-primary)' }}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
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
  const [tagFilter, setTagFilter] = useState(null); // active Recommended-topic pill

  // Two tabs only: "For you" (personalized/blended) and "Featured" (editorial).
  const topics = [
    { label: 'For you', icon: 'sparkles', filter: null },
    { label: 'Featured', icon: null, filter: 'featured' },
  ];

  // "Who to follow" — distinct authors from the current feed (not you).
  const whoToFollow = (() => {
    const seen = new Set();
    const out = [];
    for (const p of posts) {
      const a = p.author;
      if (a?.username && a.username !== user?.username && a.username !== 'selenium-cutlet' && !seen.has(a.username)) {
        seen.add(a.username);
        out.push(a);
      }
      if (out.length >= 4) break;
    }
    return out;
  })();

  // Fetch feed — a Recommended-topic pill (tagFilter) overrides the tab.
  useEffect(() => {
    setLoading(true);
    let url = '/api/feed?limit=20';
    if (tagFilter) url += `&tag=${encodeURIComponent(tagFilter)}`;
    else if (topics[activeTopic]?.filter) url += `&filter=${topics[activeTopic].filter}`;

    fetch(url, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [activeTopic, tagFilter, user]);

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
      <div className="flex justify-center">
        {/* Center Feed */}
        <div className="w-full max-w-[740px] min-w-0" style={{ borderRight: '1px solid var(--divider)' }}>
          {/* Search + Topic Tabs — sticky header */}
          <div className="sticky top-14 z-40 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-app) 92%, transparent)', borderBottom: '1px solid var(--divider)' }}>
            <div className="max-w-[680px] mx-auto">
            {/* Search bar */}
            <div className="px-6 pt-3 pb-2">
              <SearchBar />
            </div>
            {/* Topic tabs */}
            <div className="flex items-center gap-0 px-6 overflow-x-auto scrollbar-none">
              {topics.map((topic, i) => (
                <button
                  key={topic.label}
                  onClick={() => { setTagFilter(null); setActiveTopic(i); }}
                  className="flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0"
                  style={{
                    color: !tagFilter && i === activeTopic ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderBottomColor: !tagFilter && i === activeTopic ? 'var(--text-primary)' : 'transparent',
                  }}
                >
                  {topic.icon && <ion-icon name={topic.icon} style={{ fontSize: '14px' }} />}
                  {topic.label}
                </button>
              ))}
            </div>
            </div>
          </div>

          {/* Feed */}
          <div className="px-6 pt-4 max-w-[680px] mx-auto">
            {tagFilter && (
              <div className="flex items-center gap-2 mb-1 py-2">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Topic:</span>
                <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>{tagFilter}</span>
                <button onClick={() => setTagFilter(null)} className="text-[12px]" style={{ color: 'var(--text-faint)' }}>✕ clear</button>
              </div>
            )}
            {loading ? (
              <FeedSkeleton />
            ) : posts.length > 0 ? (
              posts.map(post => <FeedCard key={post.id} post={post} onHide={(id) => setPosts(ps => ps.filter(p => p.id !== id))} />)
            ) : (
              <div className="my-8 rounded-2xl border border-dashed flex flex-col items-center text-center px-6 py-14" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                <div className="h-14 w-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <ion-icon name="document-text-outline" style={{ fontSize: '24px', color: 'var(--text-faint)' }} />
                </div>
                <p className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>No posts yet</p>
                <p className="text-[13px] mt-1.5 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  {user ? 'Follow writers or pick topics you like to fill your feed.' : 'Be the first to publish something.'}
                </p>
                {user && (
                  <Link href="/new-blog" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-[14px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-full transition-colors">
                    <ion-icon name="create-outline" style={{ fontSize: '16px' }} />
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
                  onClick={() => setTagFilter(topic)}
                  className="px-3.5 py-1.5 rounded-full text-[13px] transition-colors"
                  style={tagFilter === topic
                    ? { color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent)' }
                    : { color: 'var(--text-body)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Who to follow */}
          {whoToFollow.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[14px] font-bold mb-4 tracking-wide" style={{ color: 'var(--text-primary)' }}>Who to follow</h3>
              {whoToFollow.map(u => <FollowSuggestion key={u.username} u={u} />)}
            </div>
          )}

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

          {/* Status — help/legal/docs now live in the left sidebar above the account */}
          <div className="mt-8 flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-faint)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#16a34a' }} />
            <span>All systems operational</span>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
