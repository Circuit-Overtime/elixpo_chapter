'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Modal listing a user's followers or following. Names link to their profile.
// props: username, type ('followers' | 'following'), onClose
export default function FollowListModal({ username, type, onClose }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    setItems(null);
    fetch(`/api/users/${encodeURIComponent(username)}/follow-list?type=${type}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (active) setItems(d.items || []); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [username, type]);

  const title = type === 'following' ? 'Following' : 'Followers';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {items === null ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-[var(--bg-elevated)] animate-pulse rounded-lg" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-[13px] text-[var(--text-muted)] py-10">
              {type === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}
            </p>
          ) : (
            <ul>
              {items.map((it, i) => (
                <li key={i}>
                  <Link
                    href={`/${it.handle}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {it.avatar ? (
                      <img src={it.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {(it.name || it.handle || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{it.name}</p>
                      <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>@{it.handle}{it.type === 'org' ? ' · org' : ''}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
