'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const ASPECT_RATIO = 16 / 5; // ~3.2:1, wide banner
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH / ASPECT_RATIO);
const OUTPUT_QUALITY = 0.45; // heavy compression

export default function BannerUploadModal({ onSave, onClose, currentBanner }) {
  const [tab, setTab] = useState('upload');
  const [imageSrc, setImageSrc] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 });
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, cropX: 0, cropY: 0 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const resetState = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0, scale: 1 });
    setFilters({ brightness: 100, contrast: 100 });
    setUrlError('');
  };

  const loadImage = useCallback((src) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setCrop({ x: 0, y: 0, scale: 1 });
      setFilters({ brightness: 100, contrast: 100 });
      setImageSrc(src);
    };
    img.onerror = () => setUrlError('Failed to load image');
    img.src = src;
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setUrlError('File too large (max 20MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => loadImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    setUrlError('');
    if (!urlInput.trim()) return;
    loadImage(urlInput.trim());
  };

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
    ctx.fillStyle = '#141a26';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const fitScale = Math.max(CANVAS_WIDTH / img.naturalWidth, CANVAS_HEIGHT / img.naturalHeight);
    const drawScale = fitScale * crop.scale;
    const drawW = img.naturalWidth * drawScale;
    const drawH = img.naturalHeight * drawScale;
    const drawX = (CANVAS_WIDTH - drawW) / 2 + crop.x;
    const drawY = (CANVAS_HEIGHT - drawH) / 2 + crop.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.filter = 'none';
  }, [imageSrc, crop, filters]);

  // Drag handlers
  const handleMouseDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, cropX: crop.x, cropY: crop.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    // Scale mouse movement to canvas coordinates
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const dx = (e.clientX - dragStart.current.x) * scaleX;
    const dy = (e.clientY - dragStart.current.y) * scaleY;
    setCrop((prev) => ({ ...prev, x: dragStart.current.cropX + dx, y: dragStart.current.cropY + dy }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Touch drag
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX, y: t.clientY, cropX: crop.x, cropY: crop.y };
  };

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    const t = e.touches[0];
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const dx = (t.clientX - dragStart.current.x) * scaleX;
    const dy = (t.clientY - dragStart.current.y) * scaleY;
    setCrop((prev) => ({ ...prev, x: dragStart.current.cropX + dx, y: dragStart.current.cropY + dy }));
  }, [dragging]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragging, handleTouchMove, handleMouseUp]);

  const handleWheel = (e) => {
    e.preventDefault();
    setCrop((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(4, prev.scale + (e.deltaY > 0 ? -0.05 : 0.05))),
    }));
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);

    // Convert to blob for smaller payload
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
        }
        setSaving(false);
      },
      'image/webp',
      OUTPUT_QUALITY
    );
  };

  const handleRemove = () => {
    onSave(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-[720px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Edit Banner</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs — only show when no image loaded */}
        {!imageSrc && (
          <div className="flex border-b border-[var(--border-default)]">
            {[
              { key: 'upload', label: 'Upload', icon: 'cloud-upload-outline' },
              { key: 'url', label: 'From URL', icon: 'link-outline' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); resetState(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-colors ${
                  tab === t.key
                    ? 'text-[var(--text-primary)] border-b-2 border-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-body)] border-b-2 border-transparent'
                }`}
              >
                <ion-icon name={t.icon} style={{ fontSize: '15px' }} />
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-6">
          {/* Upload tab */}
          {tab === 'upload' && !imageSrc && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-[var(--border-default)] border-[var(--border-default)]ashed border-[var(--border-default)] rounded-xl h-[180px] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--border-hover)] transition-colors group"
            >
              <svg className="w-8 h-8 text-[#333] group-hover:text-[var(--text-muted)] transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[var(--text-muted)] text-[13px]">Drop an image or click to browse</p>
              <p className="text-[var(--text-muted)] text-[11px] mt-1">Recommended: 1200x375 or wider. Max 20MB.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          )}

          {/* URL tab */}
          {tab === 'url' && !imageSrc && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  placeholder="https://example.com/banner.jpg"
                  className="flex-1 bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-4 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[var(--border-hover)] transition-colors placeholder-[#6b7a8d]"
                />
                <button
                  onClick={handleUrlSubmit}
                  className="px-5 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-lg text-[13px] hover:bg-[#b69aff] transition-colors"
                >
                  Load
                </button>
              </div>
              {urlError && <p className="text-red-400 text-[11px]">{urlError}</p>}
            </div>
          )}

          {/* Editor view */}
          {imageSrc && (
            <div className="space-y-5">
              {/* Canvas preview */}
              <div
                ref={containerRef}
                className="relative rounded-xl overflow-hidden border border-[var(--border-default)] cursor-grab active:cursor-grabbing mx-auto select-none"
                style={{ width: '100%', aspectRatio: `${ASPECT_RATIO}` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onWheel={handleWheel}
              >
                <canvas ref={canvasRef} className="w-full h-full block" />
                {/* Corner hint */}
                <div className="absolute bottom-2 right-2 bg-black/50 rounded-md px-2 py-1 text-[10px] text-[#999] pointer-events-none">
                  Drag to reposition
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-3 gap-4">
                {/* Zoom */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">Zoom</label>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>
                    <input
                      type="range"
                      min="0.3"
                      max="4"
                      step="0.05"
                      value={crop.scale}
                      onChange={(e) => setCrop((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
                      className="flex-1 accent-white h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer"
                    />
                    <span className="text-[11px] text-[var(--text-muted)] w-8 text-right">{Math.round(crop.scale * 100)}%</span>
                  </div>
                </div>

                {/* Brightness */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">Brightness</label>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={filters.brightness}
                      onChange={(e) => setFilters((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))}
                      className="flex-1 accent-white h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer"
                    />
                    <span className="text-[11px] text-[var(--text-muted)] w-8 text-right">{filters.brightness}%</span>
                  </div>
                </div>

                {/* Contrast */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">Contrast</label>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /><path d="M12 3v18" strokeWidth={2} /></svg>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={filters.contrast}
                      onChange={(e) => setFilters((prev) => ({ ...prev, contrast: parseInt(e.target.value) }))}
                      className="flex-1 accent-white h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer"
                    />
                    <span className="text-[11px] text-[var(--text-muted)] w-8 text-right">{filters.contrast}%</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={resetState}
                    className="px-4 py-2 text-[13px] text-[#888] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] rounded-lg transition-colors"
                  >
                    Change Image
                  </button>
                  {currentBanner && (
                    <button
                      onClick={handleRemove}
                      className="px-4 py-2 text-[13px] text-red-400 hover:text-red-300 bg-[var(--bg-elevated)] rounded-lg transition-colors"
                    >
                      Remove Banner
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-lg text-[13px] hover:bg-[#b69aff] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-[var(--border-default)] border-[#131922] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Save Banner'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
