'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  return STORAGE_KEY_PREFIX + (slug || 'new');
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

export default function WritePage({ slugid }) {
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

  // TODO: replace with real user from session
  const username = 'you';

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
    // Convert data URL to blob for future R2 upload
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
      <header className="fixed top-0 left-0 w-full h-[60px] border-b border-[#1D202A] flex items-center justify-between px-6 bg-[#030712]/95 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-full bg-[url('/logo.png')] bg-cover" />
          <p className="text-xl font-bold font-[Kanit,serif] shrink-0">LixBlogs</p>
          <span className="text-[#444] text-sm mx-0.5">/</span>
          <span className="text-[#555] text-sm truncate">
            @{username}/{truncateSlug(slugid)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#555] text-xs">
            {wordCount} words &middot; {readTime} min read
          </span>
          {lastSaved && (
            <span className="text-[#444] text-xs">{formatSavedTime(lastSaved)}</span>
          )}
          <span className="text-[#666] text-xs px-2 py-0.5 rounded bg-[#1D202A]">Draft</span>

          {/* Publish split button */}
          <div className="relative">
            <div className="flex items-center">
              <button
                onClick={() => setShowPublishPanel(!showPublishPanel)}
                className="px-5 py-1.5 bg-[#7ba8f0] text-[#030712] font-semibold rounded-l-full text-sm hover:bg-[#9dc0ff] transition-colors"
              >
                Publish
              </button>
              <button
                onClick={() => setShowPublishMenu(!showPublishMenu)}
                className="px-2 py-1.5 bg-[#7ba8f0] text-[#030712] rounded-r-full border-l border-[#030712]/20 hover:bg-[#9dc0ff] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {showPublishMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPublishMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#10141E] border border-[#1D202A] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <button onClick={handleSaveDraft} className="w-full px-4 py-2.5 text-left text-sm text-[#e4e4e7] hover:bg-[#1D202A] flex items-center gap-2 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save Draft
                  </button>
                  <button onClick={handlePublish} disabled={!title.trim()} className="w-full px-4 py-2.5 text-left text-sm text-[#e4e4e7] hover:bg-[#1D202A] flex items-center gap-2 transition-colors disabled:opacity-40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Publish
                  </button>
                  <button onClick={handlePublishBeta} disabled={!title.trim()} className="w-full px-4 py-2.5 text-left text-sm text-[#888] hover:bg-[#1D202A] flex items-center gap-2 transition-colors disabled:opacity-40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Publish Beta
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-8 rounded-full bg-[#1D202A] flex items-center justify-center cursor-pointer hover:bg-[#282c3a] transition-colors">
            <ion-icon name="ellipsis-horizontal" style={{ color: '#888', fontSize: '16px' }} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-[60px] flex justify-center">
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
                    ? 'bg-[#1D202A] text-[#7ba8f0]'
                    : 'text-[#444] hover:text-[#888] hover:bg-[#1D202A]/50'
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
              {/* Cover Image */}
              {coverPreview && (
                <div className="relative mb-6 rounded-xl overflow-hidden group" style={{ aspectRatio: '3/1' }}>
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowCoverModal(true)}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg text-xs hover:bg-white/30 transition-colors"
                    >
                      Change
                    </button>
                    <button onClick={removeCover} className="px-3 py-1.5 bg-red-500/60 backdrop-blur rounded-lg text-xs hover:bg-red-500/80 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Page Emoji */}
              {pageEmoji && (
                <div className="relative group w-fit mb-2">
                  <span className="text-5xl cursor-pointer select-none" onClick={() => setShowEmojiPicker(true)}>
                    {pageEmoji}
                  </span>
                  <button
                    onClick={() => setPageEmoji(null)}
                    className="absolute -top-1 -right-3 opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full bg-[#1D202A] border border-[#333] flex items-center justify-center text-[#888] hover:text-white transition-all text-[10px]"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Add cover / Add emoji buttons */}
              {(!coverPreview || !pageEmoji) && (
                <div className="flex items-center gap-3 mb-4">
                  {!coverPreview && (
                    <button
                      onClick={() => setShowCoverModal(true)}
                      className="inline-flex items-center gap-1.5 text-[#444] hover:text-[#7ba8f0] transition-colors text-xs"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      Add cover
                    </button>
                  )}
                  {!pageEmoji && (
                    <button
                      onClick={() => setShowEmojiPicker(true)}
                      className="inline-flex items-center gap-1.5 text-[#444] hover:text-[#7ba8f0] transition-colors text-xs"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                      Add emoji
                    </button>
                  )}
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => { setPageEmoji(emoji); setShowEmojiPicker(false); }}
                  onRemove={() => { setPageEmoji(null); setShowEmojiPicker(false); }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              {/* Cover Upload Modal */}
              {showCoverModal && (
                <CoverUploadModal
                  onSelect={handleCoverSelect}
                  onClose={() => setShowCoverModal(false)}
                />
              )}

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Blog title..."
                className="w-full bg-transparent text-[2em] font-extrabold outline-none placeholder-[#222] mb-1 leading-tight"
              />

              {/* Subtitle */}
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Add a subtitle..."
                className="w-full bg-transparent text-base text-[#888] outline-none placeholder-[#222] mb-6"
              />

              {/* Block Editor */}
              <div className="min-h-[500px]">
                <BlockNoteEditor
                  ref={editorRef}
                  onChange={handleEditorChange}
                  initialContent={editorContent}
                />
              </div>
            </>
          )}

          {/* === PREVIEW MODE === */}
          {mode === 'preview' && (
            <BlogPreview title={title} subtitle={subtitle} coverPreview={coverPreview} tags={tags} html={previewHtml} />
          )}

          {/* === CODE MODE === */}
          {mode === 'code' && (
            <BlogCodeView blocks={editorContent} markdown={markdown} />
          )}
        </div>
      </main>

      {/* Publish Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-[#10141E] border-l border-[#1D202A] z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          showPublishPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#1D202A]">
          <h2 className="text-lg font-bold">Publish Settings</h2>
          <button onClick={() => setShowPublishPanel(false)} className="text-[#888] hover:text-white transition-colors">
            <ion-icon name="close" style={{ fontSize: '22px' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Publish As */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">Publish as</label>
            <div className="flex gap-2">
              {['personal', 'organization'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPublishAs(opt)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    publishAs === opt ? 'bg-[#7ba8f0] text-[#030712]' : 'bg-[#1D202A] text-[#888] hover:text-white'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">Tags (up to 5)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-[#1D202A] rounded-full text-sm text-[#7ba8f0]">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-[#888] hover:text-white ml-1">
                    <ion-icon name="close" style={{ fontSize: '12px' }} />
                  </button>
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
                className="w-full bg-[#1D202A] text-white rounded-lg px-4 py-2 outline-none text-sm border border-[#333] focus:border-[#7ba8f0] transition-colors"
              />
            )}
          </div>

          {/* URL Slug */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">URL Slug</label>
            <div className="flex items-center bg-[#1D202A] rounded-lg border border-[#333] overflow-hidden">
              <span className="text-[#555] text-sm px-3">@{username}/</span>
              <input
                type="text"
                defaultValue={slugid || ''}
                placeholder="auto-generated-from-title"
                className="flex-1 bg-transparent text-white py-2 pr-3 outline-none text-sm"
              />
            </div>
          </div>

          {/* Preview Card */}
          <div>
            <label className="text-sm text-[#888] mb-2 block">Preview</label>
            <div className="bg-[#1D202A] rounded-xl p-4">
              {coverPreview && (
                <img src={coverPreview} alt="Cover" className="w-full h-[120px] object-cover rounded-lg mb-3" />
              )}
              <p className="font-bold text-lg leading-tight">{title || 'Your blog title'}</p>
              <p className="text-[#888] text-sm mt-1">{subtitle || 'Your subtitle here'}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-[#555]">
                <span>{readTime} min read</span>
                <span>&middot;</span>
                <span>{wordCount} words</span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs text-[#7ba8f0]">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#1D202A]">
          <button
            onClick={handlePublish}
            disabled={!title.trim()}
            className="w-full py-3 bg-[#7ba8f0] text-[#030712] font-bold rounded-xl text-sm hover:bg-[#9dc0ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Publish now
          </button>
        </div>
      </div>
    </div>
  );
}
