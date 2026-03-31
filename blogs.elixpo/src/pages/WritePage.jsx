'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import '../styles/editor/editor.css';
import { compressCoverImage } from '../utils/compressImage';

function AvatarImg({ src, name, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?')[0].toUpperCase();
  if (src && !failed) {
    return <img src={src} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} onError={() => setFailed(true)} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold"
      style={{ width: size, height: size, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: Math.round(size * 0.38) }}>
      {initial}
    </div>
  );
}

const BlockNoteEditor = dynamic(
  () => import('../components/Editor/BlogEditor'),
  { ssr: false }
);

const BlogPreview = dynamic(
  () => import('../components/Editor/BlogPreview'),
  { ssr: false }
);

const BlogCodeView = dynamic(
  () => import('../components/Editor/BlogCodeView'),
  { ssr: false }
);

const CoverUploadModal = dynamic(
  () => import('../components/Editor/CoverUploadModal'),
  { ssr: false }
);

const EmojiPicker = dynamic(
  () => import('../components/Editor/EmojiPicker'),
  { ssr: false }
);

const KeyboardShortcutsModal = dynamic(
  () => import('../components/Editor/KeyboardShortcutsModal'),
  { ssr: false }
);

const STORAGE_KEY_PREFIX = 'lixblogs_draft_';

function getDraftKey(slugid) {
  return STORAGE_KEY_PREFIX + (slugid || 'new');
}

