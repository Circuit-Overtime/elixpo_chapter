'use client';

import { useState, useEffect, useRef } from 'react';
import { getSignInUrl, isSignedIn, getUser, clearAuth } from '../../lib/auth';
import styles from './Navbar.module.css';

const navLinks = [
  { label: 'Create', href: '/generate' },
  { label: 'Blueprints', href: '/blueprints' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Pricing', href: '/pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
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
              {link.label}
            </a>
          ))}
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
                  <a href="/creations" className={styles.menuItem}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    My Creations
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
