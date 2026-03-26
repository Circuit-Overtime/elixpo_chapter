'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import '../styles/editor/editor.css';

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

function truncateSlug(s, max = 18) {
  if (!s) return 'untitled';
  return s.length > max ? s.slice(0, max) + '...' : s;
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
      <button onClick={() => setOpen(!open)} className="rounded-full hover:ring-2 hover:ring-[#ffffff10] transition-all">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-[#2a2d3a] flex items-center justify-center text-[13px] text-[#b0b0b0] font-medium">
            {initial}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[240px] bg-[#0d1117] border border-[#1a1d27] rounded-xl shadow-2xl z-50 overflow-hidden">
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[#ffffff06] transition-colors">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-[#2a2d3a] flex-shrink-0 flex items-center justify-center text-[14px] text-[#b0b0b0] font-medium">{initial}</div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] text-[#e8e8e8] font-semibold truncate">{user.display_name || user.username}</p>
              <p className="text-[11px] text-[#9b7bf7]">View profile</p>
            </div>
          </Link>
          <div className="h-px bg-[#1a1d27]" />
          <div className="py-1">
            <Link href="/stories" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="book-outline" style={{ fontSize: '16px', color: '#888' }} />
              Your Stories
            </Link>
            <Link href="/stats" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="stats-chart-outline" style={{ fontSize: '16px', color: '#888' }} />
              Stats
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="settings-outline" style={{ fontSize: '16px', color: '#888' }} />
              Settings
            </Link>
          </div>
          <div className="h-px bg-[#1a1d27]" />
          <div className="py-1">
            <button onClick={() => { setOpen(false); logout(); }} className="flex items-center gap-3 w-full px-4 py-2 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors">
              <ion-icon name="log-out-outline" style={{ fontSize: '16px', color: '#888' }} />
              Sign out
            </button>
            <p className="px-4 pb-1.5 text-[10px] text-[#444] truncate">{user.email}</p>
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
    { label: 'Share draft link', action: onShareDraft, icon: 'share-outline' },
    { label: 'Share to X', action: () => {}, icon: 'logo-twitter' },
    { label: 'Change featured image', action: onChangeCover, icon: 'image-outline' },
    { label: 'Change display title / subtitle', action: onChangeTitle, icon: 'text-outline' },
    { label: 'Change topics', action: onChangeTopics, icon: 'pricetags-outline' },
    { label: 'See revision history', action: onRevisionHistory, icon: 'time-outline' },
    { label: 'More settings', action: onMoreSettings, icon: 'options-outline' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-lg bg-[#0d1117] border border-[#1a1d27] flex items-center justify-center hover:border-[#333] transition-colors"
      >
        <ion-icon name="ellipsis-horizontal" style={{ color: '#888', fontSize: '16px' }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[260px] bg-[#0d1117] border border-[#1a1d27] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Menu caret */}
          <div className="absolute -top-[6px] right-3 w-3 h-3 bg-[#0d1117] border-l border-t border-[#1a1d27] rotate-45" />
          <div className="py-1.5 relative">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action?.(); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-[#999] hover:text-white hover:bg-[#ffffff06] transition-colors"
              >
                <ion-icon name={item.icon} style={{ fontSize: '15px' }} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="h-px bg-[#1a1d27]" />
          <div className="py-1.5">
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] transition-colors"
            >
              <ion-icon name="keyboard-outline" style={{ fontSize: '15px' }} />
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pageEmoji, setPageEmoji] = useState(null);
  const [editorContent, setEditorContent] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);

  const username = user?.username || 'you';

  useEffect(() => {
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

  const switchMode = useCallback(async (newMode) => {
    if (newMode !== 'edit' && editorRef.current) {
      try {
        const [html, md] = await Promise.all([editorRef.current.getHTML(), editorRef.current.getMarkdown()]);
        setPreviewHtml(html);
        setMarkdown(md);
      } catch { /* not ready */ }
    }
    setMode(newMode);
  }, []);

  const handleSaveDraft = () => {
    saveDraft(slugid, { title, subtitle, tags, publishAs, coverPreview, editorContent, pageEmoji });
    setLastSaved(Date.now());
    setShowPublishMenu(false);
  };

  const handlePublish = () => {
    console.log('Publishing:', { title, subtitle, content: editorContent, tags, publishAs, coverImage });
    setShowPublishMenu(false);
  };

  const handlePublishBeta = () => {
    console.log('Publishing beta:', { title, subtitle, content: editorContent, tags, publishAs, coverImage, status: 'unlisted' });
    setShowPublishMenu(false);
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
    <div className="min-h-screen bg-[#030712] text-white edit-page">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-14 border-b border-[#1a1d27] flex items-center justify-between px-5 bg-[#030712]/95 backdrop-blur-md z-50">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="h-7 w-7 rounded-full bg-[url('/logo.png')] bg-cover" />
            <span className="text-lg font-bold font-kanit text-white hidden sm:block">LixBlogs</span>
          </Link>
          <span className="text-[#333] text-sm">/</span>
          <span className="text-[#555] text-[13px] truncate">
            @{username}/{truncateSlug(slugid)}
          </span>
          {lastSaved && (
            <span className="text-[#444] text-[11px] hidden md:block">{formatSavedTime(lastSaved)}</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <span className="text-[#555] text-[11px] px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#1a1d27]">Draft</span>

          {/* Publish split button */}
          <div className="relative">
            <div className="flex items-center">
              <button
                onClick={() => setShowPublishPanel(!showPublishPanel)}
                className="px-4 py-1.5 bg-[#e8e8e8] text-[#030712] font-semibold rounded-l-full text-[13px] hover:bg-white transition-colors"
              >
                Publish
              </button>
              <button
                onClick={() => setShowPublishMenu(!showPublishMenu)}
                className="px-2 py-1.5 bg-[#e8e8e8] text-[#030712] rounded-r-full border-l border-[#030712]/10 hover:bg-white transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {showPublishMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPublishMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 bg-[#0d1117] border border-[#1a1d27] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <button onClick={handleSaveDraft} className="w-full px-4 py-2.5 text-left text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] flex items-center gap-2.5 transition-colors">
                    <ion-icon name="save-outline" style={{ fontSize: '15px', color: '#888' }} />
                    Save Draft
                  </button>
                  <button onClick={handlePublish} disabled={!title.trim()} className="w-full px-4 py-2.5 text-left text-[13px] text-[#c8c8c8] hover:text-white hover:bg-[#ffffff06] flex items-center gap-2.5 transition-colors disabled:opacity-40">
                    <ion-icon name="send-outline" style={{ fontSize: '15px', color: '#888' }} />
                    Publish
                  </button>
                  <button onClick={handlePublishBeta} disabled={!title.trim()} className="w-full px-4 py-2.5 text-left text-[13px] text-[#777] hover:text-white hover:bg-[#ffffff06] flex items-center gap-2.5 transition-colors disabled:opacity-40">
                    <ion-icon name="eye-outline" style={{ fontSize: '15px', color: '#888' }} />
                    Publish Beta
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Hamburger menu */}
          <HamburgerMenu
            onShareDraft={() => {}}
            onChangeCover={() => setShowCoverModal(true)}
            onChangeTitle={() => document.querySelector('input[placeholder="Blog title..."]')?.focus()}
            onChangeTopics={() => setShowPublishPanel(true)}
            onRevisionHistory={() => {}}
            onMoreSettings={() => setShowPublishPanel(true)}
          />

          {/* Profile dropdown */}
          {user && <HeaderProfileDropdown user={user} logout={logout} />}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-14 flex justify-center">
        <div className={`w-full max-w-[720px] px-6 py-8 ${showPublishPanel ? 'mr-[400px]' : ''} transition-all`}>

          {/* Mode icons */}
          <div className="flex items-center gap-0.5 mb-5">
            {[
              { key: 'edit', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
              { key: 'preview', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
              { key: 'code', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchMode(tab.key)}
                className={`p-1.5 rounded-md transition-all ${
                  mode === tab.key
                    ? 'bg-[#0d1117] text-white border border-[#1a1d27]'
                    : 'text-[#444] hover:text-[#888] hover:bg-[#0d1117]/50'
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
              {coverPreview && (
                <div className="relative mb-6 rounded-xl overflow-hidden group" style={{ aspectRatio: '3/1' }}>
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={() => setShowCoverModal(true)} className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg text-xs hover:bg-white/30 transition-colors">Change</button>
                    <button onClick={removeCover} className="px-3 py-1.5 bg-red-500/60 backdrop-blur rounded-lg text-xs hover:bg-red-500/80 transition-colors">Remove</button>
                  </div>
                </div>
              )}

              {pageEmoji && (
                <div className="relative group w-fit mb-2">
                  <span className="text-5xl cursor-pointer select-none" onClick={() => setShowEmojiPicker(true)}>{pageEmoji}</span>
                  <button onClick={() => setPageEmoji(null)} className="absolute -top-1 -right-3 opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full bg-[#1a1d27] border border-[#333] flex items-center justify-center text-[#888] hover:text-white transition-all text-[10px]">&times;</button>
                </div>
              )}

              {(!coverPreview || !pageEmoji) && (
                <div className="flex items-center gap-3 mb-4">
                  {!coverPreview && (
                    <button onClick={() => setShowCoverModal(true)} className="inline-flex items-center gap-1.5 text-[#444] hover:text-[#9b7bf7] transition-colors text-xs">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Add cover
                    </button>
                  )}
                  {!pageEmoji && (
                    <button onClick={() => setShowEmojiPicker(true)} className="inline-flex items-center gap-1.5 text-[#444] hover:text-[#9b7bf7] transition-colors text-xs">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                      Add emoji
                    </button>
                  )}
                </div>
              )}

              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => { setPageEmoji(emoji); setShowEmojiPicker(false); }}
                  onRemove={() => { setPageEmoji(null); setShowEmojiPicker(false); }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              {showCoverModal && (
                <CoverUploadModal onSelect={handleCoverSelect} onClose={() => setShowCoverModal(false)} />
              )}

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Blog title..."
                className="w-full bg-transparent text-[2em] font-extrabold outline-none placeholder-[#1a1d27] mb-1 leading-tight"
              />

              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Add a subtitle..."
                className="w-full bg-transparent text-base text-[#888] outline-none placeholder-[#1a1d27] mb-6"
              />

              <div className="min-h-[500px]">
                <BlockNoteEditor ref={editorRef} onChange={handleEditorChange} initialContent={editorContent} />
              </div>
            </>
          )}

          {mode === 'preview' && (
            <BlogPreview title={title} subtitle={subtitle} coverPreview={coverPreview} tags={tags} html={previewHtml} />
          )}

          {mode === 'code' && (
            <BlogCodeView blocks={editorContent} markdown={markdown} />
          )}
        </div>
      </main>

      {/* Publish Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-[#0d1117] border-l border-[#1a1d27] z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          showPublishPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#1a1d27]">
          <h2 className="text-[15px] font-bold text-white">Publish Settings</h2>
          <button onClick={() => setShowPublishPanel(false)} className="text-[#666] hover:text-white transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* Blog Properties */}
          <div className="flex items-center gap-4 text-[13px] text-[#777] bg-[#030712] border border-[#1a1d27] rounded-lg px-4 py-3">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              {wordCount} words
            </span>
            <span className="text-[#333]">&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {readTime} min read
            </span>
          </div>

          {/* Publish As */}
          <div>
            <label className="text-[12px] text-[#777] mb-2 block font-medium">Publish as</label>
            <div className="flex gap-2">
              {['personal', 'organization'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPublishAs(opt)}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    publishAs === opt ? 'bg-white text-[#030712]' : 'bg-[#030712] border border-[#1a1d27] text-[#777] hover:text-white hover:border-[#333]'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[12px] text-[#777] mb-2 block font-medium">Tags (up to 5)</label>
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
                placeholder="Add a tag..."
                className="w-full bg-[#030712] text-[#e0e0e0] rounded-lg px-3 py-2 outline-none text-[13px] border border-[#1a1d27] focus:border-[#333] transition-colors placeholder-[#444]"
              />
            )}
          </div>

          {/* URL Slug */}
          <div>
            <label className="text-[12px] text-[#777] mb-2 block font-medium">URL Slug</label>
            <div className="flex items-center bg-[#030712] rounded-lg border border-[#1a1d27] overflow-hidden">
              <span className="text-[#555] text-[13px] px-3">@{username}/</span>
              <input
                type="text"
                defaultValue={slugid || ''}
                placeholder="auto-generated"
                className="flex-1 bg-transparent text-[#e0e0e0] py-2 pr-3 outline-none text-[13px]"
              />
            </div>
          </div>

          {/* Preview Card */}
          <div>
            <label className="text-[12px] text-[#777] mb-2 block font-medium">Preview</label>
            <div className="bg-[#030712] border border-[#1a1d27] rounded-xl p-4">
              {coverPreview && (
                <img src={coverPreview} alt="Cover" className="w-full h-[100px] object-cover rounded-lg mb-3" />
              )}
              <p className="font-bold text-[15px] leading-tight text-[#e0e0e0]">{title || 'Your blog title'}</p>
              <p className="text-[#777] text-[13px] mt-1">{subtitle || 'Your subtitle here'}</p>
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

        <div className="p-5 border-t border-[#1a1d27]">
          <button
            onClick={handlePublish}
            disabled={!title.trim()}
            className="w-full py-2.5 bg-[#e8e8e8] text-[#030712] font-bold rounded-xl text-[13px] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Publish now
          </button>
        </div>
      </div>
    </div>
  );
}
