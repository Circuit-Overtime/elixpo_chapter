'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useModels } from '../../lib/useModels';
import styles from './Editor.module.css';

const API_BASE = '/api';

const TOOLS = [
  { id: 'pan', label: 'Pan' },
  { id: 'select', label: 'Select' },
  { id: 'inpaint', label: 'Inpaint' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'crop', label: 'Crop' },
  { id: 'layers', label: 'Layers' },
];

const TOOL_ICONS = {
  pan: <><path d="M18 11V6a2 2 0 00-4 0v6" /><path d="M14 10V4a2 2 0 00-4 0v7" /><path d="M10 10.5V5a2 2 0 00-4 0v9" /><path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-4-1-5.5-3L4 15" /></>,
  select: <><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></>,
  inpaint: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
  eraser: <><path d="M20 20H7L3 16l9-9 8 8-4 4z" /><path d="M6.5 13.5l5-5" /></>,
  crop: <><path d="M6 2v4H2v2h4v12h2V8h12V6H8V2H6z" /><path d="M18 22v-4h4v-2h-4V4h-2v12H4v2h12v4h2z" /></>,
  layers: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
};

const CANVAS_MODES = [
  { id: 'inpaint', label: 'Inpaint / Outpaint' },
  { id: 'img2img', label: 'Image to Image' },
  { id: 'sketch2img', label: 'Sketch to Image' },
];

