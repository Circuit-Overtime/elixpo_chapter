'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import styles from './Session.module.css';

const MODELS = [
  { id: 'flux', label: 'Flux' },
  { id: 'gptimage', label: 'GPT Image' },
  { id: 'seedream5', label: 'Seedream 5' },
  { id: 'nanobanana', label: 'Nano Banana' },
  { id: 'kontext', label: 'Kontext' },
  { id: 'imagen-4', label: 'Imagen 4' },
  { id: 'zimage', label: 'Z-Image' },
  { id: 'klein', label: 'Klein' },
  { id: 'veo', label: 'Veo' },
  { id: 'seedance', label: 'Seedance' },
  { id: 'seedance-pro', label: 'Seedance Pro' },
  { id: 'wan', label: 'Wan' },
  { id: 'ltx-2', label: 'LTX-2' },
];

const POLLINATIONS_BASE = 'https://gen.pollinations.ai';

export default function SessionPage({ params }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [model, setModel] = useState('flux');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);
  const [mode, setMode] = useState('image');
  const [duration, setDuration] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const [resultSrc, setResultSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [genStart, setGenStart] = useState(null);
  const [generationTime, setGenerationTime] = useState(null);

  const [modelOpen, setModelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const hasGenerated = useRef(false);

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
    setPrompt(p.prompt);
    setModel(p.model);
    setWidth(p.width);
    setHeight(p.height);
    setMode(p.mode || 'image');
    setDuration(p.duration);
    setImageUrl(p.imageUrl);

    generate(p);
  }, [sessionId]);

  const buildUrl = (p) => {
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
    q.set('seed', Math.floor(Math.random() * 2147483647));
    q.set('enhance', 'true');
    q.set('referrer', 'elixpoart');
    if (isVideo && p.duration) q.set('duration', p.duration);
    if (p.imageUrl) q.set('image', p.imageUrl);

    return `${base}?${q.toString()}`;
  };

  const generate = async (p) => {
    setLoading(true);
    setError(null);
    setResultSrc(null);
    setGenerationTime(null);
    const start = Date.now();
    setGenStart(start);

    try {
      const url = buildUrl(p);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Generation failed (${res.status})`);
      const blob = await res.blob();
      setResultSrc(URL.createObjectURL(blob));
      setGenerationTime(Date.now() - start);
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    generate({ prompt, model, width, height, mode, duration, imageUrl });
  };

  const handleNewGeneration = () => {
    if (!newPrompt.trim()) return;
    const id = crypto.randomUUID();
    sessionStorage.setItem(
      `gen_${id}`,
      JSON.stringify({ prompt: newPrompt.trim(), model, width, height, mode, duration, imageUrl: null, timestamp: Date.now() })
    );
    router.push(`/generate/${id}`);
  };

  const handleDownload = () => {
    if (!resultSrc) return;
    const a = document.createElement('a');
    a.href = resultSrc;
    a.download = `elixpo-${sessionId.slice(0, 8)}.${mode === 'video' ? 'mp4' : 'png'}`;
    a.click();
  };

  const handleCopyPrompt = () => navigator.clipboard.writeText(prompt);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNewGeneration(); }
  };

  const sel = MODELS.find((m) => m.id === model) || { label: model };

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.layout}>
        {/* Main content */}
        <div className={styles.content}>
          <div className={styles.imageContainer}>
            {/* Ambient blobs behind content */}
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

            {error && (
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
              mode === 'video' ? (
                <video src={resultSrc} className={styles.generatedImage} controls autoPlay loop />
              ) : (
                <img src={resultSrc} alt={prompt} className={styles.generatedImage} />
              )
            )}
          </div>

          {/* Bottom prompt bar */}
          <div className={styles.bottomBar}>
            <div className={styles.promptBar}>
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
                      {MODELS.map((m) => (
                        <button key={m.id} className={`${styles.modelOption} ${model === m.id ? styles.modelOptionActive : ''}`}
                          onClick={() => { setModel(m.id); setModelOpen(false); }}>
                          {m.label}
                        </button>
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
              {/* Session info */}
              <div className={styles.sessionBlock}>
                <div className={styles.sessionRow}>
                  <span className={`${styles.statusDot} ${loading ? styles.statusLoading : styles.statusDone}`} />
                  <span className={styles.sessionId}>{sessionId.slice(0, 8)}</span>
                </div>
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
                </div>
              </div>

              {/* Actions */}
              <div className={styles.section}>
                <h3 className={styles.sectionLabel}>Actions</h3>
                <div className={styles.actionGrid}>
                  <button className={styles.actionBtn} onClick={handleRegenerate} disabled={loading}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                    </svg>
                    Remix
                  </button>
                  <button className={styles.actionBtn} onClick={handleDownload} disabled={!resultSrc}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </button>
                  <button className={styles.actionBtn} onClick={() => setNewPrompt(prompt)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Iterate
                  </button>
                  <button className={styles.actionBtn} onClick={() => router.push('/generate')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
