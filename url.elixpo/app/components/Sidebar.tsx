'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@/lib/types';

// Build avatar URL from Elixpo Accounts
function getAvatarUrl(user: User): string {
  if (user.avatar_url) return user.avatar_url;
  // Elixpo Accounts serves profile pictures at this endpoint
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

  const NavLink = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-200 no-underline ${
        isActive(href)
          ? 'text-lime-main border-r-2 border-lime-main'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-glass'
      }`}
      style={isActive(href) ? { background: 'rgba(163, 230, 53, 0.06)' } : {}}
    >
      <span className={`w-5 flex items-center justify-center ${isActive(href) ? 'opacity-100' : 'opacity-50'}`}>
        {icon}
      </span>
      {label}
    </Link>
  );

  return (
    <aside
      className="w-60 fixed top-0 left-0 bottom-0 flex flex-col border-r border-border-light z-20"
      style={{ background: 'rgba(16, 24, 12, 0.6)', backdropFilter: 'blur(20px)' }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-8">
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <Image src="/logo.png" alt="ElixpoURL" width={28} height={28} className="rounded-lg" />
          <span className="text-lg font-display font-bold text-text-primary">
            <span className="text-lime-main">Elixpo</span>URL
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        <div className="px-5 pt-6 pb-2 text-[0.6rem] text-text-disabled uppercase tracking-widest font-medium">
          Account
        </div>
        {accountItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
        {/* Sign out as a nav item */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-text-secondary hover:text-[#f87171] hover:bg-bg-glass transition-all duration-200 cursor-pointer bg-transparent border-none text-left"
        >
          <span className="w-5 flex items-center justify-center opacity-50">
            {Icons.logout}
          </span>
          Sign Out
        </button>

        {user.role === 'admin' && (
          <>
            <div className="px-5 pt-6 pb-2 text-[0.6rem] text-text-disabled uppercase tracking-widest font-medium">
              Admin
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-border-light">
        <Link href="/profile" className="flex items-center gap-3 no-underline group">
          {/* Avatar from Elixpo Accounts */}
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105 border border-border-medium">
            <img
              src={avatarUrl}
              alt={user.display_name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate group-hover:text-lime-main transition-colors">
              {user.display_name}
            </div>
            <div className="text-[0.65rem] text-text-secondary truncate">
              {user.email}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
