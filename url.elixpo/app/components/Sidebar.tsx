'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@/lib/types';

function getAvatarUrl(user: User): string {
  if (user.avatar_url) return user.avatar_url;
  return `https://accounts.elixpo.com/api/avatar/${user.elixpo_id}`;
}

// SVG Icons
const Icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="2" width="7" height="8" rx="1.5" />
      <rect x="11" y="2" width="7" height="5" rx="1.5" />
      <rect x="2" y="12" width="7" height="6" rx="1.5" />
      <rect x="11" y="9" width="7" height="9" rx="1.5" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M8.5 11.5a4 4 0 005.5 0l2.5-2.5a4 4 0 00-5.5-5.5L9.5 5" />
      <path d="M11.5 8.5a4 4 0 00-5.5 0L3.5 11a4 4 0 005.5 5.5l1.5-1.5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-[18px] h-[18px]">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 7v6M7 10h6" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="10" cy="7" r="3.5" />
      <path d="M3.5 17.5c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="7.5" cy="12.5" r="3.5" />
      <path d="M10.2 9.8L16 4M14 4l2 2M12.5 6.5l2 2" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="3" width="16" height="11" rx="2" />
      <path d="M7 17h6M10 14v3" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="7" cy="7" r="3" />
      <circle cx="14" cy="8" r="2.5" />
      <path d="M1.5 17c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <path d="M13 12c2 0 4 1.5 4 4" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <path d="M6 7h8M6 10h8M6 13h4" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <path d="M6 8l4 4 4-4" />
    </svg>
  ),
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { href: '/dashboard/urls', label: 'My URLs', icon: Icons.link },
  { href: '/dashboard/new', label: 'Shorten URL', icon: Icons.plus },
];

const accountItems = [
  { href: '/profile', label: 'Profile', icon: Icons.user },
  { href: '/profile/keys', label: 'API Keys', icon: Icons.key },
];

const adminItems = [
  { href: '/admin', label: 'Monitoring', icon: Icons.monitor },
  { href: '/admin/users', label: 'Users', icon: Icons.users },
  { href: '/admin/audit', label: 'Audit Log', icon: Icons.audit },
];

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const avatarUrl = getAvatarUrl(user);
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/profile' || href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const NavIcon = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
    <Link
      href={href}
      className={`relative group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 no-underline ${
        isActive(href)
          ? 'text-lime-main bg-[rgba(163,230,53,0.12)]'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-glass'
      }`}
    >
      <span className={isActive(href) ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}>
        {icon}
      </span>
      {/* Tooltip */}
      <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium rounded-md bg-[#1a2614] border border-border-light text-text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
        {label}
      </span>
    </Link>
  );

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border-light"
      style={{ background: 'rgba(16, 24, 12, 0.92)', backdropFilter: 'blur(20px)' }}
    >
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 no-underline shrink-0">
        <Image src="/logo.png" alt="ElixpoURL" width={26} height={26} className="rounded-lg" />
        <span className="text-base font-display font-bold text-text-primary hidden sm:inline">
          <span className="text-lime-main">Elixpo</span>URL
        </span>
      </Link>

      {/* Right: Nav icons + Account dropdown */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Main nav icons */}
        {navItems.map((item) => (
          <NavIcon key={item.href} {...item} />
        ))}

        {/* Admin icons */}
        {user.role === 'admin' && (
          <>
            <div className="w-px h-6 bg-border-light mx-1 sm:mx-2" />
            {adminItems.map((item) => (
              <NavIcon key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Divider before account */}
        <div className="w-px h-6 bg-border-light ml-1 sm:ml-2" />

        {/* Account dropdown */}
        <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setAccountOpen(!accountOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-glass transition-all duration-200 bg-transparent border-none cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-border-medium group-hover:border-lime-main/40 transition-colors">
            <img
              src={avatarUrl}
              alt={user.display_name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-sm text-text-primary hidden sm:inline max-w-[120px] truncate">
            {user.display_name}
          </span>
          <span className={`text-text-secondary transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}>
            {Icons.chevron}
          </span>
        </button>

        {/* Dropdown */}
        {accountOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border-light overflow-hidden shadow-xl z-50"
            style={{ background: 'rgba(16, 24, 12, 0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-border-light">
              <div className="text-sm font-medium text-text-primary truncate">{user.display_name}</div>
              <div className="text-[0.65rem] text-text-secondary truncate">{user.email}</div>
            </div>

            {/* Account links */}
            <div className="py-1.5">
              {accountItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setAccountOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 no-underline ${
                    isActive(item.href)
                      ? 'text-lime-main bg-[rgba(163,230,53,0.06)]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-glass'
                  }`}
                >
                  <span className={isActive(item.href) ? 'opacity-100' : 'opacity-50'}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Sign out */}
            <div className="border-t border-border-light py-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-[#f87171] hover:bg-bg-glass transition-all duration-150 cursor-pointer bg-transparent border-none text-left"
              >
                <span className="opacity-50">{Icons.logout}</span>
                Sign Out
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
