'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand}>
          <img
            src="/logo.png"
            alt="Elixpo"
            className={styles.logo}
          />
          <span className={styles.brandName}>Elixpo Art</span>
        </a>

        {/* Desktop links */}
        <div className={styles.links}>
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className={styles.link}>
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <a href="/learn" className={styles.tutorialBtn}>Tutorial</a>
          <a href="/auth/signin" className={styles.signInBtn}>Sign In</a>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`${styles.hamburger} ${menuOpen ? styles.open : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className={styles.mobileLink}>
              {link.label}
            </a>
          ))}
          <div className={styles.mobileActions}>
            <a href="/auth/signin" className={styles.signInBtn}>Sign In</a>
          </div>
        </div>
      )}
    </nav>
  );
}
