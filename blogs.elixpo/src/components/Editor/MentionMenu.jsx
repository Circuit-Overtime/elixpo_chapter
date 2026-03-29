'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom @ mention suggestion menu.
 * Searches users, orgs, and blogs and renders grouped results.
 */
export default function MentionMenu({ editor, query, onClose }) {
  const [results, setResults] = useState({ users: [], orgs: [], blogs: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  // Flatten results for keyboard navigation
  const allItems = [
    ...results.users.map((u) => ({ ...u, _type: 'user' })),
    ...results.orgs.map((o) => ({ ...o, _type: 'org' })),
    ...results.blogs.map((b) => ({ ...b, _type: 'blog' })),
  ];

  // Search on query change — debounced 300ms, min 2 chars
  useEffect(() => {
    const q = (query || '').trim();
    if (q.length < 2) {
      setResults({ users: [], orgs: [], blogs: [] });
      setActiveIndex(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.ok ? r.json() : { users: [], orgs: [], blogs: [] })
        .then((data) => {
          setResults({
            users: (data.users || []).slice(0, 5),
            orgs: (data.orgs || []).slice(0, 5),
            blogs: (data.blogs || []).slice(0, 5),
          });
          setActiveIndex(0);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const insertMention = useCallback((item) => {
    if (!editor) return;

    // Delete the @query text before inserting mention
    try {
      const cursor = editor.getTextCursorPosition();
      if (cursor?.block) {
        const block = cursor.block;
        const fullText = (block.content || []).map(c => c.text || '').join('');
        const lastAt = fullText.lastIndexOf('@');
        if (lastAt !== -1) {
          // Replace block content: text before @, then the mention, then text after query
          const before = fullText.slice(0, lastAt);
          const afterQuery = ''; // cursor is at the end of the query
          const beforeContent = before ? [{ type: 'text', text: before, styles: {} }] : [];
          const afterContent = afterQuery ? [{ type: 'text', text: afterQuery, styles: {} }] : [];

          let mentionNode;
          if (item._type === 'user') {
            mentionNode = { type: 'mention', props: { username: item.username, displayName: item.display_name || item.username, avatarUrl: item.avatar_url || '' } };
          } else if (item._type === 'org') {
            mentionNode = { type: 'orgMention', props: { name: item.name || item.slug, slug: item.slug } };
          } else {
            mentionNode = { type: 'blogMention', props: { title: item.title, slugid: item.slugid } };
          }

          editor.updateBlock(block, {
            content: [...beforeContent, mentionNode, { type: 'text', text: ' ', styles: {} }, ...afterContent],
          });
        }
      }
    } catch {
      // Fallback: just insert without deleting (better than nothing)
      let content;
      if (item._type === 'user') {
        content = [{ type: 'mention', props: { username: item.username, displayName: item.display_name || item.username, avatarUrl: item.avatar_url || '' } }, ' '];
      } else if (item._type === 'org') {
        content = [{ type: 'orgMention', props: { name: item.name || item.slug, slug: item.slug } }, ' '];
      } else {
        content = [{ type: 'blogMention', props: { title: item.title, slugid: item.slugid } }, ' '];
      }
      editor.insertInlineContent(content);
    }

    onClose?.();
  }, [editor, onClose]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (allItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[activeIndex]) insertMention(allItems[activeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [allItems, activeIndex, insertMention, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const active = menuRef.current?.querySelector('.mention-item-active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const q = (query || '').trim();
  if (!q) return null;

  let idx = -1;

  return (
    <div ref={menuRef} className="mention-menu">
      {loading && allItems.length === 0 && (
        <div className="mention-menu-empty">Searching...</div>
      )}

      {!loading && allItems.length === 0 && (
        <div className="mention-menu-empty">No results for &ldquo;{q}&rdquo;</div>
      )}

      {results.users.length > 0 && (
        <div className="mention-menu-group">
          <div className="mention-menu-group-label">People</div>
          {results.users.map((user) => {
            idx++;
            const i = idx;
            return (
              <button
                key={`user-${user.username}`}
                className={`mention-item ${i === activeIndex ? 'mention-item-active' : ''}`}
                onClick={() => insertMention({ ...user, _type: 'user' })}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="mention-item-avatar" />
                ) : (
                  <div className="mention-item-avatar-fallback">
                    {(user.display_name || user.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="mention-item-info">
                  <span className="mention-item-name">{user.display_name || user.username}</span>
                  <span className="mention-item-sub">@{user.username}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {results.orgs.length > 0 && (
        <div className="mention-menu-group">
          <div className="mention-menu-group-label">Organizations</div>
          {results.orgs.map((org) => {
            idx++;
            const i = idx;
            return (
              <button
                key={`org-${org.slug}`}
                className={`mention-item ${i === activeIndex ? 'mention-item-active' : ''}`}
                onClick={() => insertMention({ ...org, _type: 'org' })}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="mention-item-avatar" />
                ) : (
                  <div className="mention-item-avatar-fallback mention-item-avatar-org">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                )}
                <div className="mention-item-info">
                  <span className="mention-item-name">{org.name}</span>
                  <span className="mention-item-sub">@{org.slug}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {results.blogs.length > 0 && (
        <div className="mention-menu-group">
          <div className="mention-menu-group-label">Blogs</div>
          {results.blogs.map((blog) => {
            idx++;
            const i = idx;
            return (
              <button
                key={`blog-${blog.slugid}`}
                className={`mention-item ${i === activeIndex ? 'mention-item-active' : ''}`}
                onClick={() => insertMention({ ...blog, _type: 'blog' })}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="mention-item-avatar-fallback mention-item-avatar-blog">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="mention-item-info">
                  <span className="mention-item-name">{blog.title || 'Untitled'}</span>
                  <span className="mention-item-sub">{blog.slugid}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
