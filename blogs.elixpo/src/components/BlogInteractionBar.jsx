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

  const [likeAnim, setLikeAnim] = useState(false);

  const toggleLike = async () => {
    if (!user) return;
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
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

  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);

  useEffect(() => {
    if (!shareOpen) return;
    const handleClick = (e) => { if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shareOpen]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShareOpen(false);
  };

  const copyEmbed = () => {
    const url = window.location.href;
    const code = `<iframe src="${url}?embed=1" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code).catch(() => {});
    setShareOpen(false);
  };

  const copyMarkdown = () => {
    const url = window.location.href;
    const md = `[${document.title || 'Blog post'}](${url})`;
    navigator.clipboard.writeText(md).catch(() => {});
    setShareOpen(false);
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium"
          style={{
            color: interactions.liked ? '#f87171' : 'var(--text-muted)',
            backgroundColor: interactions.liked ? '#f8717110' : 'transparent',
            transform: likeAnim ? 'scale(1.25)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s, background-color 0.15s',
          }}
          title={interactions.liked ? 'Unlike' : 'Like'}
        >
          <ion-icon name={interactions.liked ? 'heart' : 'heart-outline'} style={{ fontSize: '18px' }} />
          {interactions.likeCount > 0 && <span>{fmt(interactions.likeCount)}</span>}
        </button>

        {/* Clap */}
        <button
          onClick={addClap}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium"
          style={{
            color: interactions.userClaps > 0 ? '#9b7bf7' : 'var(--text-muted)',
            backgroundColor: interactions.userClaps > 0 ? '#9b7bf710' : 'transparent',
            transform: clapAnim ? 'scale(1.3) rotate(-8deg)' : 'scale(1) rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s, background-color 0.15s',
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

        {/* Share dropdown */}
        <div className="relative" ref={shareRef}>
          <button
            onClick={() => setShareOpen(!shareOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all"
            style={{ color: 'var(--text-muted)' }}
            title="Share"
          >
            <ion-icon name="share-outline" style={{ fontSize: '18px' }} />
          </button>
          {shareOpen && (
            <div className="absolute bottom-full mb-2 right-0 w-[200px] rounded-xl shadow-xl z-50 overflow-hidden py-1" style={{ backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)' }}>
              <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors text-left" style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ion-icon name="link-outline" style={{ fontSize: '16px', color: 'var(--text-faint)' }} />
                Copy link
              </button>
              <button onClick={copyEmbed} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors text-left" style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ion-icon name="code-slash-outline" style={{ fontSize: '16px', color: 'var(--text-faint)' }} />
                Embed
              </button>
              <button onClick={copyMarkdown} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors text-left" style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ion-icon name="document-text-outline" style={{ fontSize: '16px', color: 'var(--text-faint)' }} />
                Copy Markdown
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