function loadDraft(slugid) {
  try {
    const raw = localStorage.getItem(getDraftKey(slugid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(slugid, data) {
  try {
    localStorage.setItem(getDraftKey(slugid), JSON.stringify({
      ...data,
      savedAt: Date.now(),
    }));
  } catch { /* storage full */ }
}

function generateBlogId() {
  // Short 8-char alphanumeric ID
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function truncateSlug(s, max = 18) {
  return s && s.length > max ? s.slice(0, max) + '...' : s;
}

// ── Profile Dropdown (header) ──
function HeaderProfileDropdown({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initial = (user.display_name || user.username || '?')[0].toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="rounded-full hover:ring-2 hover:ring-[var(--border-default)] transition-all">
        <AvatarImg src={user.avatar_url} name={user.display_name || user.username} size={32} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[240px] rounded-xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)' }}>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
            <AvatarImg src={user.avatar_url} name={user.display_name || user.username} size={36} />
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--text-primary)] font-semibold truncate">{user.display_name || user.username}</p>
              <p className="text-[11px] text-[#9b7bf7]">View profile</p>
            </div>
          </Link>
          <div className="h-px bg-[var(--bg-elevated)]" />
          <div className="py-1">
            <Link href="/stories" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
              <ion-icon name="book-outline" style={{ fontSize: '16px', color: '#888' }} />
              Your Stories
            </Link>
            <Link href="/stats" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
              <ion-icon name="stats-chart-outline" style={{ fontSize: '16px', color: '#888' }} />
              Stats
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
              <ion-icon name="settings-outline" style={{ fontSize: '16px', color: '#888' }} />
              Settings
            </Link>
          </div>
          <div className="h-px bg-[var(--bg-elevated)]" />
          <div className="py-1">
            <button onClick={() => { setOpen(false); logout(); }} className="flex items-center gap-3 w-full px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
              <ion-icon name="log-out-outline" style={{ fontSize: '16px', color: '#888' }} />
              Sign out
            </button>
            <p className="px-4 pb-1.5 text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hamburger Menu ──
function HamburgerMenu({ onShareDraft, onChangeCover, onChangeTitle, onChangeTopics, onRevisionHistory, onMoreSettings }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const items = [
    { label: 'Copy publishable link', action: onShareDraft, icon: 'link-outline' },
    { label: 'Change featured image', action: onChangeCover, icon: 'image-outline' },
    { label: 'Change display title', action: onChangeTitle, icon: 'text-outline' },
    { label: 'Change topics', action: onChangeTopics, icon: 'pricetags-outline' },
    { label: 'More settings', action: onMoreSettings, icon: 'options-outline' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center hover:border-[var(--border-hover)] transition-colors"
      >
        <ion-icon name="ellipsis-horizontal" style={{ color: '#888', fontSize: '16px' }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[260px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Menu caret */}
          <div className="absolute -top-[6px] right-3 w-3 h-3 bg-[var(--bg-surface)] border-l border-t border-[var(--border-default)] rotate-45" />
          <div className="py-1.5 relative">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action?.(); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <ion-icon name={item.icon} style={{ fontSize: '15px' }} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="h-px bg-[var(--bg-elevated)]" />
          <div className="py-1.5">
            <button
              onClick={() => { setOpen(false); document.querySelector('[data-shortcuts-btn]')?.click(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round"><rect x="48" y="128" width="416" height="256" rx="48" ry="48"/><path d="M160 304h192"/><path d="M160 240h16m48 0h16m48 0h16m48 0h16"/><path d="M160 176h16m48 0h16m48 0h16m48 0h16"/></svg>
              Keyboard shortcuts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main WritePage ──
export default function WritePage({ slugid }) {
  const { user, logout } = useAuth();
  const editorRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const [mode, setMode] = useState('edit');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [publishAs, setPublishAs] = useState('personal');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverUrlMode, setCoverUrlMode] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pageEmoji, setPageEmoji] = useState(null);
  const [editorContent, setEditorContent] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftLoading, setDraftLoading] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [aiTitleKey, setAiTitleKey] = useState(0);
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverPos, setCoverPos] = useState({ x: 50, y: 50 });
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const coverDragStart = useRef({ x: 0, y: 0, posX: 50, posY: 50 });

  const [syncStatus, setSyncStatus] = useState('idle'); // idle | local | syncing | synced
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [pageColor, setPageColor] = useState(null);
  const [slug, setSlug] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [collaborators, setCollaborators] = useState([]);
  const [inviteError, setInviteError] = useState('');
  const ownerDropdownRef = useRef(null);

  const username = user?.username || 'you';

  // Refs to always hold latest draft data (avoids stale closures in intervals/beforeunload)
  const draftDataRef = useRef({ title, subtitle, tags, publishAs, coverPreview, editorContent, pageEmoji });
  useEffect(() => {
    draftDataRef.current = { title, subtitle, tags, publishAs, coverPreview, editorContent, pageEmoji };
  }, [title, subtitle, tags, publishAs, coverPreview, editorContent, pageEmoji]);

  // Cloud sync function — saves localStorage then pushes to cloud
  const syncToCloud = useCallback(async ({ showToast = false, silent = false } = {}) => {
    const data = draftDataRef.current;
    if (!data.title && !data.editorContent) return;

    // Always save to localStorage first
    saveDraft(slugid, data);
    setLastSaved(Date.now());

    if (!silent) setSyncStatus('syncing');

    try {
      const res = await fetch('/api/blogs/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugid, ...data }),
      });

      if (res.ok) {
        if (!silent) {
          setSyncStatus('synced');
          if (showToast) {
            setShowSavedToast(true);
            setTimeout(() => setShowSavedToast(false), 3000);
          }
          setTimeout(() => setSyncStatus('idle'), 5000);
        }
      } else {
        if (!silent) {
          setSyncStatus('local');
          setTimeout(() => setSyncStatus('idle'), 5000);
        }
      }
    } catch {
      if (!silent) {
        setSyncStatus('local');
        setTimeout(() => setSyncStatus('idle'), 5000);
      }
    }
  }, [slugid]);

  // Ctrl+S → save + sync
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        syncToCloud({ showToast: true });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [syncToCloud]);

  // Auto-sync to cloud every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      syncToCloud({ silent: true });
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncToCloud]);

  // Sync on page load (after draft loads)
  useEffect(() => {
    if (!draftLoading) {
      // Small delay to let editor content settle
      const timer = setTimeout(() => syncToCloud({ silent: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [draftLoading, syncToCloud]);

  // Sync before page unload
  useEffect(() => {
    function handleBeforeUnload() {
      const data = draftDataRef.current;
      if (!data.title && !data.editorContent) return;
      saveDraft(slugid, data);
      // Use sendBeacon with Blob for reliable fire-and-forget on unload
      try {
        const blob = new Blob([JSON.stringify({ slugid, ...data })], { type: 'application/json' });
        navigator.sendBeacon('/api/blogs/draft', blob);
      } catch { /* best effort */ }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [slugid]);

  useEffect(() => {
    // Small delay to show skeleton and let the UI mount before heavy JSON parsing
    const timer = setTimeout(() => {
      const draft = loadDraft(slugid);
      if (draft) {
        if (draft.title) setTitle(draft.title);
        if (draft.subtitle) setSubtitle(draft.subtitle);
        if (draft.tags) setTags(draft.tags);
        if (draft.publishAs) setPublishAs(draft.publishAs);
        if (draft.coverPreview) setCoverPreview(draft.coverPreview);
        if (draft.editorContent) setEditorContent(draft.editorContent);
        if (draft.pageEmoji) setPageEmoji(draft.pageEmoji);
        if (draft.savedAt) setLastSaved(draft.savedAt);
      }
      setDraftLoading(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [slugid]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (title || editorContent) {
        saveDraft(slugid, { title, subtitle, tags, publishAs, coverPreview, editorContent, pageEmoji });
        setLastSaved(Date.now());
      }
    }, 5000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [title, subtitle, tags, publishAs, coverPreview, editorContent, pageEmoji, slugid]);

  const handleCoverSelect = (dataUrl) => {
    setCoverPreview(dataUrl);
    fetch(dataUrl).then(r => r.blob()).then(blob => setCoverImage(blob));
  };

  const removeCover = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  const handleEditorChange = useCallback((blocks) => {
    setEditorContent(blocks);
    const text = blocks
      .map((b) => (b.content && Array.isArray(b.content)) ? b.content.map((c) => c.text || '').join('') : '')
      .join(' ');
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
  }, []);

  const [previewBlocks, setPreviewBlocks] = useState([]);

  const switchMode = useCallback(async (newMode) => {
    if (newMode !== 'edit' && editorRef.current) {
      try {
        const [html, md] = await Promise.all([editorRef.current.getHTML(), editorRef.current.getMarkdown()]);
        setPreviewHtml(html);
        setMarkdown(md);
        if (editorRef.current.getBlocks) {
          setPreviewBlocks(editorRef.current.getBlocks());
        }
      } catch { /* not ready */ }
    }
    setMode(newMode);
  }, []);

  // Ctrl+Shift+P → toggle edit/preview
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        switchMode(mode === 'edit' ? 'preview' : 'edit');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [switchMode, mode]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!title.trim()) { setSlug(''); return; }
    const generated = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60)
      .replace(/^-|-$/g, '');
    setSlug(generated || slugid);
  }, [title, slugid]);

  // Load collaborators
  useEffect(() => {
    if (!slugid) return;
    fetch(`/api/blogs/invite?slugid=${slugid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.collaborators) setCollaborators(d.collaborators); })
      .catch(() => {});
  }, [slugid]);

  // Close owner dropdown on outside click
  useEffect(() => {
    if (!showOwnerDropdown) return;
    function handleClick(e) {
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(e.target)) setShowOwnerDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showOwnerDropdown]);

  const handleSaveDraft = async () => {
    saveDraft(slugid, { title, subtitle, tags, publishAs, coverPreview, editorContent, pageEmoji });
    setLastSaved(Date.now());
    setShowPublishMenu(false);
    syncToCloud({ showToast: true });
  };

  const handlePublish = async () => {
    if (!title.trim() || publishing) return;
    setPublishing(true);
    setShowPublishMenu(false);
    try {
      const res = await fetch('/api/blogs/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugid, title, subtitle, tags, publishAs, editorContent, pageEmoji, status: 'published' }),
      });
      if (res.ok) {
        setShowPublishPanel(false);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 3000);
      }
    } catch { /* silent */ }
    setPublishing(false);
  };

  const handlePublishBeta = async () => {
    if (!title.trim() || publishing) return;
    setPublishing(true);
    setShowPublishMenu(false);
    try {
      await fetch('/api/blogs/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugid, title, subtitle, tags, publishAs, editorContent, pageEmoji, status: 'unlisted' }),
      });
      setShowPublishPanel(false);
    } catch { /* silent */ }
    setPublishing(false);
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviteError('');
    try {
      const res = await fetch('/api/blogs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugid, username: inviteUsername.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setCollaborators(prev => [...prev.filter(c => c.username !== inviteUsername.trim()), { username: inviteUsername.trim(), role: inviteRole, display_name: '', avatar_url: '' }]);
        setInviteUsername('');
      } else {
        setInviteError(data.error || 'Failed to invite');
      }
    } catch { setInviteError('Network error'); }
  };

  const handleRemoveCollab = async (userId) => {
    try {
      await fetch('/api/blogs/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugid, userId }),
      });
      setCollaborators(prev => prev.filter(c => c.id !== userId));
    } catch { /* silent */ }
  };

  const readTime = Math.max(1, Math.ceil(wordCount / 250));

  const formatSavedTime = (ts) => {
    if (!ts) return null;
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10) return 'Just saved';
    if (diff < 60) return `Saved ${diff}s ago`;
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved ${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] edit-page">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-14 border-b border-[var(--border-default)] flex items-center justify-between px-5 bg-[var(--bg-app)]/95 backdrop-blur-md z-50">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="h-7 w-7 rounded-full bg-[url('/logo.png')] bg-cover" />
            <span className="text-lg font-bold font-kanit text-[var(--text-primary)] hidden sm:block">LixBlogs</span>
          </Link>
          <span className="text-[var(--text-faint)] text-sm">/</span>
          <span className="text-[var(--text-muted)] text-[13px] truncate">
            @{username}/{truncateSlug(slug || slugid)}
          </span>
          {lastSaved && (
            <span className="text-[var(--text-muted)] text-[11px] hidden md:block">{formatSavedTime(lastSaved)}</span>
          )}
          {/* Sync status dot */}
          {syncStatus !== 'idle' && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' :
                syncStatus === 'synced' ? 'bg-green-400' :
                syncStatus === 'local' ? 'bg-yellow-500' : ''
              }`}
              title={
                syncStatus === 'syncing' ? 'Syncing to cloud...' :
                syncStatus === 'synced' ? 'Saved to cloud' :
                syncStatus === 'local' ? 'Saved locally' : ''
              }
            />
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <span className="text-[var(--text-muted)] text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)]">Draft</span>

          {/* Publish split button */}
          <div className="relative">
            <div className="flex items-center">
              <button
                onClick={() => setShowPublishPanel(!showPublishPanel)}
                className="px-4 py-1.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-l-full text-[13px] hover:bg-[#b69aff] transition-colors"
              >
                Publish
              </button>
              <button
                onClick={() => setShowPublishMenu(!showPublishMenu)}
                className="px-2 py-1.5 bg-[#9b7bf7] text-[var(--text-primary)] rounded-r-full border-l border-[var(--bg-app)]/10 hover:bg-[#b69aff] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {showPublishMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPublishMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <button onClick={handleSaveDraft} className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors">
                    <ion-icon name="save-outline" style={{ fontSize: '15px', color: '#888' }} />
                    Save Draft
                  </button>
                  <button onClick={handlePublish} disabled={!title.trim()} className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors disabled:opacity-40">
                    <ion-icon name="send-outline" style={{ fontSize: '15px', color: '#888' }} />
                    Publish
                  </button>
                  <button onClick={handlePublishBeta} disabled={!title.trim()} className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors disabled:opacity-40">
                    <ion-icon name="eye-outline" style={{ fontSize: '15px', color: '#888' }} />
                    Publish Beta
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Shortcuts help */}
          <button
            data-shortcuts-btn
            onClick={() => setShowShortcuts(true)}
            className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center hover:border-[var(--border-hover)] transition-colors text-[var(--text-faint)] hover:text-[#c4b5fd] text-sm font-bold"
            title="Keyboard shortcuts"
          >
            ?
          </button>

          {/* Page color (members only) */}
          {user?.tier === 'member' && (
            <button
              onClick={() => setShowColorPanel(!showColorPanel)}
              className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center hover:border-[var(--border-hover)] transition-colors"
              title="Page theme color"
            >
              <div className="w-4 h-4 rounded-full" style={{ background: pageColor || 'linear-gradient(135deg, #9b7bf7, #60a5fa, #4ade80)', border: '1.5px solid var(--border-default)' }} />
            </button>
          )}

          {/* Hamburger menu */}
          <HamburgerMenu
            onShareDraft={() => {
              const url = `${window.location.origin}/${username}/${slug || slugid}`;
              navigator.clipboard.writeText(url).catch(() => {});
            }}
            onChangeCover={() => setShowCoverModal(true)}
            onChangeTitle={() => document.querySelector('textarea[placeholder="Blog title..."]')?.focus()}
            onChangeTopics={() => setShowPublishPanel(true)}
            onRevisionHistory={() => {}}
            onMoreSettings={() => setShowPublishPanel(true)}
          />

          {/* Profile dropdown */}
          {user && <HeaderProfileDropdown user={user} logout={logout} />}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-14 flex justify-center editor-texture-bg" style={pageColor ? { backgroundColor: pageColor } : undefined}>
        <div className={`w-full max-w-[720px] px-6 py-8 ${showPublishPanel ? 'mr-[400px]' : ''} transition-all`}>

          {/* Mode icons */}
          <div className="flex items-center gap-0.5 mb-5">
            {[
              { key: 'edit', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
              { key: 'preview', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchMode(tab.key)}
                className={`p-1.5 rounded-md transition-all ${
                  mode === tab.key
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-surface)]/50'
                }`}
                title={tab.key.charAt(0).toUpperCase() + tab.key.slice(1)}
              >
                {tab.icon}
              </button>
            ))}
          </div>

          {/* === EDIT MODE === */}
          {mode === 'edit' && (
            <>
              {/* Skeleton — visible until editor is ready */}
              {(draftLoading || !editorReady) && (
                <div className="animate-pulse space-y-4">
                  <div className="w-full h-[200px] bg-[var(--bg-elevated)] rounded-xl" />
                  <div className="h-10 bg-[var(--bg-elevated)] rounded-lg w-3/4" />
                  <div className="space-y-3 mt-6">
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-full" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-5/6" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-full" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-2/3" />
                    <div className="h-6 bg-[var(--bg-elevated)] rounded w-1/2 mt-5" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-full" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-4/5" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-full" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-3/4" />
                  </div>
                </div>
              )}

              {/* Editor — rendered hidden until ready, then shown */}
              {!draftLoading && (
                <div style={{ display: editorReady ? 'block' : 'none' }}>
                <>
                  {/* Cover banner with emoji overlay */}
                  <div className="relative mb-2">
                    {coverPreview ? (
                      <div
                        className="relative rounded-xl overflow-hidden group cover-banner-enter"
                        style={{ height: '220px', cursor: isDraggingCover ? 'grabbing' : 'default' }}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          setIsDraggingCover(true);
                          coverDragStart.current = { x: e.clientX, y: e.clientY, posX: coverPos.x, posY: coverPos.y };
                        }}
                        onMouseMove={(e) => {
                          if (!isDraggingCover) return;
                          const dx = ((e.clientX - coverDragStart.current.x) / 7) * -1;
                          const dy = ((e.clientY - coverDragStart.current.y) / 3) * -1;
                          setCoverPos({
                            x: Math.max(0, Math.min(100, coverDragStart.current.posX + dx)),
                            y: Math.max(0, Math.min(100, coverDragStart.current.posY + dy)),
                          });
                        }}
                        onMouseUp={() => setIsDraggingCover(false)}
                        onMouseLeave={() => setIsDraggingCover(false)}
                      >
                        <img
                          src={coverPreview}
                          alt="Cover"
                          className="w-full h-full object-cover select-none"
                          draggable={false}
                          style={{
                            objectPosition: `${coverPos.x}% ${coverPos.y}%`,
                            transform: `scale(${coverZoom})`,
                            transition: isDraggingCover ? 'none' : 'transform 0.2s ease',
                          }}
                        />
                        {/* Hover toolbar — top-right */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Zoom out */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setCoverZoom((z) => Math.max(1, z - 0.1)); }}
                            className="cover-toolbar-btn"
                            title="Zoom out"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                          </button>
                          {/* Zoom in */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setCoverZoom((z) => Math.min(3, z + 0.1)); }}
                            className="cover-toolbar-btn"
                            title="Zoom in"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                          </button>
                          {/* Reset position */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setCoverZoom(1); setCoverPos({ x: 50, y: 50 }); }}
                            className="cover-toolbar-btn"
                            title="Reset"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 105.64-8.36L1 10" />
                            </svg>
                          </button>
                          {/* Separator */}
                          <div className="w-px h-4 bg-white/20 mx-0.5" />
                          {/* Replace */}
                          <label className="cover-toolbar-btn cursor-pointer" title="Replace">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                            </svg>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setCoverImage(file);
                                  setCoverPreview(URL.createObjectURL(file));
                                  setCoverZoom(1);
                                  setCoverPos({ x: 50, y: 50 });
                                }
                              }}
                            />
                          </label>
                          {/* Remove */}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeCover(); setCoverZoom(1); setCoverPos({ x: 50, y: 50 }); }}
                            className="cover-toolbar-btn cover-toolbar-btn-danger"
                            title="Remove"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                        {/* Drag hint */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[var(--text-primary)]/50 bg-black/30 backdrop-blur rounded-full px-3 py-1 pointer-events-none select-none">
                          Drag to reposition
                        </div>
                      </div>
                    ) : showCoverModal ? (
                      <div className="relative rounded-xl overflow-hidden cover-banner-enter" style={{ height: '220px' }}>
                        <div className="absolute inset-0 cover-gradient-blur" />
                        <div className="absolute inset-0 flex items-center justify-center gap-6 z-10">
                          <label className="flex flex-col items-center gap-2 cursor-pointer group/upload">
                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover/upload:bg-white/20 transition-colors">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                            </div>
                            <span className="text-xs text-[var(--text-primary)]/70 font-medium">From device</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  compressCoverImage(file).then(({ blob, url }) => {
                                    setCoverImage(blob);
                                    setCoverPreview(url);
                                    setShowCoverModal(false);
                                  });
                                }
                              }}
                            />
                          </label>
                          <button
                            onClick={() => setCoverUrlMode(true)}
                            className="flex flex-col items-center gap-2 group/url"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover/url:bg-white/20 transition-colors">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                              </svg>
                            </div>
                            <span className="text-xs text-[var(--text-primary)]/70 font-medium">From URL</span>
                          </button>
                        </div>
                        {/* Inline URL input — slides up from bottom */}
                        {coverUrlMode && (
                          <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-md p-4 rounded-b-xl">
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                type="url"
                                value={coverUrlInput}
                                onChange={(e) => setCoverUrlInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && coverUrlInput.trim()) {
                                    setCoverPreview(coverUrlInput.trim());
                                    setShowCoverModal(false);
                                    setCoverUrlMode(false);
                                    setCoverUrlInput('');
                                  }
                                  if (e.key === 'Escape') { setCoverUrlMode(false); setCoverUrlInput(''); }
                                }}
                                placeholder="Paste image URL and press Enter..."
                                className="flex-1 bg-white/10 text-[var(--text-primary)] rounded-lg px-3 py-2 text-[13px] outline-none border border-white/20 focus:border-white/40 placeholder-white/40"
                              />
                              <button
                                onClick={() => {
                                  if (coverUrlInput.trim()) {
                                    setCoverPreview(coverUrlInput.trim());
                                    setShowCoverModal(false);
                                    setCoverUrlMode(false);
                                    setCoverUrlInput('');
                                  }
                                }}
                                className="px-4 py-2 bg-white/15 text-[var(--text-primary)] rounded-lg text-[13px] font-medium hover:bg-white/25 transition-colors"
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => setShowCoverModal(false)}
                          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : null}

                    {/* Emoji overlapping banner bottom-left */}
                    {pageEmoji && (
                      <div
                        className="absolute group"
                        style={{
                          bottom: coverPreview || showCoverModal ? '-24px' : 'auto',
                          left: '16px',
                          position: coverPreview || showCoverModal ? 'absolute' : 'relative',
                          zIndex: 10,
                        }}
                      >
                        <div
                          className="w-[72px] h-[72px] rounded-full bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer relative"
                          style={{ borderRadius: '50%' }}
                          onClick={() => setShowEmojiPicker(true)}
                        >
                          <span className="text-[42px] leading-none select-none">{pageEmoji}</span>
                        </div>
                        <button onClick={() => setPageEmoji(null)} className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-[10px] z-20">&times;</button>
                      </div>
                    )}
                  </div>

                  {/* Spacer when emoji overlaps banner */}
                  {pageEmoji && (coverPreview || showCoverModal) && <div className="h-8" />}

                  {/* Add cover / Add emoji buttons */}
                  {(!coverPreview || !pageEmoji) && !showCoverModal && (
                    <div className="flex items-center gap-3 mb-4 mt-2">
                      {!coverPreview && (
                        <button onClick={() => setShowCoverModal(true)} className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[#9b7bf7] transition-colors text-xs">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          Add cover
                        </button>
                      )}
                      {!pageEmoji && (
                        <button onClick={() => setShowEmojiPicker(true)} className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[#9b7bf7] transition-colors text-xs">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                          Add emoji
                        </button>
                      )}
                    </div>
                  )}

                  {/* Emoji picker — absolute positioned, glassmorphic */}
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowEmojiPicker(false)} />
                      <div className="relative">
                        <div className="absolute left-0 top-0 z-[61] emoji-picker-glass">
                          <EmojiPicker
                            onSelect={(emoji) => { setPageEmoji(emoji); setShowEmojiPicker(false); }}
                            onRemove={() => { setPageEmoji(null); setShowEmojiPicker(false); }}
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Author bar — above title */}
                  <div className="flex items-center gap-3 mt-2 mb-2">
                    <div className="flex -space-x-2">
                      <AvatarImg src={user?.avatar_url} name={user?.display_name || user?.username} size={28} />
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[var(--text-faint)]">
                      <span className="text-[var(--text-muted)] font-medium">{user?.display_name || user?.username || 'Author'}</span>
                      <span className="text-[var(--text-faint)]">·</span>
                      <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
                      <span className="text-[var(--text-faint)]">·</span>
                      <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                    </div>
                  </div>

                  {/* Tags — shown under author bar */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-0">
                      {tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-0.5 bg-[#9b7bf70a] rounded-full text-[12px] text-[#9b7bf7]">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* 30px gap before title */}
                  <div style={{ height: '30px' }} />

                  {/* Title */}
                  <div className="relative">
                    <textarea
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setAiTitleKey(0);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="Blog title..."
                      className={`w-full bg-transparent text-[2em] font-extrabold outline-none placeholder-[var(--text-faint)] mb-1 leading-tight resize-none overflow-hidden ${aiTitleKey > 0 ? 'text-transparent' : ''}`}
                      rows={1}
                    />
                    {aiTitleKey > 0 && title && (
                      <div className="absolute inset-0 pointer-events-none text-[2em] font-extrabold leading-tight flex flex-wrap items-start" key={aiTitleKey}>
                        {title.split(/(\s+)/).map((word, i) => (
                          word.match(/^\s+$/) ? <span key={i}>&nbsp;</span> : (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                              transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
                              className="text-[#c4b5fd]"
                              onAnimationComplete={() => {
                                if (i === title.split(/(\s+)/).length - 1) {
                                  setTimeout(() => setAiTitleKey(0), 800);
                                }
                              }}
                            >
                              {word}
                            </motion.span>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="min-h-[60vh] pb-[100px] relative">
                    <BlockNoteEditor
                      ref={editorRef}
                      onChange={handleEditorChange}
                      initialContent={editorContent}
                      onReady={() => setEditorReady(true)}
                      onTitleChange={(newTitle) => { setTitle(newTitle); setAiTitleKey(k => k + 1); }}
                      blogId={slugid}
                    />
                    {/* Outline sidebar — shows heading positions */}
                    {editorContent && editorContent.length > 0 && (() => {
                      const headings = (editorContent || []).filter(
                        (b) => b.type === 'heading' && b.content?.length > 0
                      );
                      if (headings.length === 0) return null;
                      return (
                        <div className="editor-outline-sidebar">
                          <p className="editor-outline-title">Outline</p>
                          <ul className="editor-outline-list">
                            {headings.map((h, i) => {
                              const level = parseInt(h.props?.level || '1', 10);
                              const text = h.content.map((c) => c.text || '').join('');
                              if (!text.trim()) return null;
                              return (
                                <li
                                  key={h.id || i}
                                  className="editor-outline-item"
                                  style={{ paddingLeft: `${(level - 1) * 12}px` }}
                                  onClick={() => {
                                    const el = document.querySelector(`[data-id="${h.id}"]`);
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }}
                                >
                                  <span className="editor-outline-dot" style={{ opacity: level === 1 ? 1 : level === 2 ? 0.7 : 0.4 }} />
                                  <span className="editor-outline-text">{text}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })()}
                  </div>
                </>
                </div>
              )}
            </>
          )}

          {mode === 'preview' && (
            <div className="blog-preview-fullwidth">
              <BlogPreview title={title} subtitle={subtitle} coverPreview={coverPreview} coverZoom={coverZoom} coverPos={coverPos} pageEmoji={pageEmoji} tags={tags} html={previewHtml} blocks={previewBlocks} user={user} wordCount={wordCount} />
            </div>
          )}

          {mode === 'code' && (
            <BlogCodeView blocks={editorContent} markdown={markdown} />
          )}
        </div>
      </main>

      {/* Publish Side Panel backdrop */}
      {showPublishPanel && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPublishPanel(false)} />
      )}

      {/* Publish Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-[var(--bg-surface)] border-l border-[var(--border-default)] z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          showPublishPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Publish Settings</h2>
          <button onClick={() => setShowPublishPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* Blog Properties */}
          <div className="flex items-center gap-4 text-[13px] text-[var(--text-muted)] bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-4 py-3">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              {wordCount} words
            </span>
            <span className="text-[var(--text-faint)]">&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {readTime} min read
            </span>
          </div>

          {/* Owner — GitHub-style dropdown */}
          <div>
            <label className="text-[12px] text-[var(--text-muted)] mb-2 block font-medium">Owner</label>
            <div className="relative" ref={ownerDropdownRef}>
              <button
                onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                className="w-full flex items-center gap-2.5 bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-[13px] hover:border-[var(--border-hover)] transition-colors"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] text-[var(--text-body)] font-bold">
                    {(user?.display_name || username || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[var(--text-primary)] font-medium flex-1 text-left">{publishAs === 'personal' ? username : publishAs}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showOwnerDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg shadow-xl z-10 overflow-hidden">
                  <div className="px-3 py-2 text-[11px] text-[var(--text-faint)] font-medium uppercase tracking-wider border-b border-[var(--border-default)]">Choose an owner</div>
                  {/* Personal account */}
                  <button
                    onClick={() => { setPublishAs('personal'); setShowOwnerDropdown(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] hover:bg-[var(--bg-hover)] transition-colors ${publishAs === 'personal' ? 'bg-[var(--bg-hover)]' : ''}`}
                  >
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] text-[var(--text-body)] font-bold">
                        {(user?.display_name || username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-[var(--text-primary)]">{username}</span>
                    {publishAs === 'personal' && (
                      <svg className="ml-auto w-4 h-4 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </button>
                  {/* TODO: Populate user's orgs from API */}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[12px] text-[var(--text-muted)] mb-2 block font-medium">Tags (up to 5) <span className="text-[var(--text-faint)] font-normal">— press Enter to attach</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-[#9b7bf714] rounded-full text-[12px] text-[#9b7bf7]">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-[#9b7bf780] hover:text-[#9b7bf7] ml-0.5 text-[10px]">&times;</button>
                </span>
              ))}
            </div>
            {tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag, press Enter..."
                className="w-full bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-3 py-2 outline-none text-[13px] border border-[var(--border-default)] focus:border-[var(--border-hover)] transition-colors placeholder-[#6b7a8d]"
              />
            )}
          </div>

          {/* URL Slug */}
          <div>
            <label className="text-[12px] text-[var(--text-muted)] mb-2 block font-medium">URL Slug</label>
            <div className="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-default)] overflow-hidden">
              <span className="text-[var(--text-muted)] text-[13px] px-3 flex-shrink-0">@{username}/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, '-').replace(/-+/g, '-'))}
                placeholder={slugid}
                className="flex-1 bg-transparent text-[var(--text-primary)] py-2 pr-3 outline-none text-[13px]"
              />
            </div>
          </div>

          {/* Collaborators / Invite */}
          <div>
            <label className="text-[12px] text-[var(--text-muted)] mb-2 block font-medium">Collaborators</label>
            {/* Existing collaborators */}
            {collaborators.length > 0 && (
              <div className="space-y-2 mb-3">
                {collaborators.map((c) => (
                  <div key={c.id || c.username} className="flex items-center gap-2.5 bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[9px] text-[var(--text-body)] font-bold">
                        {(c.display_name || c.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-[13px] text-[var(--text-primary)] flex-1">@{c.username}</span>
                    <span className="text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">{c.role}</span>
                    <button onClick={() => handleRemoveCollab(c.id)} className="text-[var(--text-faint)] hover:text-[#f87171] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Invite form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUsername}
                onChange={(e) => { setInviteUsername(e.target.value); setInviteError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                placeholder="Username..."
                className="flex-1 bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-3 py-2 outline-none text-[13px] border border-[var(--border-default)] focus:border-[var(--border-hover)] transition-colors placeholder-[#6b7a8d]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-default)] rounded-lg px-2 py-2 text-[12px] outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleInvite}
                className="px-3 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg text-[12px] font-medium hover:bg-[#2a3548] transition-colors"
              >
                Invite
              </button>
            </div>
            {inviteError && <p className="text-[11px] text-[#f87171] mt-1.5">{inviteError}</p>}
          </div>

          {/* Preview Card */}
          <div>
            <label className="text-[12px] text-[var(--text-muted)] mb-2 block font-medium">Preview</label>
            <div className="bg-[var(--bg-app)] border border-[var(--border-default)] rounded-xl p-4">
              {coverPreview && (
                <img src={coverPreview} alt="Cover" className="w-full h-[100px] object-cover rounded-lg mb-3" />
              )}
              <p className="font-bold text-[15px] leading-tight text-[var(--text-primary)]">{title || 'Your blog title'}</p>
              {subtitle && <p className="text-[var(--text-muted)] text-[13px] mt-1">{subtitle}</p>}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.map((tag) => (
                    <span key={tag} className="text-[11px] text-[#9b7bf7]">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[var(--border-default)] space-y-2">
          <button
            onClick={handlePublish}
            disabled={!title.trim() || publishing}
            className="w-full py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-bold rounded-xl text-[13px] hover:bg-[#b69aff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {publishing ? 'Publishing...' : 'Publish now'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePublishBeta}
              disabled={!title.trim() || publishing}
              className="flex-1 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] font-medium rounded-xl text-[12px] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
            >
              Publish Beta
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex-1 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] font-medium rounded-xl text-[12px] hover:text-[var(--text-primary)] transition-colors"
            >
              Save Draft
            </button>
          </div>
        </div>
      </div>

      {/* Page Color Side Panel (members only) */}
      {showColorPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColorPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-[320px] bg-[var(--bg-surface)] border-l border-[var(--border-default)] z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Page Theme</h2>
              <button onClick={() => setShowColorPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <p className="text-[12px] text-[var(--text-muted)]">Choose a background accent for your blog page. Visible to readers.</p>

              {/* Reset */}
              <button
                onClick={() => setPageColor(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${!pageColor ? 'border-[#9b7bf7] bg-[#9b7bf714]' : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-app)] border border-[var(--border-default)]" />
                <span className="text-[13px] text-[var(--text-primary)]">Default (none)</span>
              </button>

              {/* Predefined colors */}
              <div className="space-y-2">
                {[
                  { name: 'Midnight Purple', color: '#1a1028', accent: '#9b7bf7' },
                  { name: 'Deep Ocean', color: '#0f1a2e', accent: '#60a5fa' },
                  { name: 'Forest', color: '#0f1f17', accent: '#4ade80' },
                  { name: 'Warm Ember', color: '#1f150f', accent: '#fb923c' },
                  { name: 'Rose', color: '#1f0f18', accent: '#f472b6' },
                  { name: 'Slate', color: '#171b22', accent: '#9ca3af' },
                  { name: 'Golden', color: '#1a1708', accent: '#fbbf24' },
                  { name: 'Crimson', color: '#1f0f0f', accent: '#f87171' },
                  { name: 'Teal', color: '#0f1f1f', accent: '#2dd4bf' },
                  { name: 'Indigo', color: '#13102a', accent: '#818cf8' },
                ].map(({ name, color, accent }) => (
                  <button
                    key={name}
                    onClick={() => setPageColor(color)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${pageColor === color ? 'border-[' + accent + '] bg-[' + accent + '14]' : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'}`}
                    style={pageColor === color ? { borderColor: accent, background: `${accent}14` } : {}}
                  >
                    <div className="w-8 h-8 rounded-lg border border-[var(--border-hover)]" style={{ background: color }} />
                    <div className="flex-1 text-left">
                      <span className="text-[13px] text-[var(--text-primary)]">{name}</span>
                    </div>
                    <div className="w-3 h-3 rounded-full" style={{ background: accent }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Saved to cloud toast */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-green-500/20 bg-[var(--bg-surface)]/90 backdrop-blur-lg shadow-2xl"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[13px] text-green-300 font-medium">Saved to cloud</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
