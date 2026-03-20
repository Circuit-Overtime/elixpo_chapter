'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/pricing',
    label: 'Pricing',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M10 2v16M6 6l4-4 4 4M5 10h10" />
        <rect x="4" y="12" width="12" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/docs',
    label: 'Docs',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        <path d="M6 7h8M6 10h8M6 13h4" />
      </svg>
    ),
  },
  {
    href: '/profile/keys',
    label: 'API Keys',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="7.5" cy="12.5" r="3.5" />
        <path d="M10.2 9.8L16 4M14 4l2 2M12.5 6.5l2 2" />
      </svg>
    ),
  },
  {
    href: '/api/auth/login',
    label: 'Sign In',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="10" cy="7" r="3.5" />
        <path d="M3.5 17.5c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const [hovered, setHovered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <motion.nav
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center gap-1 px-2 py-2 rounded-full cursor-pointer"
        style={{
          background: 'rgba(16, 24, 12, 0.7)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(163, 230, 53, 0.12)',
          boxShadow: hovered
            ? '0 8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(163,230,53,0.06)'
            : '0 4px 24px rgba(0,0,0,0.4)',
          transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
          borderColor: hovered ? 'rgba(163, 230, 53, 0.25)' : 'rgba(163, 230, 53, 0.12)',
        }}
      >
        {/* Logo — always visible */}
        <Link href="/" className="flex items-center gap-2 no-underline px-2 py-1 shrink-0">
          <Image src="/logo.png" alt="ElixpoURL" width={26} height={26} className="rounded-lg" />
          <AnimatePresence>
            {hovered && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
                className="overflow-hidden whitespace-nowrap text-sm font-display font-bold text-text-primary"
              >
                <span className="text-lime-main">Elixpo</span>URL
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Divider */}
        <div
          className="w-px h-5 shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        />

        {/* Nav items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-2 no-underline px-2.5 py-1.5 rounded-full transition-colors duration-200 shrink-0"
              style={{
                color: isActive ? '#a3e635' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(163,230,53,0.1)' : 'transparent',
              }}
            >
              <span className="flex items-center justify-center w-4 h-4 shrink-0">
                {item.icon}
              </span>
              <AnimatePresence>
                {hovered && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
                    className="overflow-hidden whitespace-nowrap text-xs font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Divider */}
        <div
          className="w-px h-5 shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        />

        {/* CTA */}
        <Link
          href={isLoggedIn ? '/dashboard' : '/api/auth/login'}
          className="flex items-center gap-2 no-underline px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200"
          style={{
            background: 'rgba(163, 230, 53, 0.15)',
            color: '#a3e635',
            border: '1px solid rgba(163, 230, 53, 0.3)',
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M5 10h10M11 6l4 4-4 4" />
          </svg>
          <AnimatePresence>
            {hovered && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
                className="overflow-hidden whitespace-nowrap"
              >
                {isLoggedIn ? 'Dashboard' : 'Get Started'}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </motion.nav>
    </div>
  );
}
