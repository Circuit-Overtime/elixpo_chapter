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
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initial = (user.display_name || user.username || '?')[0].toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-1 py-1 rounded-full hover:bg-[#ffffff08] transition-colors"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-[#2a2d3a] flex items-center justify-center text-[13px] text-[#b0b0b0] font-medium">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[264px] bg-[#0d1117] border border-[#1a1d27] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User info header */}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-5 py-4 hover:bg-[#ffffff06] transition-colors"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-[#2a2d3a] flex-shrink-0 flex items-center justify-center text-lg text-[#b0b0b0] font-medium">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[14px] text-[#e8e8e8] font-semibold truncate">{user.display_name || user.username}</p>
              <p className="text-[12px] text-[#9b7bf7] mt-0.5">View profile</p>
            </div>
          </Link>

          <div className="h-px bg-[#1a1d27]" />

          {/* Main links */}
          <div className="py-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors"
            >
              <ion-icon name="settings-outline" style={{ fontSize: '18px', color: '#888' }} />
              Settings
            </Link>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors"
            >
              <ion-icon name="help-circle-outline" style={{ fontSize: '18px', color: '#888' }} />
              Help
            </Link>
          </div>

          <div className="h-px bg-[#1a1d27]" />

          {/* Pricing */}
          <div className="py-1.5">
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors"
            >
              <ion-icon name="diamond-outline" style={{ fontSize: '18px', color: '#888' }} />
              Pricing
            </Link>
          </div>

          <div className="h-px bg-[#1a1d27]" />

          {/* Sign out */}
          <div className="py-1.5">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-3 w-full px-5 py-2.5 text-[14px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors"
            >
              <ion-icon name="log-out-outline" style={{ fontSize: '18px', color: '#888' }} />
              Sign out
            </button>
            <p className="px-5 pb-1 text-[11px] text-[#555] truncate">{user.email}</p>
          </div>

          <div className="h-px bg-[#1a1d27]" />

          {/* Footer links */}
          <div className="px-5 py-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#555]">
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
    <div className="min-h-screen bg-[#030712]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#030712]/95 backdrop-blur-md border-b border-[#1a1d27]">
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
              <div className="h-8 w-8 rounded-full bg-[#1a1d27] animate-pulse" />
            ) : user ? (
              <ProfileDropdown user={user} logout={logout} />
            ) : (
              <>
                <button onClick={handleLogin} className="text-[14px] text-[#b0b0b0] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#ffffff08]">
                  Sign In
                </button>
                <button onClick={handleLogin} className="text-[14px] font-medium text-[#030712] bg-[#e8e8e8] hover:bg-white transition-colors px-4 py-1.5 rounded-full">
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
        <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-14 h-[calc(100vh-56px)] border-r border-[#1a1d27] px-4 py-6 justify-between">
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
            <div className="mt-3 border-t border-[#1a1d27] pt-3">
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
            <div className="px-3 py-3 rounded-xl bg-[#0d1117] border border-[#1a1d27]">
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
                  <p className="text-[11px] text-[#666] truncate">@{user.username}</p>
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
