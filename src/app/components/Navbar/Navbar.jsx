'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    setSignedIn(isSignedIn());
    setUser(getUser());
    return () => window.removeEventListener('scroll', onScroll);
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
            <div className={styles.userWrap}>
              <button className={styles.userBtn} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <span className={styles.userAvatar}>
                  {(user?.displayName || 'U')[0].toUpperCase()}
                </span>
                <span className={styles.userName}>{user?.displayName || 'User'}</span>
              </button>
              {userMenuOpen && (
                <div className={styles.userMenu}>
                  <a href="/generate" className={styles.userMenuItem}>My Creations</a>
                  <button className={styles.userMenuItem} onClick={handleSignOut}>Sign Out</button>
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
              <button className={styles.signInBtn} onClick={handleSignOut}>Sign Out</button>
            ) : (
              <a href={getSignInUrl()} className={styles.signInBtn}>Sign In</a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