const EDIT_PRESETS = [
  { id: 'remove-bg', label: 'Remove Background', icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" /></>, prompt: null, comingSoon: true },
  { id: 'outpaint', label: 'Extend Image', icon: <><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></>, prompt: 'Extend the image beyond its current borders, seamlessly continuing the scene' },
  { id: 'fix-pose', label: 'Fix Character Pose', icon: <><circle cx="12" cy="4" r="2" /><path d="M12 6v5" /><path d="M9 11l-3 5" /><path d="M15 11l3 5" /></>, prompt: 'Fix and adjust the character pose naturally while keeping the same identity and style' },
  { id: 'upscale', label: 'Enhance / Upscale', icon: <><path d="M15 3h6v6" /><path d="M14 10l7-7" /><path d="M9 21H3v-6" /><path d="M10 14l-7 7" /></>, prompt: null, comingSoon: true },
  { id: 'relight', label: 'Relight Scene', icon: <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2" /></>, prompt: 'Relight this scene with warm cinematic golden-hour lighting, soft shadows' },
  { id: 'style-transfer', label: 'Style Transfer', icon: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /></>, prompt: 'Apply an artistic painterly style to this image while preserving the composition' },
];

export default function EditorPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { editModels } = useModels();

  // Image state
  const [imageSrc, setImageSrc] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [model, setModel] = useState('gptimage');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);

  // Editor state
  const [activeTool, setActiveTool] = useState('pan');
  const [canvasMode, setCanvasMode] = useState('inpaint');
  const [brushSize, setBrushSize] = useState(40);
  const [inpaintStrength, setInpaintStrength] = useState(0.65);
  const [outpaintEnabled, setOutpaintEnabled] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  // Pan state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });

  // Canvas refs
  const maskCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const isDrawing = useRef(false);

  // Load image from session
  useEffect(() => {
    const raw = sessionStorage.getItem(`gen_${id}`);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setImageSrc(data.resultSrc || data.imageUrl);
        setOriginalPrompt(data.prompt || '');
        setModel(data.model || 'gptimage');
        setWidth(data.width || 1024);
        setHeight(data.height || 576);
      } catch {}
    }
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete image when selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && imageSrc) {
        e.preventDefault();
        setImageSrc(null);
        setSelected(false);
        // Update session
        const raw = sessionStorage.getItem(`gen_${id}`);
        if (raw) {
          const session = JSON.parse(raw);
          delete session.resultSrc;
          sessionStorage.setItem(`gen_${id}`, JSON.stringify(session));
        }
      }
      // Escape deselects
      if (e.key === 'Escape') {
        setSelected(false);
        setModelOpen(false);
      }
      // Tool shortcuts
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'v' || e.key === 'V') setActiveTool('pan');
      if (e.key === 's' || e.key === 'S') { if (!e.ctrlKey && !e.metaKey) setActiveTool('select'); }
      if (e.key === 'b' || e.key === 'B') setActiveTool('inpaint');
      if (e.key === 'e' || e.key === 'E') setActiveTool('eraser');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, imageSrc, id]);

  // Scroll to zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => Math.max(10, Math.min(400, z + (e.deltaY < 0 ? 10 : -10))));
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Initialize mask canvas when image loads
  const initMaskCanvas = useCallback(() => {
    const img = imgRef.current;
    const mask = maskCanvasRef.current;
    if (!img || !mask) return;
    mask.width = img.naturalWidth || img.width;
    mask.height = img.naturalHeight || img.height;
    const ctx = mask.getContext('2d');
    ctx.clearRect(0, 0, mask.width, mask.height);
  }, []);

  // ─── Pan handlers ───
  const handleCanvasPointerDown = (e) => {
    if (activeTool === 'pan') {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffsetStart.current = { ...panOffset };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (activeTool === 'select') {
      setSelected(true);
    } else if (activeTool === 'inpaint' || activeTool === 'eraser') {
      isDrawing.current = true;
      drawAt(e);
    }
  };

  const handleCanvasPointerMove = (e) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanOffset({
        x: panOffsetStart.current.x + dx,
        y: panOffsetStart.current.y + dy,
      });
    } else if (isDrawing.current) {
      drawAt(e);
    }
  };

  const handleCanvasPointerUp = () => {
    isPanning.current = false;
    isDrawing.current = false;
  };

  // ─── Drawing ───
  const drawAt = (e) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const rect = mask.getBoundingClientRect();
    const scaleX = mask.width / rect.width;
    const scaleY = mask.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const ctx = mask.getContext('2d');
    ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = 'rgba(86, 145, 243, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize * scaleX, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearMask = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    ctx.clearRect(0, 0, mask.width, mask.height);
  };

  // ─── Run edit ───
  const handleEdit = async (editPrompt) => {
    if (!imageSrc) return;
    const finalPrompt = editPrompt || prompt.trim();
    if (!finalPrompt) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/generate/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, imageUrl: imageSrc, model, width, height }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');
      const newSrc = data.imageData || data.imageUrl;
      setImageSrc(newSrc);
      const raw = sessionStorage.getItem(`gen_${id}`);
      if (raw) {
        const session = JSON.parse(raw);
        session.resultSrc = newSrc;
        session.prompt = finalPrompt;
        session.model = model;
        sessionStorage.setItem(`gen_${id}`, JSON.stringify(session));
      }
      clearMask();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePresetClick = (preset) => {
    setPrompt(preset.prompt);
    handleEdit(preset.prompt);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 400));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 10));
  const handleZoomReset = () => { setZoom(100); setPanOffset({ x: 0, y: 0 }); };

  const getCursor = () => {
    if (activeTool === 'pan') return isPanning.current ? 'grabbing' : 'grab';
    if (activeTool === 'select') return 'default';
    if (activeTool === 'inpaint' || activeTool === 'eraser') return 'crosshair';
    return 'default';
  };

  const selectedModel = editModels.find((m) => m.id === model) || editModels[0];

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.exitBtn} onClick={() => router.push(`/generate/${id}`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Exit the editor
        </button>

        <div className={styles.topCenter}>
          <div className={styles.zoomControls}>
            <button className={styles.zoomBtn} onClick={handleZoomOut}>-</button>
            <button className={styles.zoomBtn} onClick={handleZoomReset}>{zoom}%</button>
            <button className={styles.zoomBtn} onClick={handleZoomIn}>+</button>
          </div>
        </div>

        <div className={styles.topRight}>
          {selectedModel && (
            <div className={styles.modelSelector}>
              <button className={styles.modelBtn} onClick={() => setModelOpen(!modelOpen)}>
                {selectedModel.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {modelOpen && (
                <div className={styles.modelDropdown}>
                  {editModels.map((m) => (
                    <button
                      key={m.id}
                      className={`${styles.modelItem} ${m.id === model ? styles.modelItemActive : ''}`}
                      onClick={() => { setModel(m.id); setModelOpen(false); }}
                    >
                      <span>{m.label}</span>
                      <span className={styles.modelDesc}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.editorLayout}>
        {/* Left toolbar */}
        <div className={styles.toolbar}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`${styles.toolBtn} ${activeTool === t.id ? styles.toolActive : ''}`}
              onClick={() => { setActiveTool(t.id); if (t.id !== 'select') setSelected(false); }}
              title={t.label}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {TOOL_ICONS[t.id]}
              </svg>
            </button>
          ))}

          <div className={styles.toolDivider} />

          {EDIT_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p.id}
              className={`${styles.toolBtn} ${p.comingSoon ? styles.toolComingSoon : ''}`}
              onClick={() => !p.comingSoon && handlePresetClick(p)}
              title={p.comingSoon ? `${p.label} (Coming Soon)` : p.label}
              disabled={generating || !imageSrc || p.comingSoon}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {p.icon}
              </svg>
            </button>
          ))}

          <div className={styles.toolbarSpacer} />

          <button className={styles.toolBtn} onClick={clearMask} title="Clear mask">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 10h10a5 5 0 015 5v2a5 5 0 01-5 5H3" />
              <polyline points="8 15 3 10 8 5" />
            </svg>
          </button>
        </div>

        {/* Canvas + prompt bar area */}
        <div className={styles.canvasColumn}>
          {/* Canvas viewport */}
          <div
            className={styles.canvasArea}
            ref={containerRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            style={{ cursor: getCursor() }}
          >
            {imageSrc ? (
              <div
                className={styles.canvasWrap}
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                }}
              >
                <div className={`${styles.imageFrame} ${selected ? styles.imageSelected : ''}`}>
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Edit canvas"
                    className={styles.canvasImage}
                    onLoad={initMaskCanvas}
                    draggable={false}
                  />
                  <canvas
                    ref={maskCanvasRef}
                    className={styles.maskCanvas}
                  />
                  {selected && (
                    <>
                      <div className={`${styles.handle} ${styles.handleTL}`} />
                      <div className={`${styles.handle} ${styles.handleTR}`} />
                      <div className={`${styles.handle} ${styles.handleBL}`} />
                      <div className={`${styles.handle} ${styles.handleBR}`} />
                    </>
                  )}
                </div>
                {generating && (
                  <div className={styles.canvasLoading}>
                    <div className={styles.canvasSpinner} />
                    <span>Generating...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.canvasEmpty}>
                <p>No image loaded</p>
                <button className={styles.backBtn} onClick={() => router.push('/generate')}>Go to Generate</button>
              </div>
            )}
          </div>

          {/* Prompt bar — always at bottom */}
          <div className={styles.promptBar}>
            <button className={styles.promptSettingsBtn} title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
              </svg>
            </button>
            <input
              type="text"
              className={styles.promptInput}
              placeholder="Describe your edit..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); }}
            />
            <button
              className={styles.generateBtn}
              onClick={() => handleEdit()}
              disabled={generating || !prompt.trim() || !imageSrc}
            >
              Generate
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right settings panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.settingsSection}>
            <h3 className={styles.settingsLabel}>Canvas Mode</h3>
            <div className={styles.modeSelector}>
              {CANVAS_MODES.map((m) => (
                <button
                  key={m.id}
                  className={`${styles.modeBtn} ${canvasMode === m.id ? styles.modeBtnActive : ''}`}
                  onClick={() => setCanvasMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingsSection}>
            <div className={styles.settingsRow}>
              <span className={styles.settingsLabel}>Outpaint</span>
              <button
                className={`${styles.toggle} ${outpaintEnabled ? styles.toggleOn : ''}`}
                onClick={() => setOutpaintEnabled(!outpaintEnabled)}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>

          <div className={styles.settingsSection}>
            <div className={styles.settingsRow}>
              <span className={styles.settingsLabel}>Inpaint Strength</span>
              <span className={styles.settingsValue}>{inpaintStrength.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={inpaintStrength}
              onChange={(e) => setInpaintStrength(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.settingsSection}>
            <div className={styles.settingsRow}>
              <span className={styles.settingsLabel}>Brush Size</span>
              <span className={styles.settingsValue}>{brushSize}px</span>
            </div>
            <input
              type="range" min="5" max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.settingsSection}>
            <h3 className={styles.settingsLabel}>Image Dimensions</h3>
            <div className={styles.dimGrid}>
              {[[512, 512], [768, 768], [512, 1024], [768, 1024], [1024, 768], [1024, 1024]].map(([w, h]) => (
                <button
                  key={`${w}x${h}`}
                  className={`${styles.dimBtn} ${width === w && height === h ? styles.dimBtnActive : ''}`}
                  onClick={() => { setWidth(w); setHeight(h); }}
                >
                  {w} x {h}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingsSection}>
            <h3 className={styles.settingsLabel}>Quick Edits</h3>
            <div className={styles.presetGrid}>
              {EDIT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={styles.presetBtn}
                  onClick={() => handlePresetClick(p)}
                  disabled={generating || !imageSrc}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {p.icon}
                  </svg>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
