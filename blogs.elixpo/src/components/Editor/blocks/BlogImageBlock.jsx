'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom image block replacing BlockNote's default.
 * Empty state: 3 buttons (Upload, Embed URL, Generate with AI)
 * Has image: full-width display with hover actions
 * Supports: paste, drag-drop, backspace to delete
 */
export const BlogImageBlock = createReactBlockSpec(
  {
    type: 'image',
    propSchema: {
      url: { default: '' },
      caption: { default: '' },
      previewWidth: { default: 740 },
      name: { default: '' },
      showPreview: { default: true },
      _imageId: { default: '' },
      _mediaId: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => <BlogImageRenderer {...props} />,
  }
);

function BlogImageRenderer({ block, editor }) {
  const { url, caption, _imageId } = block.props;
  const [mode, setMode] = useState('idle'); // idle | embed | generate | uploading | generating
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedError, setEmbedError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(caption || '');
  const fileInputRef = useRef(null);
  const blockRef = useRef(null);
  const embedInputRef = useRef(null);
  const aiInputRef = useRef(null);

  // Focus inputs when mode changes
  useEffect(() => {
    if (mode === 'embed') setTimeout(() => embedInputRef.current?.focus(), 50);
    if (mode === 'generate') setTimeout(() => aiInputRef.current?.focus(), 50);
  }, [mode]);

  // Keyboard: backspace to delete when focused
  useEffect(() => {
    const el = blockRef.current;
    if (!el) return;
    function handleKey(e) {
      if ((e.key === 'Backspace' || e.key === 'Delete') && mode === 'idle' && !url) {
        e.preventDefault();
        try { editor.removeBlocks([block.id]); } catch {}
      }
    }
    el.addEventListener('keydown', handleKey);
    return () => el.removeEventListener('keydown', handleKey);
  }, [editor, block.id, mode, url]);

  // Upload helper
  const uploadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setMode('uploading');
    setUploadStatus('Compressing...');
    try {
      const { compressBlogImage } = await import('../../../utils/compressImage');
      const { blob } = await compressBlogImage(file);
      setUploadStatus('Uploading...');
      const formData = new FormData();
      formData.append('file', blob, `img_${Date.now()}.webp`);
      formData.append('type', 'image');
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      editor.updateBlock(block.id, { props: { url: data.url, _mediaId: data.id || '' } });
      setMode('idle');
    } catch (err) {
      console.error('Upload failed:', err);
      showFailToast('Image upload failed');
      setMode('idle');
    }
  }, [editor, block.id]);

  // Paste handler
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        uploadFile(item.getAsFile());
        return;
      }
    }
  }, [uploadFile]);

  // Drag and drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) uploadFile(file);
  }, [uploadFile]);

  // Embed URL submit
  const handleEmbed = useCallback(() => {
    const trimmed = embedUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('https://')) {
      setEmbedError('URL must start with https://');
      return;
    }
    editor.updateBlock(block.id, { props: { url: trimmed } });
    setMode('idle');
    setEmbedUrl('');
    setEmbedError('');
  }, [embedUrl, editor, block.id]);

  // AI image generate via lixsearch
  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setMode('generating');
    try {
      const { getOrCreateSession, streamAI, reuploadImage } = await import('../../../ai/agent');

      // Use a lightweight ephemeral session for manual image generation
      // We pass a dummy slugid — the session route handles missing blogs gracefully
      const sessionId = await getOrCreateSession('_img_gen');

      // Stream a "generate image" request through lixsearch
      let imageUrl = null;
      await streamAI({
        sessionId,
        systemPrompt: 'You are an image generation assistant. When asked to generate an image, create it. Output only the image, no extra text.',
        userPrompt: `Generate an image: ${aiPrompt.trim()}`,
        onImage: ({ url }) => { imageUrl = url; },
        onDone: () => {},
      });

      if (!imageUrl) throw new Error('No image generated');

      // Show the lixsearch URL as preview immediately
      editor.updateBlock(block.id, { props: { url: imageUrl } });

      // Re-upload to Cloudinary for persistence
      const uploaded = await reuploadImage(imageUrl, aiPrompt.trim());
      if (uploaded) {
        editor.updateBlock(block.id, { props: { url: uploaded.url, _mediaId: uploaded.id } });
      }

      setMode('idle');
      setAiPrompt('');
    } catch (err) {
      console.error('AI image generation failed:', err);
      showFailToast(err.message || 'Image generation failed');
      try {
        editor.updateBlock(block.id, { type: 'paragraph', props: {}, content: [] });
      } catch { /* block may already be gone */ }
    }
  }, [aiPrompt, editor, block.id]);

  // Toast on failure — inject a temporary toast element
  const showFailToast = useCallback((msg) => {
    const toast = document.createElement('div');
    toast.className = 'blog-img-fail-toast';
    toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink:0"><circle cx="8" cy="8" r="7" stroke="#f87171" stroke-width="1.5"/><path d="M8 4.5v4" stroke="#f87171" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11" r=".75" fill="#f87171"/></svg><span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('blog-img-fail-toast--out'); }, 3200);
    setTimeout(() => { toast.remove(); }, 3600);
  }, []);

  const handleDelete = useCallback(() => {
    // Delete from Cloudinary if we have a mediaId
    const mediaId = block.props._mediaId;
    if (mediaId) {
      fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      }).catch(() => {}); // fire and forget
    }
    try { editor.removeBlocks([block.id]); } catch {}
  }, [editor, block.id, block.props._mediaId]);

  const handleReplace = useCallback(() => {
    // Delete old image from Cloudinary
    const mediaId = block.props._mediaId;
    if (mediaId) {
      fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      }).catch(() => {});
    }
    editor.updateBlock(block.id, { props: { url: '', _mediaId: '' } });
    setMode('idle');
  }, [editor, block.id, block.props._mediaId]);

  const handleCaptionSave = useCallback(() => {
    editor.updateBlock(block.id, { props: { caption: captionText } });
    setEditingCaption(false);
  }, [editor, block.id, captionText]);

  // AI is generating this image (inserted by AI agent with _imageId but no url yet)
  const isAiPlaceholder = !!_imageId && !url;

  // ─── No image yet ───
  if (!url) {
    // If this is an AI-generated placeholder, show only the skeleton loading
    if (isAiPlaceholder || mode === 'generating') {
      return (
        <div ref={blockRef} className="blog-img-empty blog-img-empty--generating" tabIndex={-1} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div className="blog-img-generating">
            <div className="blog-img-gen-shimmer" />
            <div className="blog-img-gen-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/>
              </svg>
              Generating image...
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={blockRef}
        className="blog-img-empty"
        tabIndex={0}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        data-drag-over={isDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ''; }}
          style={{ display: 'none' }}
        />

        {/* Uploading state */}
        {mode === 'uploading' && (
          <div className="blog-img-status">
            <div className="blog-img-spinner" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* Idle — 3 action buttons */}
        {mode === 'idle' && (
          <>
            <div className="blog-img-actions-row">
              <button className="blog-img-action" onClick={() => fileInputRef.current?.click()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload
              </button>
              <button className="blog-img-action" onClick={() => setMode('embed')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                Embed URL
              </button>
              <button className="blog-img-action blog-img-action-ai" onClick={() => setMode('generate')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/>
                </svg>
                Generate
              </button>
            </div>
            <p className="blog-img-hint">or drag & drop / paste an image</p>
          </>
        )}

        {/* Embed URL input — below the placeholder */}
        {mode === 'embed' && (
          <div className="blog-img-input-row">
            <input
              ref={embedInputRef}
              type="url"
              value={embedUrl}
              onChange={(e) => { setEmbedUrl(e.target.value); setEmbedError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEmbed();
                if (e.key === 'Escape') { setMode('idle'); setEmbedUrl(''); setEmbedError(''); }
              }}
              placeholder="https://example.com/image.jpg"
              className="blog-img-url-input"
            />
            <button className="blog-img-submit-btn" onClick={handleEmbed} disabled={!embedUrl.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button className="blog-img-cancel-btn" onClick={() => { setMode('idle'); setEmbedUrl(''); setEmbedError(''); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {embedError && <span className="blog-img-error">{embedError}</span>}
          </div>
        )}

        {/* AI prompt input — below the placeholder */}
        {mode === 'generate' && (
          <div className="blog-img-input-row">
            <input
              ref={aiInputRef}
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && aiPrompt.trim()) handleGenerate();
                if (e.key === 'Escape') { setMode('idle'); setAiPrompt(''); }
              }}
              placeholder="Describe the image you want..."
              className="blog-img-url-input blog-img-ai-input"
            />
            <button className="blog-img-submit-btn blog-img-ai-submit" onClick={handleGenerate} disabled={!aiPrompt.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21"/>
              </svg>
            </button>
            <button className="blog-img-cancel-btn" onClick={() => { setMode('idle'); setAiPrompt(''); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Image loaded ───
  return (
    <div ref={blockRef} className="blog-img-loaded" tabIndex={0} onPaste={handlePaste}>
      <div className="blog-img-wrapper">
        <img src={url} alt={caption || 'Blog image'} className="blog-img-main" draggable={false} />
        <div className="blog-img-hover-overlay">
          <div className="blog-img-hover-actions">
            <button className="blog-img-hover-btn" onClick={handleReplace}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
            <button className="blog-img-hover-btn" onClick={() => setEditingCaption(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button className="blog-img-hover-btn blog-img-hover-delete" onClick={handleDelete}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      {editingCaption ? (
        <input
          type="text"
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCaptionSave(); if (e.key === 'Escape') { setEditingCaption(false); setCaptionText(caption || ''); } }}
          onBlur={handleCaptionSave}
          placeholder="Add a caption..."
          className="blog-img-caption-input"
          autoFocus
        />
      ) : (
        <p
          className={`blog-img-caption ${caption ? '' : 'blog-img-caption--empty'}`}
          onClick={() => { setCaptionText(caption || ''); setEditingCaption(true); }}
        >
          {caption || 'Add a caption...'}
        </p>
      )}
    </div>
  );
}
