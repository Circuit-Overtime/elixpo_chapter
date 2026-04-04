'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import TabBar from '../components/TabBar';
import Link from 'next/link';

const TABS = [
  { label: 'Drafts', icon: 'document-outline' },
  { label: 'Published', icon: 'globe-outline' },
];

function StoryCard({ story, onDelete }) {
  const isDraft = story.status === 'draft';
  const editUrl = `/edit/${story.slugid || story.id}`;

  return (
    <article className="flex gap-5 py-6 border-b border-[var(--border-default)] last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {isDraft && (
            <span className="text-[11px] font-medium text-[#e8a840] bg-[#e8a84014] px-2 py-0.5 rounded-full">Draft</span>
          )}
          {story.status === 'unlisted' && (
            <span className="text-[11px] font-medium text-[#60a5fa] bg-[#60a5fa14] px-2 py-0.5 rounded-full">Beta</span>
          )}
          {!isDraft && story.published_at && (
            <span className="text-[12px] text-[var(--text-muted)]">
              {new Date(story.published_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {isDraft && story.updated_at && (
            <span className="text-[12px] text-[var(--text-faint)]">
              Edited {new Date(story.updated_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <Link href={editUrl}>
          <h3 className="text-[17px] font-bold text-[#e8e8e8] leading-[1.35] mb-1 font-serif hover:text-[var(--text-primary)] transition-colors">
            {story.title || 'Untitled'}
          </h3>
        </Link>
        {story.subtitle && (
          <p className="text-[14px] text-[var(--text-muted)] line-clamp-2 mb-3">{story.subtitle}</p>
        )}
        <div className="flex items-center gap-4 text-[13px] text-[var(--text-muted)]">
          {!isDraft && (
            <>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {story.views || 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {story.likes || 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {story.comments || 0}
              </span>
            </>
          )}
          {story.read_time_minutes > 0 && (
            <span>{story.read_time_minutes} min read</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <Link href={editUrl} className="hover:text-[var(--text-body)] transition-colors p-1" title="Edit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </Link>
            <button onClick={() => onDelete?.(story)} className="hover:text-red-400 transition-colors p-1" title="Delete">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </span>
        </div>
      </div>
    </article>
  );
}

export default function StoriesPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/blogs/list')
      .then(r => r.ok ? r.json() : { blogs: [] })
      .then(d => setBlogs(d.blogs || []))
      .catch(() => {})
      .finally(() => setBlogsLoading(false));
  }, [user]);

  const drafts = blogs.filter(b => b.status === 'draft');
  const published = blogs.filter(b => b.status === 'published' || b.status === 'unlisted');
  const stories = activeTab === 0 ? drafts : published;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-10 w-32 bg-[var(--bg-elevated)] animate-pulse rounded mb-8" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--bg-elevated)] animate-pulse rounded mb-4" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign in to see your stories</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">Your drafts and published posts will appear here.</p>
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[var(--text-muted)]xl font-bold text-[var(--text-primary)]">Your Stories</h1>
          <Link
            href="/new-blog"
            className="px-5 py-2 text-[13px] font-medium text-[var(--text-primary)] bg-[#9b7bf7] hover:bg-[#b69aff] rounded-full transition-colors"
          >
            Write a story
          </Link>
        </div>

        <TabBar
          tabs={TABS.map((t, i) => ({ ...t, count: i === 0 ? drafts.length : published.length }))}
          active={activeTab}
          onChange={setActiveTab}
        />

        {blogsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[var(--bg-elevated)] animate-pulse rounded" />)}
          </div>
        ) : stories.length > 0 ? (
          <div>
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-16 h-16 text-[#232d3f] mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {activeTab === 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              )}
            </svg>
            <p className="text-[var(--text-muted)] text-[15px] font-medium mb-1.5">
              {activeTab === 0 ? 'No drafts yet' : 'No published stories yet'}
            </p>
            <p className="text-[var(--text-muted)] text-[13px] mb-6">
              {activeTab === 0 ? 'Start writing and your drafts will show up here.' : 'Once you publish a story, it will appear here.'}
            </p>
            <Link href="/new-blog" className="px-5 py-2 text-[13px] font-medium text-[var(--text-primary)] bg-[#9b7bf7] hover:bg-[#b69aff] rounded-full transition-colors">
              Write a story
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
