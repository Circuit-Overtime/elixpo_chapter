'use client';

import { use, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../src/context/AuthContext';
import { useTheme } from '../../../../src/context/ThemeContext';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import '../../../../src/styles/editor/editor.css';
import '../../../../src/styles/katex-fonts.css';

const BlockNoteEditor = dynamic(() => import('../../../../src/components/Editor/BlogEditor'), { ssr: false });
const BlogPreview = dynamic(() => import('../../../../src/components/Editor/BlogPreview'), { ssr: false });
const KeyboardShortcutsModal = dynamic(() => import('../../../../src/components/Editor/KeyboardShortcutsModal'), { ssr: false });

export default function SubpageClient({ params }) {
  const { slugid, subpageId } = use(params);
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const editorRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [mode, setMode] = useState('edit'); // edit | preview
  const [previewBlocks, setPreviewBlocks] = useState([]);
  const [editorContent, setEditorContent] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const titleInputRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Fetch subpage data
  useEffect(() => {
    fetch(`/api/subpages?id=${subpageId}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }))
      .then(data => {
        setTitle(data.title || 'Untitled');
        let parsed;
        try { parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content; } catch {}
        setContent(parsed?.length ? parsed : undefined);
      })
      .catch(() => setContent(undefined))
      .finally(() => setLoading(false));
  }, [subpageId]);

  // Auto-save content
  const saveContent = useCallback(async (blocks) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch('/api/subpages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: subpageId, content: blocks }),
        });
        setLastSaved(new Date());
      } catch {}
      setSaving(false);
    }, 1500);
  }, [subpageId]);

  // Compute word count
  const computeWordCount = useCallback((blocks) => {
    if (!blocks) return 0;
    const count = (list) => (list || []).reduce((sum, b) => {
      const text = (b.content || []).map(c => c.text || '').join(' ');
      return sum + text.split(/\s+/).filter(Boolean).length + count(b.children);
    }, 0);
    return count(blocks);
  }, []);

  const handleEditorChange = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const blocks = editorRef.current.getBlocks();
      setEditorContent(blocks);
      setWordCount(computeWordCount(blocks));
      saveContent(blocks);
    } catch {}
  }, [saveContent, computeWordCount]);

  // Switch mode
  const switchMode = useCallback(async (newMode) => {
    if (newMode !== 'edit' && editorRef.current) {
      try {
        if (editorRef.current.getBlocks) {
          setPreviewBlocks(editorRef.current.getBlocks());
        }
      } catch {}
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

  // Save title
  const saveTitle = useCallback(async (newTitle) => {
    const t = newTitle.trim() || 'Untitled';
    setTitle(t);
    setEditingTitle(false);
    try {
      await fetch('/api/subpages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subpageId, title: t }),
      });
    } catch {}
  }, [subpageId]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
  }, [editingTitle]);

  const modeTabs = useMemo(() => [
    { key: 'edit', icon: 'create-outline', label: 'Edit' },
    { key: 'preview', icon: 'eye-outline', label: 'Preview' },
  ], []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9b7bf7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] edit-page">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-14 border-b border-[var(--border-default)] flex items-center justify-between px-5 bg-[var(--bg-app)]/95 backdrop-blur-md z-50">
        {/* Left: back + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/edit/${slugid}`} className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span className="text-[13px] hidden sm:inline">Back to blog</span>
          </Link>
          <span className="text-[var(--text-faint)] text-sm">/</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b7bf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                defaultValue={title}
                onBlur={(e) => saveTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(e.target.value); if (e.key === 'Escape') setEditingTitle(false); }}
                className="text-[13px] font-medium bg-transparent outline-none border-b border-[#9b7bf7] text-[var(--text-primary)] w-40"
              />
            ) : (
              <span
                className="text-[13px] font-medium text-[var(--text-primary)] cursor-pointer hover:text-[#9b7bf7] transition-colors truncate"
                onClick={() => setEditingTitle(true)}
                title="Click to rename"
              >
                {title}
              </span>
            )}
          </div>
          {/* Save status */}
          <span className="text-[11px] text-[var(--text-faint)] flex-shrink-0">
            {saving ? 'Saving...' : lastSaved ? 'Saved' : ''}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Mode tabs */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
            {modeTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => switchMode(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  color: mode === tab.key ? '#9b7bf7' : 'var(--text-muted)',
                  backgroundColor: mode === tab.key ? 'rgba(155,123,247,0.08)' : 'transparent',
                }}
              >
                <ion-icon name={tab.icon} style={{ fontSize: '14px' }} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-faint)' }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <ion-icon name={isDark ? 'sunny-outline' : 'moon-outline'} style={{ fontSize: '16px' }} />
          </button>

          {/* Shortcuts help */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-sm font-bold"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-faint)' }}
            title="Keyboard shortcuts"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-14 flex justify-center editor-texture-bg">
        <div className="w-full max-w-[720px] px-6 py-8">
          {/* Title — shown in edit mode */}
          {mode === 'edit' && (
            <>
              <h1
                className="text-[1.8em] font-extrabold leading-tight mb-6 cursor-pointer hover:text-[#9b7bf7] transition-colors"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                onClick={() => setEditingTitle(true)}
              >
                {title}
              </h1>

              {/* Editor — always mounted, hidden when not active */}
              <div className="min-h-[60vh] pb-[100px]">
                {!loading && (
                  <BlockNoteEditor
                    ref={editorRef}
                    onChange={handleEditorChange}
                    initialContent={content}
                    blogId={slugid}
                  />
                )}
              </div>
            </>
          )}

          {/* Preview mode */}
          {mode === 'preview' && (
            <div className="blog-preview-fullwidth">
              <BlogPreview
                title={title}
                blocks={previewBlocks}
                user={user}
                wordCount={wordCount}
                tags={[]}
              />
            </div>
          )}
        </div>
      </main>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
