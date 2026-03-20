'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import { saveToLibrary } from '../../lib/library';
import { isSignedIn, getUser, checkAndIncrement, fetchUsage } from '../../lib/auth';
import styles from './Session.module.css';

const IMAGE_MODELS = [
  { id: 'flux', label: 'Flux' },
  { id: 'gptimage', label: 'GPT Image' },
  { id: 'seedream5', label: 'Seedream 5' },
  { id: 'nanobanana', label: 'Nano Banana' },
  { id: 'kontext', label: 'Kontext' },
  { id: 'imagen-4', label: 'Imagen 4' },
  { id: 'zimage', label: 'Z-Image' },
  { id: 'klein', label: 'Klein' },
];

const VIDEO_MODELS = [
  { id: 'veo', label: 'Veo' },
  { id: 'seedance', label: 'Seedance' },
  { id: 'seedance-pro', label: 'Seedance Pro' },
  { id: 'wan', label: 'Wan' },
  { id: 'ltx-2', label: 'LTX-2' },
];

const ALL_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS];

const POLLINATIONS_BASE = 'https://gen.pollinations.ai';
const POLLI_TOKEN = process.env.NEXT_PUBLIC_POLLINATIONS_API_IMAGE;

export default function SessionPage({ params }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [model, setModel] = useState('flux');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);
  const [mode, setMode] = useState('image');
  const [genStyle, setGenStyle] = useState(null);
  const [duration, setDuration] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [seed, setSeed] = useState(0);

  const [resultSrc, setResultSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generationTime, setGenerationTime] = useState(null);

  const [modelOpen, setModelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const hasGenerated = useRef(false);
  const moreMenuRef = useRef(null);

  // Remix brush state
  const [remixMode, setRemixMode] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [remixPrompt, setRemixPrompt] = useState('');
  const [remixLoading, setRemixLoading] = useState(false);
  const [newRefImage, setNewRefImage] = useState(null);
  const [newRefPreview, setNewRefPreview] = useState(null);
  const refInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const isDrawing = useRef(false);

  // Determine ref image limit by tier
  const getRefImageLimit = () => {
    if (!isSignedIn()) return 1; // guest
    return 2; // free and above
  };

  // Clipboard paste → reference image
  useEffect(() => {
    const handlePaste = (e) => {
      if (remixMode) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          if (newRefImage && getRefImageLimit() <= 1) return; // guest limit
          const url = URL.createObjectURL(file);
          setNewRefImage(url);
          setNewRefPreview(url);
          return;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [remixMode, newRefImage]);

  // Close more menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Read query params for property overrides
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasGenerated.current) return;
    hasGenerated.current = true;

    const stored = sessionStorage.getItem(`gen_${sessionId}`);
    if (!stored) {
      setError('Session not found. Please start a new generation.');
      setLoading(false);
      return;
    }

    const p = JSON.parse(stored);

    // Query params override stored values
    if (searchParams.get('model')) p.model = searchParams.get('model');
    if (searchParams.get('width')) p.width = Number(searchParams.get('width'));
    if (searchParams.get('height')) p.height = Number(searchParams.get('height'));
    if (searchParams.get('mode')) p.mode = searchParams.get('mode');
    if (searchParams.get('duration')) p.duration = Number(searchParams.get('duration'));
    if (searchParams.get('seed')) p.seed = Number(searchParams.get('seed'));
    if (searchParams.get('image')) p.imageUrl = searchParams.get('image');

    setPrompt(p.prompt);
    setModel(p.model);
    setWidth(p.width);
    setHeight(p.height);
    setMode(p.mode || 'image');
    if (p.style) setGenStyle(p.style);
    setDuration(p.duration);
    setImageUrl(p.imageUrl);
    if (p.seed) setSeed(p.seed);
    if (p.resultSrc) {
      setResultSrc(p.resultSrc);
      setGenerationTime(p.generationTime);
      setSeed(p.seed);
      setLoading(false);
      return;
    }

    generate(p);
  }, [sessionId]);

  const buildUrl = (p, useSeed) => {
    const encoded = encodeURIComponent(p.prompt);
    const isVideo = p.mode === 'video';
    const base = isVideo
      ? `${POLLINATIONS_BASE}/video/${encoded}`
      : `${POLLINATIONS_BASE}/image/${encoded}`;

    const q = new URLSearchParams();
    q.set('model', p.model);
    q.set('width', p.width);
    q.set('height', p.height);
    q.set('nologo', 'true');
    q.set('seed', useSeed || Math.floor(Math.random() * 2147483647));
    q.set('enhance', 'true');
    q.set('referrer', 'elixpoart');
    if (isVideo && p.duration) q.set('duration', p.duration);
    if (p.imageUrl) q.set('image', p.imageUrl);

    return { url: `${base}?${q.toString()}`, seed: parseInt(q.get('seed')) };
  };

  const generate = async (p) => {
    setLoading(true);
    setError(null);
    setResultSrc(null);
    setGenerationTime(null);
    const start = Date.now();

    try {
      // Check daily usage limit
      const usageType = p.mode === 'video' ? 'videos' : 'images';
      const check = await checkAndIncrement(usageType);
      if (!check.allowed) {
        throw new Error(check.error || `Daily ${usageType} limit reached. Sign in or upgrade for more.`);
      }

      const { url, seed: usedSeed } = buildUrl(p);
      setSeed(usedSeed);
      const headers = {};
      if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Generation failed (${res.status})`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const genTime = Date.now() - start;
      setResultSrc(blobUrl);
      setGenerationTime(genTime);

      // Save session
      saveSession({ ...p, seed: usedSeed, resultSrc: blobUrl, generationTime: genTime });

      // Save to library with a thumbnail
      saveThumbnailToLibrary(blob, { ...p, seed: usedSeed, generationTime: genTime });
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (data) => {
    sessionStorage.setItem(`gen_${sessionId}`, JSON.stringify({
      prompt: data.prompt || prompt,
      model: data.model || model,
      width: data.width || width,
      height: data.height || height,
      mode: data.mode || mode,
      duration: data.duration || duration,
      imageUrl: data.imageUrl || imageUrl,
      seed: data.seed || seed,
      resultSrc: data.resultSrc || resultSrc,
      generationTime: data.generationTime || generationTime,
      timestamp: Date.now(),
    }));
  };

  const saveThumbnailToLibrary = async (blob, data) => {
    try {
      // Create a small thumbnail (300px wide) to keep localStorage lightweight
      const bitmap = await createImageBitmap(blob);
      const scale = 300 / bitmap.width;
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

      saveToLibrary({
        sessionId,
        thumbnail,
        prompt: data.prompt || prompt,
        model: data.model || model,
        width: data.width || width,
        height: data.height || height,
        mode: data.mode || mode,
        duration: data.duration || duration,
        seed: data.seed || seed,
        generationTime: data.generationTime || generationTime,
      });
    } catch {
      // Fallback — save without thumbnail
      saveToLibrary({
        sessionId,
        prompt: data.prompt || prompt,
        model: data.model || model,
        width: data.width || width,
        height: data.height || height,
        mode: data.mode || mode,
        seed: data.seed || seed,
      });
    }
  };

  const handleRegenerate = () => {
    generate({ prompt, model, width, height, mode, duration, imageUrl });
  };

  const handleRefImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setNewRefImage(url);
    setNewRefPreview(url);
  };

  const clearRefImage = () => {
    setNewRefImage(null);
    setNewRefPreview(null);
    if (refInputRef.current) refInputRef.current.value = '';
  };

  const handleNewGeneration = () => {
    if (!newPrompt.trim()) return;
    const id = crypto.randomUUID();
    sessionStorage.setItem(`gen_${id}`, JSON.stringify({
      prompt: newPrompt.trim(), model, width, height, mode, duration, imageUrl: newRefImage || null, timestamp: Date.now(),
    }));
    router.push(`/generate/${id}`);
  };

  const handleDownload = () => {
    if (!resultSrc) return;
    const a = document.createElement('a');
    a.href = resultSrc;
    a.download = `elixpo-${sessionId.slice(0, 8)}.${mode === 'video' ? 'mp4' : 'png'}`;
    a.click();
  };

  const handleCopyImage = async () => {
    if (!resultSrc) return;
    try {
      const res = await fetch(resultSrc);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch { /* clipboard may not support image */ }
    setMoreMenuOpen(false);
  };

  const handleCopySeed = () => {
    navigator.clipboard.writeText(String(seed));
    setMoreMenuOpen(false);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
  };

  const handleCreateVideo = () => {
    if (!resultSrc) return;
    const id = crypto.randomUUID();
    sessionStorage.setItem(`gen_${id}`, JSON.stringify({
      prompt, model: 'wan', width, height, mode: 'video', duration: 5, imageUrl: resultSrc, timestamp: Date.now(),
    }));
    router.push(`/generate/${id}`);
  };

  const handleRemoveBackground = async () => {
    if (!resultSrc) return;
    setActionsOpen(false);
    setLoading(true);
    try {
      const check = await checkAndIncrement('edits');
      if (!check.allowed) throw new Error(check.error || 'Daily edit limit reached.');

      const editPrompt = 'Remove the background completely, make it transparent, keep only the main subject';
      const encoded = encodeURIComponent(editPrompt);
      const q = new URLSearchParams();
      q.set('model', 'gptimage');
      q.set('width', width);
      q.set('height', height);
      q.set('nologo', 'true');
      q.set('referrer', 'elixpoart');
      q.set('image', resultSrc);
      const url = `${POLLINATIONS_BASE}/image/${encoded}?${q.toString()}`;
      const headers = {};
      if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Background removal failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setResultSrc(blobUrl);
      setModel('gptimage');
      saveSession({ prompt: editPrompt, model: 'gptimage', resultSrc: blobUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUnzoomed = () => {
    if (!resultSrc) return;
    window.open(resultSrc, '_blank');
    setActionsOpen(false);
  };

  const handleEditPose = async () => {
    if (!resultSrc) return;
    setActionsOpen(false);
    setLoading(true);
    try {
      const check = await checkAndIncrement('edits');
      if (!check.allowed) throw new Error(check.error || 'Daily edit limit reached.');

      const editPrompt = 'Edit the character pose in this image, adjust the body position naturally while keeping the same character and style';
      const encoded = encodeURIComponent(editPrompt);
      const q = new URLSearchParams();
      q.set('model', 'gptimage');
      q.set('width', width);
      q.set('height', height);
      q.set('nologo', 'true');
      q.set('referrer', 'elixpoart');
      q.set('image', resultSrc);
      const url = `${POLLINATIONS_BASE}/image/${encoded}?${q.toString()}`;
      const headers = {};
      if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Pose edit failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setResultSrc(blobUrl);
      setModel('gptimage');
      saveSession({ prompt: editPrompt, model: 'gptimage', resultSrc: blobUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportImage = () => {
    setActionsOpen(false);
    alert('Image has been reported. Thank you for helping keep Elixpo safe.');
  };

  const handleDeleteImage = () => {
    if (!resultSrc) return;
    URL.revokeObjectURL(resultSrc);
    setResultSrc(null);
    sessionStorage.removeItem(`gen_${sessionId}`);
    // Remove from library
    try {
      const lib = JSON.parse(localStorage.getItem('elixpo_library') || '[]');
      const updated = lib.filter((item) => item.sessionId !== sessionId);
      localStorage.setItem('elixpo_library', JSON.stringify(updated));
    } catch {}
    router.push('/generate');
  };

  const handleShareImage = async () => {
    if (!resultSrc) return;
    try {
      const res = await fetch(resultSrc);
      const blob = await res.blob();
      const file = new File([blob], `elixpo-${sessionId.slice(0, 8)}.png`, { type: blob.type });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Elixpo Art', text: prompt, files: [file] });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNewGeneration(); }
  };

  // ── Remix brush logic ──
  const startRemix = () => {
    setRemixMode(true);
    setMoreMenuOpen(false);
    // Init canvas after render
    requestAnimationFrame(() => initCanvas());
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const lastPoint = useRef(null);

  const onBrushDown = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const { x, y } = getCanvasCoords(e);
    lastPoint.current = { x, y };
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = '#06d6a0';
    ctx.fillStyle = '#06d6a0';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const onBrushMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = '#06d6a0';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPoint.current = { x, y };
  };

  const onBrushUp = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const cancelRemix = () => {
    setRemixMode(false);
    setRemixPrompt('');
  };

  const submitRemix = async () => {
    if (!remixPrompt.trim() || !resultSrc) return;
    setRemixLoading(true);

    try {
      // Check edit usage limit
      const check = await checkAndIncrement('edits');
      if (!check.allowed) {
        throw new Error(check.error || 'Daily edit limit reached. Sign in or upgrade for more.');
      }

      const editPrompt = `${remixPrompt.trim()}`;
      const encoded = encodeURIComponent(editPrompt);
      const q = new URLSearchParams();
      q.set('model', 'gptimage');
      q.set('width', width);
      q.set('height', height);
      q.set('nologo', 'true');
      q.set('referrer', 'elixpoart');
      q.set('image', resultSrc);

      const url = `${POLLINATIONS_BASE}/image/${encoded}?${q.toString()}`;
      const headers = {};
      if (POLLI_TOKEN) headers['Authorization'] = `Bearer ${POLLI_TOKEN}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Edit failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      setResultSrc(blobUrl);
      setModel('gptimage');
      setRemixMode(false);
      setRemixPrompt('');
      saveSession({ prompt: editPrompt, model: 'gptimage', resultSrc: blobUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setRemixLoading(false);
    }
  };

  const sel = ALL_MODELS.find((m) => m.id === model) || { label: model };
  const activeModels = mode === 'video' ? VIDEO_MODELS : IMAGE_MODELS;

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.imageContainer}>
            <div className={styles.ambientBlob1} aria-hidden="true" />
            <div className={styles.ambientBlob2} aria-hidden="true" />

            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.brushCanvas}>
                  <div className={styles.brushBlob} />
                  <div className={styles.brushBlob} />
                  <div className={styles.brushBlob} />
                  <div className={styles.brushBlob} />
                  <div className={styles.brushBlob} />
                </div>
                <p className={styles.loadingText}>Generating your creation...</p>
                <p className={styles.loadingHint}>This may take up to a minute</p>
              </div>
            )}

            {error && !loading && (
              <div className={styles.errorState}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p className={styles.errorText}>{error}</p>
                <button className={styles.retryBtn} onClick={handleRegenerate}>Try Again</button>
              </div>
            )}

            {resultSrc && !loading && (
              <div className={styles.imageWrap}>
                {mode === 'video' ? (
                  <video src={resultSrc} className={styles.generatedImage} controls autoPlay loop />
                ) : (
                  <>
                    <img ref={imgRef} src={resultSrc} alt={prompt} className={styles.generatedImage} onLoad={remixMode ? initCanvas : undefined} />
                    {remixMode && (
                      <>
                        <canvas
                          ref={canvasRef}
                          className={styles.remixCanvas}
                          onMouseDown={onBrushDown}
                          onMouseMove={onBrushMove}
                          onMouseUp={onBrushUp}
                          onMouseLeave={onBrushUp}
                          onTouchStart={onBrushDown}
                          onTouchMove={onBrushMove}
                          onTouchEnd={onBrushUp}
                        />
                        <button className={styles.exitEditBtn} onClick={cancelRemix} title="Exit edit mode">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                    {/* Edit button floating on preview */}
                    {!remixMode && (
                      <button className={styles.editFloatBtn} onClick={startRemix} title="Edit image">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Edit
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Remix bar */}
          {remixMode && (
            <div className={styles.remixBar}>
              <div className={styles.remixPromptRow}>
                <input
                  type="text"
                  className={styles.remixInput}
                  placeholder="Describe the changes..."
                  value={remixPrompt}
                  onChange={(e) => setRemixPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitRemix(); }}
                />
                <button className={styles.remixSubmit} onClick={submitRemix} disabled={!remixPrompt.trim() || remixLoading}>
                  {remixLoading ? 'Editing...' : 'Apply'}
                </button>
                <button className={styles.remixCancel} onClick={cancelRemix}>Cancel</button>
              </div>
            </div>
          )}

          {/* Bottom prompt bar (hidden during remix) */}
          {!remixMode && (
            <div className={styles.bottomBar}>
              {newRefPreview && (
                <div className={styles.refPreviewWrap}>
                  <img src={newRefPreview} alt="Reference" className={styles.refPreviewImg} />
                  <button className={styles.refRemoveBtn} onClick={clearRefImage} title="Remove reference">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className={styles.promptBar}>
                <input
                  ref={refInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleRefImage}
                  style={{ display: 'none' }}
                />
                <div className={styles.attachWrap}>
                  <button className={styles.attachBtn} onClick={() => refInputRef.current?.click()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </button>
                  <div className={styles.attachTooltip}>
                    Attach reference image
                    <span className={styles.tooltipHint}>or paste from clipboard</span>
                  </div>
                </div>
                <textarea
                  className={styles.promptInput}
                  placeholder="Type a prompt..."
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <div className={styles.promptActions}>
                  <div className={styles.inlineModel}>
                    <button className={styles.modelBtn} onClick={() => setModelOpen(!modelOpen)}>
                      <span className={styles.modelLabel}>Model</span>
                      <span className={styles.modelName}>{sel.label}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    {modelOpen && (
                      <div className={styles.modelDropdown}>
                        {activeModels.map((m) => (
                          <button key={m.id} className={`${styles.modelOption} ${model === m.id ? styles.modelOptionActive : ''}`}
                            onClick={() => { setModel(m.id); setModelOpen(false); }}>{m.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className={styles.generateBtn} onClick={handleNewGeneration} disabled={!newPrompt.trim()}>
                    Generate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar / Property panel */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {sidebarOpen && (
            <div className={styles.sidebarContent}>
              {/* Session */}
              <div className={styles.sessionBlock}>
                <div className={styles.sessionRow}>
                  <span className={`${styles.statusDot} ${loading ? styles.statusLoading : styles.statusDone}`} />
                  <span className={styles.sessionId}>{sessionId.slice(0, 8)}</span>
                </div>
                {resultSrc && (
                  <div className={styles.quickActions}>
                    <button className={styles.quickActionBtn} onClick={handleShareImage} title="Share">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                    <button className={styles.quickActionBtn} onClick={handleCopyImage} title="Copy image">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                    <button className={styles.quickActionBtn} onClick={handleDownload} title="Download">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button className={`${styles.quickActionBtn} ${styles.quickActionDanger}`} onClick={handleDeleteImage} title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionLabel}>Prompt</h3>
                  <button className={styles.iconBtn} onClick={handleCopyPrompt} title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                </div>
                <p className={styles.promptText}>{prompt}</p>
              </div>

              {/* Properties */}
              <div className={styles.section}>
                <h3 className={styles.sectionLabel}>Properties</h3>
                <div className={styles.propGrid}>
                  <div className={styles.propItem}>
                    <span className={styles.propKey}>Model</span>
                    <span className={styles.propVal}>{sel?.label}</span>
                  </div>
                  <div className={styles.propItem}>
                    <span className={styles.propKey}>Resolution</span>
                    <span className={styles.propVal}>{width}x{height}</span>
                  </div>
                  <div className={styles.propItem}>
                    <span className={styles.propKey}>Seed</span>
                    <span className={styles.propVal}>{seed}</span>
                  </div>
                  {duration && (
                    <div className={styles.propItem}>
                      <span className={styles.propKey}>Duration</span>
                      <span className={styles.propVal}>{duration}s</span>
                    </div>
                  )}
                  {generationTime && (
                    <div className={styles.propItem}>
                      <span className={styles.propKey}>Gen Time</span>
                      <span className={styles.propVal}>{(generationTime / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                  <div className={styles.propItem}>
                    <span className={styles.propKey}>Mode</span>
                    <span className={styles.propVal}>{mode === 'video' ? 'Video' : 'Image'}</span>
                  </div>
                  {genStyle && (
                    <div className={styles.propItem}>
                      <span className={styles.propKey}>Style</span>
                      <span className={styles.propVal}>{genStyle.charAt(0).toUpperCase() + genStyle.slice(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Brush size — visible in remix mode */}
              {remixMode && (
                <div className={styles.section}>
                  <h3 className={styles.sectionLabel}>Brush</h3>
                  <div className={styles.brushControl}>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className={styles.brushSlider}
                    />
                    <span className={styles.brushVal}>{brushSize}px</span>
                  </div>
                </div>
              )}

              {/* Actions — popup */}
              <div className={styles.actionsWrap}>
                <button className={styles.actionsToggle} onClick={() => setActionsOpen(!actionsOpen)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                  </svg>
                  Actions
                </button>
                {actionsOpen && <div className={styles.actionsPopup}><div className={styles.actionList}>
                  <button className={styles.actionBtn} onClick={handleRemoveBackground} disabled={!resultSrc || mode === 'video'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 3v18" /><path d="M15 3v18" /><path d="M3 9h18" /><path d="M3 15h18" />
                    </svg>
                    Remove Background
                  </button>
                  <button className={styles.actionBtn} onClick={handleViewUnzoomed} disabled={!resultSrc}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
                    </svg>
                    View Unzoomed Image
                  </button>
                  <button className={styles.actionBtn} onClick={startRemix} disabled={!resultSrc || mode === 'video'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Edit with Canvas
                  </button>
                  <button className={styles.actionBtn} onClick={handleEditPose} disabled={!resultSrc || mode === 'video'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="2" /><path d="M12 7v5" /><path d="M9 12l-3 5" /><path d="M15 12l3 5" /><path d="M10 12l-2-3" /><path d="M14 12l2-3" />
                    </svg>
                    Edit Character Pose
                  </button>
                  <button className={styles.actionBtn} onClick={handleCreateVideo} disabled={!resultSrc || mode === 'video'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Create Video
                  </button>

                  <div className={styles.actionDivider} />

                  <button className={styles.actionBtn} onClick={handleDownload} disabled={!resultSrc}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Image
                  </button>
                  <button className={styles.actionBtn} onClick={handleCopyImage} disabled={!resultSrc}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy Image
                  </button>
                  <button className={styles.actionBtn} onClick={handleCopySeed} disabled={!seed}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Copy Seed
                  </button>

                  <div className={styles.actionDivider} />

                  <button className={styles.actionBtn} onClick={() => router.push('/generate')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Generation
                  </button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleReportImage} disabled={!resultSrc}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Report Image
                  </button>
                </div></div>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
