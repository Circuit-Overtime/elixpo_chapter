'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generatePixelAvatar } from '../utils/pixelAvatar';

// ─── Notification type config ───
const NOTIF_CONFIG = {
  follow:         { icon: 'person-add-outline',     color: '#9b7bf7', label: 'followed you' },
  comment:        { icon: 'chatbubble-outline',     color: '#60a5fa', label: 'commented on' },
  like:           { icon: 'heart-outline',           color: '#f87171', label: 'liked' },
  mention:        { icon: 'at-outline',              color: '#fbbf24', label: 'mentioned you in' },
  org_invite:     { icon: 'people-outline',          color: '#4ade80', label: 'invited you to' },
  blog_invite:    { icon: 'create-outline',          color: '#c084fc', label: 'invited you to collaborate on' },
  blog_published: { icon: 'document-text-outline',   color: '#60a5fa', label: 'published' },
};

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.unread || 0);
      }
    } catch {}
  }, []);

  // Poll every 30s for new notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch fresh data when opening
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        title="Notifications"
      >
        <ion-icon name={unread > 0 ? 'notifications' : 'notifications-outline'} style={{ fontSize: '18px' }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#9b7bf7] text-white text-[10px] font-bold px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-2xl z-50 overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)', boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--divider)' }}>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[12px] font-medium transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <ion-icon name="notifications-off-outline" style={{ fontSize: '32px', color: 'var(--text-faint)' }} />
                <p className="text-[13px] mt-3" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-faint)' }}>When someone interacts with your content, you'll see it here.</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.follow;
                return (
                  <Link
                    key={n.id}
                    href={n.target_url || '#'}
                    onClick={() => { if (!n.read) markRead(n.id); setOpen(false); }}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors"
                    style={{
                      backgroundColor: n.read ? 'transparent' : 'var(--accent-subtle)',
                      borderBottom: '1px solid var(--divider)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = n.read ? 'var(--bg-hover)' : 'var(--accent-subtle)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'var(--accent-subtle)'}
                  >
                    {/* Actor avatar */}
                    <div className="relative flex-shrink-0">
                      {n.actor_avatar ? (
                        <img src={n.actor_avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold"
                          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                          {(n.actor_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      {/* Type icon badge */}
                      <div className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--card-bg)', border: '1.5px solid var(--divider)' }}>
                        <ion-icon name={cfg.icon} style={{ fontSize: '10px', color: cfg.color }} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{n.actor_name || 'Someone'}</strong>
                        {' '}{cfg.label}
                        {n.target_title && (
                          <> <strong style={{ color: 'var(--text-primary)' }}>{n.target_title}</strong></>
                        )}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>{timeAgo(n.created_at)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#9b7bf7] mt-2 flex-shrink-0" />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid var(--divider)' }}>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[12px] font-medium"
                style={{ color: 'var(--accent)' }}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Avatar with fallback — handles broken image URLs gracefully */
function UserAvatar({ src, name, size = 32, className = '', style = {} }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?')[0].toUpperCase();
  const s = { width: size, height: size, ...style };

  if (src && !failed) {
    return (
      <img
        src={src} alt="" className={`rounded-full object-cover ${className}`}
        style={s}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold ${className}`}
      style={{ ...s, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: Math.round(size * 0.38) }}
    >
      {initial}
    </div>
  );
}

const NAV_ITEMS = [
  { label: 'Home', icon: 'home-outline', href: '/' },
  { label: 'Library', icon: 'bookmark-outline', href: '/library' },
  { label: 'Profile', icon: 'person-outline', href: '/profile' },
  { label: 'Stories', icon: 'book-outline', href: '/stories' },
  { label: 'Stats', icon: 'stats-chart-outline', href: '/stats' },
];

function ProfileDropdown({ user, logout }) {
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && orgs.length === 0) {
      fetch('/api/orgs').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.orgs) setOrgs(d.orgs);
      }).catch(() => {});
    }
  }, [open]);

  const initial = (user.display_name || user.username || '?')[0].toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-1 py-1 rounded-full transition-colors"
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <UserAvatar src={user.avatar_url} name={user.display_name || user.username} size={32} style={{ border: '2px solid var(--border-default)' }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[280px] rounded-2xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)', boxShadow: 'var(--shadow-lg)' }}>
          <Link
            href={`/${user.username}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3.5 px-4 py-3.5 m-2 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
          >
            <UserAvatar src={user.avatar_url} name={user.display_name || user.username} size={44} style={{ border: '2px solid var(--accent)', flexShrink: 0 }} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.display_name || user.username}</p>
              <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
            </div>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </Link>

          <div style={{ height: '1px', backgroundColor: 'var(--divider)' }} />

          <div className="py-1.5">
            {orgs.length > 0 ? (
              <>
                <p className="px-5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Organizations</p>
                {orgs.slice(0, 4).map(org => (
                  <DropdownItem key={org.id} href={`/${org.slug}`} onClick={() => setOpen(false)}>
                    <img src={org.logo_url || generatePixelAvatar(org.slug)} alt="" className="w-5 h-5 rounded object-cover" />
                    <span className="truncate flex-1">{org.name}</span>
                  </DropdownItem>
                ))}
              </>
            ) : (
              <DropdownItem href="/settings?tab=organization" onClick={() => setOpen(false)} accent>
                <ion-icon name="add-circle-outline" style={{ fontSize: '16px' }} />
                Create Organization
              </DropdownItem>
            )}
          </div>
          <div style={{ height: '1px', backgroundColor: 'var(--divider)' }} />

          <div className="py-1.5">
            <DropdownItem href="/profile" onClick={() => setOpen(false)} icon="person-outline">Your Profile</DropdownItem>
            <DropdownItem href="/stories" onClick={() => setOpen(false)} icon="book-outline">Your Stories</DropdownItem>
            <DropdownItem href="/settings" onClick={() => setOpen(false)} icon="settings-outline">Settings</DropdownItem>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--divider)' }} />

          <div className="py-1.5">
            <DropdownItem href="/about" onClick={() => setOpen(false)} icon="help-circle-outline" faint>Help</DropdownItem>
            <DropdownItem href="/pricing" onClick={() => setOpen(false)} icon="diamond-outline" faint>Pricing</DropdownItem>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--divider)' }} />

          <div className="py-1.5">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-3 w-full px-5 py-2.5 text-[13px] transition-colors"
              style={{ color: 'var(--text-body)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-body)'; }}
            >
              <ion-icon name="log-out-outline" style={{ fontSize: '16px', color: 'var(--text-faint)' }} />
              Sign out
            </button>
            <p className="px-5 pb-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>{user.email}</p>
          </div>

          <div className="px-5 py-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-faint)' }}>
            <Link href="/about" className="hover:opacity-80 transition-opacity">About</Link>
            <Link href="/blog" className="hover:opacity-80 transition-opacity">Blog</Link>
            <span className="hover:opacity-80 cursor-pointer transition-opacity">Privacy</span>
            <span className="hover:opacity-80 cursor-pointer transition-opacity">Terms</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ href, onClick, icon, accent, faint, children }) {
  const color = accent ? 'var(--accent)' : faint ? 'var(--text-faint)' : 'var(--text-body)';
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-2.5 text-[13px] transition-colors"
      style={{ color }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = accent ? 'var(--accent-hover)' : 'var(--text-primary)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = color; }}
    >
      {icon && <ion-icon name={icon} style={{ fontSize: '16px', color: 'var(--text-faint)' }} />}
      {children}
    </Link>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  function handleLogin() {
    const state = crypto.randomUUID();
    document.cookie = `oauth_state=${state}; path=/; max-age=600; samesite=lax`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID,
      redirect_uri: window.location.origin + '/api/auth/callback',
      state,
      scope: 'openid profile email',
    });
    window.location.href = `https://accounts.elixpo.com/oauth/authorize?${params}`;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-app) 92%, transparent)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <img src={isDark ? '/logo-light.png' : '/logo-dark.png'} alt="" className="h-8 w-8 rounded-full" />
              <span className="hidden sm:inline text-xl font-bold tracking-tight font-kanit" style={{ color: 'var(--text-primary)' }}>LixBlogs</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <ion-icon name={isDark ? 'sunny-outline' : 'moon-outline'} style={{ fontSize: '18px' }} />
            </button>

            <Link
              href={user ? "/new-blog" : "/sign-in"}
              className="flex items-center gap-1.5 text-[14px] transition-colors px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <span className="hidden sm:inline">Write</span>
            </Link>
            {loading ? (
              <div className="h-8 w-8 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            ) : user ? (
              <>
                <NotificationDropdown />
                <ProfileDropdown user={user} logout={logout} />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-[14px] transition-colors px-3 py-1.5 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  Sign In
                </Link>
                <button onClick={handleLogin} className="text-[14px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] transition-colors rounded-full px-2.5 py-2 sm:px-4 sm:py-1.5 flex items-center justify-center">
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden"><ion-icon name="log-in-outline" style={{ fontSize: '18px' }} /></span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Layout with sidebar */}
      <div className="max-w-[1400px] mx-auto flex">
        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-14 h-[calc(100vh-56px)] px-4 py-6 justify-between" style={{ borderRight: '1px solid var(--border-default)' }}>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}}
                >
                  <ion-icon name={item.icon} style={{ fontSize: '18px' }} />
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors"
                style={{
                  color: pathname.startsWith('/settings') ? 'var(--text-primary)' : 'var(--text-muted)',
                  backgroundColor: pathname.startsWith('/settings') ? 'var(--bg-active)' : 'transparent',
                }}
                onMouseEnter={e => { if (!pathname.startsWith('/settings')) { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
                onMouseLeave={e => { if (!pathname.startsWith('/settings')) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}}
              >
                <ion-icon name="settings-outline" style={{ fontSize: '18px' }} />
                Settings
              </Link>
            </div>
          </nav>
          {user && (
            <Link href="/profile" className="block px-3 py-3 rounded-xl transition-colors cursor-pointer" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2.5">
                <UserAvatar src={user.avatar_url} name={user.display_name || user.username} size={32} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.display_name || user.username}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
                </div>
              </div>
            </Link>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
