'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar/Navbar';
import { isSignedIn, getUser, clearAuth } from '../lib/auth';
import styles from './Settings.module.css';

const INTERESTS = [
  'Advertising', 'Architecture', 'Art', 'Board Games', 'Education',
  'Fashion', 'Film / TV', 'Interior Design', 'Marketing',
  'Product Design', 'Stock Images', 'Video Games', 'Other',
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.push('/');
      return;
    }
    setUser(getUser());
    // Load saved interests
    const saved = localStorage.getItem('elixpo_interests');
    if (saved) setSelectedInterests(JSON.parse(saved));
  }, [router]);

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest];
      localStorage.setItem('elixpo_interests', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteAccount = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    clearAuth();
    localStorage.removeItem('elixpo_interests');
    localStorage.removeItem('elixpo_guest_usage');
    localStorage.removeItem('elixpo_guest_session');
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Personal Settings</h3>
              <a href="/settings" className={`${styles.sidebarItem} ${styles.sidebarActive}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Your Profile
              </a>
            </div>
          </aside>

          {/* Content */}
          <div className={styles.content}>
            <h1 className={styles.pageTitle}>Your Profile</h1>

            {/* Profile card */}
            <div className={styles.card}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Your Email</label>
                  <div className={styles.fieldValue}>{user.email || '—'}</div>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Your Username</label>
                  <div className={styles.fieldValue}>
                    <span className={styles.atSign}>@</span>
                    {user.displayName || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>What are your interests?</h2>
              <div className={styles.chipGrid}>
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    className={`${styles.chip} ${selectedInterests.includes(interest) ? styles.chipActive : ''}`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Delete account */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Delete Account</h2>
              <p className={styles.cardDesc}>
                Deleting your account will remove all of your information from our database. This cannot be undone.
              </p>
              <button
                className={styles.deleteBtn}
                onClick={handleDeleteAccount}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                {confirmDelete ? 'Confirm Delete' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
