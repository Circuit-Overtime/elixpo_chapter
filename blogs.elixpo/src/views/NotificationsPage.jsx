'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import Link from 'next/link';

const NOTIF_CONFIG = {
  follow:         { icon: 'person-add-outline',     color: '#9b7bf7', label: 'followed you' },
  comment:        { icon: 'chatbubble-outline',     color: '#60a5fa', label: 'commented on' },
  like:           { icon: 'heart-outline',           color: '#f87171', label: 'liked' },
  mention:        { icon: 'at-outline',              color: '#fbbf24', label: 'mentioned you in' },
  org_invite:     { icon: 'people-outline',          color: '#4ade80', label: 'invited you to' },
  blog_invite:    { icon: 'create-outline',          color: '#c084fc', label: 'invited you to collaborate on' },
  blog_published: { icon: 'document-text-outline',   color: '#60a5fa', label: 'published' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'follow', label: 'Followers' },
  { key: 'comment', label: 'Comments' },
  { key: 'like', label: 'Likes' },
  { key: 'mention', label: 'Mentions' },
  { key: 'invite', label: 'Invites' },
];

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const yesterday = today - 86400;
  const weekAgo = today - 604800;

  for (const n of notifications) {
    let label;
    if (n.created_at >= today) label = 'Today';
    else if (n.created_at >= yesterday) label = 'Yesterday';
    else if (n.created_at >= weekAgo) label = 'This Week';
    else label = 'Earlier';

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (reset = false) => {
    const newOffset = reset ? 0 : offset;
    try {
      const res = await fetch(`/api/notifications?limit=50&offset=${newOffset}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setNotifications(data.notifications || []);
        } else {
          setNotifications(prev => [...prev, ...(data.notifications || [])]);
        }
        setUnread(data.unread || 0);
        setHasMore((data.notifications || []).length === 50);
        if (reset) setOffset(50);
        else setOffset(prev => prev + 50);
      }
    } catch {}
    setLoading(false);
  }, [offset]);

  useEffect(() => {
    if (user) fetchNotifications(true);
  }, [user]);

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  const markRead = async (id) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  if (authLoading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-8 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="mt-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <ion-icon name="notifications-outline" style={{ fontSize: '48px', color: 'var(--text-faint)' }} />
          <h2 className="text-xl font-bold mt-4" style={{ color: 'var(--text-primary)' }}>Sign in to view notifications</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Your activity and updates will appear here.</p>
          <Link href="/sign-in" className="mt-6 px-6 py-2.5 bg-[#9b7bf7] text-white font-semibold rounded-full text-sm hover:bg-[#8b6ae6] transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  // Filter
  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'invite') return n.type === 'org_invite' || n.type === 'blog_invite';
    return n.type === filter;
  });

  const grouped = groupByDate(filtered);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
            {unread > 0 && (
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {unread} unread notification{unread !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 text-[13px] font-medium rounded-lg transition-colors"
              style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)' }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-none pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap"
              style={{
                backgroundColor: filter === f.key ? 'var(--accent)' : 'var(--bg-surface)',
                color: filter === f.key ? '#ffffff' : 'var(--text-muted)',
                border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border-default)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ion-icon name="notifications-off-outline" style={{ fontSize: '48px', color: 'var(--text-faint)' }} />
            <p className="text-[15px] mt-4" style={{ color: 'var(--text-muted)' }}>
              {filter === 'all' ? 'No notifications yet' : `No ${filter === 'unread' ? 'unread' : filter} notifications`}
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-faint)' }}>
              When someone interacts with your content, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--text-faint)' }}>
                  {label}
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  {items.map((n, i) => {
                    const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.follow;
                    return (
                      <Link
                        key={n.id}
                        href={n.target_url || '#'}
                        onClick={() => { if (!n.read) markRead(n.id); }}
                        className="flex items-start gap-3.5 px-5 py-4 transition-colors"
                        style={{
                          backgroundColor: n.read ? 'var(--card-bg)' : 'var(--accent-subtle)',
                          borderBottom: i < items.length - 1 ? '1px solid var(--divider)' : 'none',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = n.read ? 'var(--bg-hover)' : 'var(--accent-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = n.read ? 'var(--card-bg)' : 'var(--accent-subtle)'}
                      >
                        {/* Avatar + type badge */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          {n.actor_avatar ? (
                            <img src={n.actor_avatar} alt="" className="h-10 w-10 rounded-full object-cover" style={{ border: '2px solid var(--border-default)' }} />
                          ) : (
                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-[14px] font-bold"
                              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '2px solid var(--border-default)' }}>
                              {(n.actor_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--card-bg)', border: '2px solid var(--divider)' }}>
                            <ion-icon name={cfg.icon} style={{ fontSize: '11px', color: cfg.color }} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{n.actor_name || 'Someone'}</strong>
                            {' '}{cfg.label}
                            {n.target_title && (
                              <> <strong style={{ color: 'var(--text-primary)' }}>{n.target_title}</strong></>
                            )}
                          </p>
                          <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-faint)' }}>{timeAgo(n.created_at)}</p>
                        </div>

                        {/* Unread indicator */}
                        {!n.read && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#9b7bf7] mt-2 flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  onClick={() => fetchNotifications(false)}
                  className="px-5 py-2 text-[13px] font-medium rounded-lg transition-colors"
                  style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)' }}
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
