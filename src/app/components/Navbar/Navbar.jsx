'use client';

import { useState, useEffect, useRef } from 'react';
import { getSignInUrl, isSignedIn, getUser, clearAuth } from '../../lib/auth';
import styles from './Navbar.module.css';

const navLinks = [
  {
    label: 'Create', href: '/generate',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>,
  },
  {
    label: 'Blueprints', href: '/blueprints',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    label: 'Library', href: '/library',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>,
  },
  {
    label: 'Pricing', href: '/pricing',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  },
  {
    label: 'Blog', href: '/blogs',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>,
  },
];

const moreItems = [
  {
    label: 'Canvas Editor', href: '/generate', desc: 'Edit and refine AI creations',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
  },
  {
    label: 'Flow State', href: '/generate', desc: 'Spawn continuous images',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  },
  {
    label: 'Learn', href: '/blogs', desc: 'Tutorials and walkthroughs',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>,
  },
  {
    label: 'FAQ and Help', href: '/pricing', desc: 'Find answers and get support',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const moreRef = useRef(null);

  const checkAuth = () => {
    setSignedIn(isSignedIn());
    setUser(getUser());
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Check auth on mount
    checkAuth();

    // Re-check when localStorage changes (e.g. after callback saves auth)
    const onStorage = (e) => {
      if (e.key === 'elixpo_auth') checkAuth();
    };
    window.addEventListener('storage', onStorage);

    // Also poll briefly in case of same-tab navigation from callback
    const interval = setInterval(checkAuth, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    clearAuth();
    setSignedIn(false);
    setUser(null);
    setUserMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand}>
          <img src="/logo.png" alt="Elixpo" className={styles.logo} />
          <span className={styles.brandName}>Elixpo Art</span>
        </a>

        <div className={styles.links}>
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className={styles.link}>
              {link.icon}
              {link.label}
            </a>
          ))}
          <div className={styles.moreWrap} ref={moreRef}>
            <button className={styles.link} onClick={() => setMoreOpen(!moreOpen)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
              </svg>
              More
            </button>
            {moreOpen && (
              <div className={styles.morePanel}>
                {moreItems.map((item) => (
                  <a key={item.label} href={item.href} className={styles.moreItem} onClick={() => setMoreOpen(false)}>
                    <span className={styles.moreIcon}>{item.icon}</span>
                    <div className={styles.moreText}>
                      <span className={styles.moreLabel}>{item.label}</span>
                      <span className={styles.moreDesc}>{item.desc}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {signedIn ? (
            <div className={styles.userWrap} ref={menuRef}>
              <button className={styles.pfpBtn} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <span className={styles.pfp}>
                  {(user?.displayName || 'U')[0].toUpperCase()}
                </span>
              </button>

              {userMenuOpen && (
                <div className={styles.userMenu}>
                  {/* User info header */}
                  <div className={styles.userHeader}>
                    <span className={styles.pfpLarge}>
                      {(user?.displayName || 'U')[0].toUpperCase()}
                    </span>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{user?.displayName || 'User'}</span>
                      <span className={styles.userEmail}>{user?.email || ''}</span>
                    </div>
                  </div>

                  <div className={styles.menuDivider} />

                  <a href="/settings" className={styles.menuItem}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Settings
                  </a>
                  <a href="/library" className={styles.menuItem}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    My Library
                  </a>

                  <div className={styles.menuDivider} />

                  <button className={styles.menuItem} onClick={handleSignOut}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href={getSignInUrl()} className={styles.signInBtn}>Sign In</a>
          )}
        </div>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.open : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className={styles.mobileLink}>
              {link.label}
            </a>
          ))}
          <div className={styles.mobileActions}>
            {signedIn ? (
              <>
                <a href="/settings" className={styles.mobileLink}>Settings</a>
                <button className={styles.signInBtn} onClick={handleSignOut}>Sign Out</button>
              </>
            ) : (
              <a href={getSignInUrl()} className={styles.signInBtn}>Sign In</a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
