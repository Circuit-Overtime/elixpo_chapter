'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/AppShell';
import Link from 'next/link';

const TABS = ['Collections', 'Saved', 'Read History'];

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-10 w-32 bg-[var(--bg-elevated)] animate-pulse rounded mb-8" />
          <div className="h-44 bg-[var(--bg-elevated)] animate-pulse rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign in to access your library</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">Your bookmarks, collections, and reading history will appear here.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-full text-sm hover:bg-[#b69aff] transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-[var(--text-muted)]xl font-bold text-[var(--text-primary)] mb-8">Library</h1>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--border-default)] mb-8">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`pb-3 text-[14px] font-medium border-b-2 transition-colors ${
                i === activeTab
                  ? 'text-[var(--text-primary)] border-white'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-body)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Collections Tab */}
        {activeTab === 0 && (
          <div>
            {/* Create collection CTA */}
            <div className="relative flex items-center w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden p-8 mb-8">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Create a collection to easily categorize and share posts
                </h2>
                <button className="mt-3 px-5 py-2 text-[13px] font-medium text-[var(--text-primary)] bg-[#9b7bf7] hover:bg-[#b69aff] rounded-full transition-colors">
                  Start a collection
                </button>
              </div>
              <div className="hidden sm:flex items-center justify-center w-24 h-24 rounded-full bg-[var(--bg-elevated)] ml-8 flex-shrink-0">
                <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
            </div>

            {/* Empty state */}
            <div className="text-[var(--text-muted)]enter py-12">
              <p className="text-[var(--text-muted)] text-sm">No collections yet.</p>
            </div>
          </div>
        )}

        {/* Saved Tab */}
        {activeTab === 1 && (
          <div className="text-[var(--text-muted)]enter py-16">
            <p className="text-[var(--text-muted)] text-sm">No saved posts yet. Bookmark posts to see them here.</p>
          </div>
        )}

        {/* Read History Tab */}
        {activeTab === 2 && (
          <div className="text-[var(--text-muted)]enter py-16">
            <p className="text-[var(--text-muted)] text-sm">Your reading history will appear here.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
