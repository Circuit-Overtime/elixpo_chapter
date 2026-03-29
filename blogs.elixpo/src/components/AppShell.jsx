'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

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

  // Fetch orgs on first open
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
        className="flex items-center gap-2 px-1 py-1 rounded-full hover:bg-[#ffffff08] transition-colors"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-[#232d3f]" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-[#2a2d3a] flex items-center justify-center text-[13px] text-[#b0b0b0] font-medium ring-2 ring-[#232d3f]">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[280px] bg-[#171d2a] border border-[#2a3344] rounded-2xl shadow-2xl z-50 overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)' }}>
          {/* User info header — darker contrast bg */}
          <Link
            href={`/@${user.username}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3.5 px-5 py-4 bg-[#131922] hover:bg-[#161c28] transition-colors"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#9b7bf730] flex-shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-[#232d3f] flex-shrink-0 flex items-center justify-center text-lg text-[#b0b0b0] font-bold ring-2 ring-[#9b7bf730]">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] text-white font-semibold truncate">{user.display_name || user.username}</p>
              <p className="text-[12px] text-[#8896a8] truncate">@{user.username}</p>
            </div>
            <svg className="w-4 h-4 text-[#555] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </Link>

          <div className="h-px bg-[#232d3f]" />

          {/* Organizations section */}
          <div className="py-1.5">
            <p className="px-5 pt-2 pb-1 text-[10px] text-[#666] font-semibold uppercase tracking-wider">Organizations</p>
            {orgs.slice(0, 4).map(org => (
              <Link
                key={org.id}
                href={`/@${org.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-5 py-2 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors"
              >
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded bg-[#232d3f] flex items-center justify-center text-[9px] text-[#9ca3af] font-bold">
                    {(org.name || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="truncate">{org.name}</span>
                <span className="ml-auto text-[10px] text-[#555] bg-[#1a2030] px-1.5 py-0.5 rounded">{org.role}</span>
              </Link>
            ))}
            <Link
              href="/settings?tab=organization"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-5 py-2 text-[13px] text-[#9b7bf7] hover:text-[#b69aff] hover:bg-[#ffffff06] transition-colors"
            >
              <ion-icon name="add-circle-outline" style={{ fontSize: '16px' }} />
              {orgs.length > 0 ? 'Manage Organizations' : 'Create Organization'}
            </Link>
          </div>
          <div className="h-px bg-[#232d3f]" />

          {/* Main links */}
          <div className="py-1.5">
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="person-outline" style={{ fontSize: '16px', color: '#777' }} />
              Your Profile
            </Link>
            <Link href="/stories" onClick={() => setOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="book-outline" style={{ fontSize: '16px', color: '#777' }} />
              Your Stories
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="settings-outline" style={{ fontSize: '16px', color: '#777' }} />
              Settings
            </Link>
          </div>

          <div className="h-px bg-[#232d3f]" />

          {/* Secondary */}
          <div className="py-1.5">
            <Link href="/about" onClick={() => setOpen(false)} className="flex items-center gap-3 px-5 py-2 text-[13px] text-[#999] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="help-circle-outline" style={{ fontSize: '16px', color: '#666' }} />
              Help
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)} className="flex items-center gap-3 px-5 py-2 text-[13px] text-[#999] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="diamond-outline" style={{ fontSize: '16px', color: '#666' }} />
              Pricing
            </Link>
          </div>

          <div className="h-px bg-[#232d3f]" />

          {/* Sign out */}
          <div className="py-1.5">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-3 w-full px-5 py-2.5 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors"
            >
              <ion-icon name="log-out-outline" style={{ fontSize: '16px', color: '#777' }} />
              Sign out
            </button>
            <p className="px-5 pb-1.5 text-[10px] text-[#666] truncate">{user.email}</p>
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 bg-[#131922] flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#555]">
            <Link href="/about" className="hover:text-[#888] transition-colors">About</Link>
            <Link href="/blog" className="hover:text-[#888] transition-colors">Blog</Link>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

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
    <div className="min-h-screen bg-[#131922]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#131922]/95 backdrop-blur-md border-b border-[#232d3f]">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-cover bg-center" style={{ backgroundImage: "url(/logo.png)" }} />
              <span className="text-xl font-bold text-white tracking-tight font-kanit">LixBlogs</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href={user ? "/new-blog" : "/sign-in"} className="flex items-center gap-1.5 text-[14px] text-[#b0b0b0] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#ffffff08]">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Write
            </Link>
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-[#232d3f] animate-pulse" />
            ) : user ? (
              <ProfileDropdown user={user} logout={logout} />
            ) : (
              <>
                <button onClick={handleLogin} className="text-[14px] text-[#b0b0b0] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#ffffff08]">
                  Sign In
                </button>
                <button onClick={handleLogin} className="text-[14px] font-medium text-white bg-[#9b7bf7] hover:bg-[#b69aff] transition-colors px-4 py-1.5 rounded-full">
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
        <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-14 h-[calc(100vh-56px)] border-r border-[#232d3f] px-4 py-6 justify-between">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                    isActive
                      ? 'text-white bg-[#ffffff0a]'
                      : 'text-[#888] hover:text-[#c8c8c8] hover:bg-[#ffffff06]'
                  }`}
                >
                  <ion-icon name={item.icon} style={{ fontSize: '18px' }} />
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-3 border-t border-[#232d3f] pt-3">
              <Link
                href="/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                  pathname.startsWith('/settings')
                    ? 'text-white bg-[#ffffff0a]'
                    : 'text-[#888] hover:text-[#c8c8c8] hover:bg-[#ffffff06]'
                }`}
              >
                <ion-icon name="settings-outline" style={{ fontSize: '18px' }} />
                Settings
              </Link>
            </div>
          </nav>
          {user && (
            <div className="px-3 py-3 rounded-xl bg-[#141a26] border border-[#232d3f]">
              <div className="flex items-center gap-2.5">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[#2a2d3a] flex-shrink-0 flex items-center justify-center text-[13px] text-[#b0b0b0] font-medium">
                    {(user.display_name || user.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] text-[#e0e0e0] font-medium truncate">{user.display_name || user.username}</p>
                  <p className="text-[11px] text-[#8896a8] truncate">@{user.username}</p>
                </div>
              </div>
            </div>
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
