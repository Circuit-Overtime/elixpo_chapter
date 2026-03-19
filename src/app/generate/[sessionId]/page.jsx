'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import styles from './Session.module.css';

const MODELS = [
  { id: 'flux', label: 'Flux' },
  { id: 'turbo', label: 'Turbo' },
  { id: 'nanobanana', label: 'Nano Banana' },
  { id: 'kontext', label: 'Kontext' },
];

const API_BASE = 'http://localhost:3005';

export default function SessionPage({ params }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [model, setModel] = useState('flux');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);
  const [mode, setMode] = useState('image');

  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generationTime, setGenerationTime] = useState(null);

  const [modelOpen, setModelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const hasGenerated = useRef(false);

  // Load session params and generate
  useEffect(() => {
    if (hasGenerated.current) return;
    hasGenerated.current = true;

    const stored = sessionStorage.getItem(`gen_${sessionId}`);
    if (!stored) {
      setError('Session not found. Please start a new generation.');
      setLoading(false);
      return;
    }

    const params = JSON.parse(stored);
    setPrompt(params.prompt);
    setModel(params.model);
    setWidth(params.width);
    setHeight(params.height);
    setMode(params.mode || 'image');

    generate(params);
  }, [sessionId]);

  const generate = async (params) => {
    setLoading(true);
    setError(null);
    setImageData(null);

    try {
      const res = await fetch(`${API_BASE}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          model: params.model,
          width: params.width,
          height: params.height,
          seed: Math.floor(Math.random() * 10000),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setImageData(data.imageData);
        setGenerationTime(data.generationTime);
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      setError('Failed to connect to generation server');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    const params = { prompt, model, width, height, mode };
    generate(params);
  };

  const handleNewGeneration = () => {
    if (!newPrompt.trim()) return;
    const newSessionId = crypto.randomUUID();
    sessionStorage.setItem(
      `gen_${newSessionId}`,
      JSON.stringify({
        prompt: newPrompt.trim(),
        model,
        width,
        height,
        mode,
        timestamp: Date.now(),
      })
    );
    router.push(`/generate/${newSessionId}`);
  };

  const handleDownload = () => {
    if (!imageData) return;
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `elixpo-${sessionId.slice(0, 8)}.png`;
    link.click();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNewGeneration();
    }
  };

  const selectedModel = MODELS.find((m) => m.id === model);

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <span className={styles.topTitle}>AI Creation</span>
          <div className={styles.topMeta}>
            <span className={`${styles.statusDot} ${loading ? styles.statusLoading : styles.statusDone}`} />
            <span className={styles.sessionLabel}>
              Session {sessionId.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Main content - image display */}
        <div className={styles.content}>
          <div className={styles.imageContainer}>
            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.loadingRing}>
                  <div className={styles.ringSegment} />
                  <div className={styles.ringSegment} />
                  <div className={styles.ringSegment} />
                </div>
                <p className={styles.loadingText}>Generating your creation...</p>
                <p className={styles.loadingHint}>This may take a few moments</p>
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
                <button className={styles.retryBtn} onClick={handleRegenerate}>
                  Try Again
                </button>
              </div>
            )}

            {imageData && (
              <img
                src={imageData}
                alt={prompt}
                className={styles.generatedImage}
              />
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
                {/* Model selector inline */}
                <div className={styles.inlineModel}>
                  <button
                    className={styles.modelBtn}
                    onClick={() => setModelOpen(!modelOpen)}
                  >
                    <span className={styles.modelLabel}>Model</span>
                    <span className={styles.modelName}>{selectedModel.label}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {modelOpen && (
                    <div className={styles.modelDropdown}>
                      {MODELS.map((m) => (
                        <button
                          key={m.id}
                          className={`${styles.modelOption} ${model === m.id ? styles.modelOptionActive : ''}`}
                          onClick={() => {
                            setModel(m.id);
                            setModelOpen(false);
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className={styles.generateBtn}
                  onClick={handleNewGeneration}
                  disabled={!newPrompt.trim()}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <button
            className={styles.sidebarClose}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Close panel' : 'Open panel'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {sidebarOpen && (
            <div className={styles.sidebarContent}>
              {/* Prompt section */}
              <div className={styles.sidebarSection}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Prompt</h3>
                  <button className={styles.iconBtn} onClick={handleCopyPrompt} title="Copy prompt">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                </div>
                <p className={styles.promptText}>{prompt}</p>
              </div>

              {/* Details */}
              <div className={styles.sidebarSection}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Model</span>
                  <span className={styles.detailValue}>{selectedModel?.label}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Resolution</span>
                  <span className={styles.detailValue}>{width}x{height}</span>
                </div>
                {generationTime && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Time</span>
                    <span className={styles.detailValue}>{(generationTime / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className={styles.sidebarSection}>
                <button className={styles.actionBtn} onClick={handleRegenerate} disabled={loading}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                  </svg>
                  Remix
                </button>
                <button className={styles.actionBtn} onClick={handleDownload} disabled={!imageData}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => {
                    setNewPrompt(prompt);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Iterate
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
