'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * BlogInteractionBar — renders at the bottom of a blog post.
 * Handles: view recording, read progress, likes, claps, bookmarks, share.
 * Also reports dwell time as a taste signal.
 */
export default function BlogInteractionBar({ blogId }) {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState(null);
  const [clapAnim, setClapAnim] = useState(false);
  const startTime = useRef(Date.now());
  const progressReported = useRef(0);

  // Fetch interaction state
  useEffect(() => {
    if (!blogId) return;
    fetch(`/api/blogs/${blogId}/interactions`)
      .then(r => r.json())
      .then(setInteractions)
      .catch(() => {});
  }, [blogId]);

  // Record view on mount
  useEffect(() => {
    if (!blogId) return;
    fetch(`/api/blogs/${blogId}/view`, { method: 'POST' }).catch(() => {});
  }, [blogId]);

  // Track scroll progress + report dwell time on unmount
  useEffect(() => {
    if (!blogId || !user) return;

    const reportProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const progress = Math.min(1, Math.max(0, scrollTop / docHeight));

      // Only report if progress increased by at least 10%
      if (progress - progressReported.current >= 0.1) {
        progressReported.current = progress;
        fetch(`/api/blogs/${blogId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: Math.round(progress * 100) / 100 }),
        }).catch(() => {});
      }
    };

    const interval = setInterval(reportProgress, 5000);
    window.addEventListener('scroll', reportProgress, { passive: true });

    // Report dwell time on unmount
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', reportProgress);
      const dwellSeconds = Math.floor((Date.now() - startTime.current) / 1000);
      if (dwellSeconds > 10) {
        try {
          const blob = new Blob([JSON.stringify({ blogId, dwellSeconds })], { type: 'application/json' });
          navigator.sendBeacon(`/api/blogs/${blogId}/progress`, blob);
        } catch {}
      }
    };
  }, [blogId, user]);

  const toggleLike = async () => {
    if (!user) return;
    const res = await fetch(`/api/blogs/${blogId}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setInteractions(prev => prev ? { ...prev, liked: data.liked, likeCount: data.count } : prev);
    }
  };

  const addClap = async () => {
    if (!user) return;
    setClapAnim(true);
    setTimeout(() => setClapAnim(false), 300);
    const res = await fetch(`/api/blogs/${blogId}/clap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 1 }),
    });
    if (res.ok) {
      const data = await res.json();
      setInteractions(prev => prev ? { ...prev, userClaps: data.userClaps, totalClaps: data.totalClaps } : prev);
    }
  };

  const toggleBookmark = async () => {
    if (!user) return;
    if (interactions?.bookmarked) {
      await fetch(`/api/library/bookmarks/${blogId}`, { method: 'DELETE' });
      setInteractions(prev => prev ? { ...prev, bookmarked: false } : prev);
    } else {
      await fetch('/api/library/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      });
      setInteractions(prev => prev ? { ...prev, bookmarked: true } : prev);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  if (!interactions) return null;

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="flex items-center justify-between py-4 mt-8" style={{ borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)' }}>
      {/* Left — engagement actions */}
      <div className="flex items-center gap-1">
        {/* Like */}
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-all"
          style={{
            color: interactions.liked ? '#f87171' : 'var(--text-muted)',
            backgroundColor: interactions.liked ? '#f8717110' : 'transparent',
          }}
          title={interactions.liked ? 'Unlike' : 'Like'}
        >
          <ion-icon name={interactions.liked ? 'heart' : 'heart-outline'} style={{ fontSize: '18px' }} />
          {interactions.likeCount > 0 && <span>{fmt(interactions.likeCount)}</span>}
        </button>

        {/* Clap */}
        <button
          onClick={addClap}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-all"
          style={{
            color: interactions.userClaps > 0 ? '#9b7bf7' : 'var(--text-muted)',
            backgroundColor: interactions.userClaps > 0 ? '#9b7bf710' : 'transparent',
            transform: clapAnim ? 'scale(1.15)' : 'scale(1)',
          }}
          title={`Clap (${interactions.userClaps}/50)`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 11l4-8 1.5 2L17 3l-2 8h4l-8 13 1-6H7z"/>
          </svg>
          {interactions.totalClaps > 0 && <span>{fmt(interactions.totalClaps)}</span>}
        </button>

        {/* Comments count */}
        <div className="flex items-center gap-1.5 px-3 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <ion-icon name="chatbubble-outline" style={{ fontSize: '17px' }} />
          {interactions.commentCount > 0 && <span>{fmt(interactions.commentCount)}</span>}
        </div>
      </div>

      {/* Right — utility actions */}
      <div className="flex items-center gap-1">
        {/* Views */}
        <div className="flex items-center gap-1.5 px-3 py-2 text-[13px]" style={{ color: 'var(--text-faint)' }}>
          <ion-icon name="eye-outline" style={{ fontSize: '16px' }} />
          <span>{fmt(interactions.viewCount)}</span>
        </div>

        {/* Bookmark */}
        <button
          onClick={toggleBookmark}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all"
          style={{ color: interactions.bookmarked ? '#9b7bf7' : 'var(--text-muted)' }}
          title={interactions.bookmarked ? 'Remove from library' : 'Save to library'}
        >
          <ion-icon name={interactions.bookmarked ? 'bookmark' : 'bookmark-outline'} style={{ fontSize: '18px' }} />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all"
          style={{ color: 'var(--text-muted)' }}
          title="Share"
        >
          <ion-icon name="share-outline" style={{ fontSize: '18px' }} />
        </button>
      </div>
    </div>
  );
}
