'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generatePixelAvatar } from '../utils/pixelAvatar';

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
        style={{ '--hover-bg': 'var(--bg-hover)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" style={{ border: '2px solid var(--border-default)' }} />
        ) : (
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '2px solid var(--border-default)' }}>
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[280px] rounded-2xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)', boxShadow: 'var(--shadow-lg)' }}>
          <Link
            href={`/${user.username}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3.5 px-5 py-4 transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid var(--accent)', opacity: 0.9 }} />
            ) : (
              <div className="h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '2px solid var(--accent)', opacity: 0.9 }}>
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.display_name || user.username}</p>
              <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
            </div>
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
      redirect_uri: (process.env.NEXT_PUBLIC_URL || window.location.origin) + '/api/auth/callback',
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
              <div className="h-8 w-8 rounded-full bg-cover bg-center logo-themed" style={{ backgroundImage: "url(/logo.png)" }} />
              <span className="text-xl font-bold tracking-tight font-kanit" style={{ color: 'var(--text-primary)' }}>LixBlogs</span>
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
              Write
            </Link>
            {loading ? (
              <div className="h-8 w-8 rounded-full animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            ) : user ? (
              <ProfileDropdown user={user} logout={logout} />
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="text-[14px] transition-colors px-3 py-1.5 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  Sign In
                </button>
                <button onClick={handleLogin} className="text-[14px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] transition-colors px-4 py-1.5 rounded-full">
                  Get Started
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
            <Link href="/profile" className="block px-3 py-3 rounded-xl transition-colors cursor-pointer" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2.5">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {(user.display_name || user.username || '?')[0].toUpperCase()}
                  </div>
                )}
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
