'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import { isSignedIn, spendCredits, fetchCredits } from '../../lib/auth';
import { useModels } from '../../lib/useModels';
import styles from './Editor.module.css';

const API_BASE = '/api';

const TOOLS = [
  { id: 'pan', icon: 'M9 3h6v2H9V3zM5 7h14v2H5V7zM3 11h18v2H3v-2zM5 15h14v2H5v-2zM9 19h6v2H9v-2z', label: 'Pan' },
  { id: 'select', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', label: 'Select' },
  { id: 'inpaint', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z', label: 'Inpaint' },
  { id: 'eraser', icon: 'M20 20H7L3 16l9-9 8 8-4 4zM6.5 13.5l5-5', label: 'Eraser' },
  { id: 'crop', icon: 'M6 2v4H2v2h4v12h2V8h12V6H8V2H6zM18 22v-4h4v-2h-4V4h-2v12H4v2h12v4h2z', label: 'Crop' },
  { id: 'layers', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', label: 'Layers' },
];

const CANVAS_MODES = [
  { id: 'inpaint', label: 'Inpaint / Outpaint' },
  { id: 'img2img', label: 'Image to Image' },
  { id: 'sketch2img', label: 'Sketch to Image' },
];

const EDIT_PRESETS = [
  { id: 'remove-bg', label: 'Remove Background', icon: 'M4 4h16v16H4z M9 9h6v6H9z', prompt: 'Remove the background completely, make it transparent, keep only the main subject' },
  { id: 'outpaint', label: 'Extend Image', icon: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7', prompt: 'Extend the image beyond its current borders, seamlessly continuing the scene' },
  { id: 'fix-pose', label: 'Fix Character Pose', icon: 'M12 5a2 2 0 100-4 2 2 0 000 4zM12 7v5M9 12l-3 5M15 12l3 5', prompt: 'Fix and adjust the character pose naturally while keeping the same identity and style' },
  { id: 'upscale', label: 'Enhance / Upscale', icon: 'M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7', prompt: 'Enhance and upscale this image, improve details, sharpness and quality' },
  { id: 'relight', label: 'Relight Scene', icon: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42', prompt: 'Relight this scene with warm cinematic golden-hour lighting, soft shadows' },
  { id: 'style-transfer', label: 'Style Transfer', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20', prompt: 'Apply an artistic painterly style to this image while preserving the composition' },
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

  // Canvas refs
  const canvasRef = useRef(null);
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

  // Drawing handlers
  const startDraw = (e) => {
    if (activeTool !== 'inpaint' && activeTool !== 'eraser') return;
    isDrawing.current = true;
    draw(e);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
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

  const endDraw = () => { isDrawing.current = false; };

  const clearMask = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    ctx.clearRect(0, 0, mask.width, mask.height);
  };

  // Run edit
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
        body: JSON.stringify({
          prompt: finalPrompt,
          imageUrl: imageSrc,
          model,
          width,
          height,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');
      const newSrc = data.imageData || data.imageUrl;
      setImageSrc(newSrc);
      // Update session
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

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleZoomReset = () => setZoom(100);

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
              onClick={() => setActiveTool(t.id)}
              title={t.label}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={t.icon} />
              </svg>
            </button>
          ))}

          <div className={styles.toolDivider} />

          {/* Quick edit presets */}
          {EDIT_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p.id}
              className={styles.toolBtn}
              onClick={() => handlePresetClick(p)}
              title={p.label}
              disabled={generating}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={p.icon} />
              </svg>
            </button>
          ))}

          <div className={styles.toolbarSpacer} />

          <button className={styles.toolBtn} onClick={clearMask} title="Undo mask">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 10h10a5 5 0 015 5v2a5 5 0 01-5 5H3" />
              <polyline points="8 15 3 10 8 5" />
            </svg>
          </button>
        </div>

        {/* Canvas area */}
        <div className={styles.canvasArea} ref={containerRef}>
          {imageSrc ? (
            <div className={styles.canvasWrap} style={{ transform: `scale(${zoom / 100})` }}>
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
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                style={{ cursor: activeTool === 'inpaint' || activeTool === 'eraser' ? 'crosshair' : 'grab' }}
              />
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

          {/* Prompt bar at bottom of canvas */}
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
          {/* Canvas mode */}
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

          {/* Outpaint toggle */}
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

          {/* Inpaint strength */}
          <div className={styles.settingsSection}>
            <div className={styles.settingsRow}>
              <span className={styles.settingsLabel}>Inpaint Strength</span>
              <span className={styles.settingsValue}>{inpaintStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={inpaintStrength}
              onChange={(e) => setInpaintStrength(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>

          {/* Brush size */}
          <div className={styles.settingsSection}>
            <div className={styles.settingsRow}>
              <span className={styles.settingsLabel}>Brush Size</span>
              <span className={styles.settingsValue}>{brushSize}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          {/* Dimensions */}
          <div className={styles.settingsSection}>
            <h3 className={styles.settingsLabel}>Image Dimensions</h3>
            <div className={styles.dimGrid}>
              {[
                [512, 512], [768, 768],
                [512, 1024], [768, 1024],
                [1024, 768], [1024, 1024],
              ].map(([w, h]) => (
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

          {/* Quick edits */}
          <div className={styles.settingsSection}>
            <h3 className={styles.settingsLabel}>Quick Edits</h3>
            <div className={styles.presetGrid}>
              {EDIT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={styles.presetBtn}
                  onClick={() => handlePresetClick(p)}
                  disabled={generating}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d={p.icon} />
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
