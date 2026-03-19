'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar/Navbar';
import styles from './Generate.module.css';

const MODELS = [
  { id: 'flux', label: 'Flux', desc: 'Balanced quality' },
  { id: 'turbo', label: 'Turbo', desc: 'Fast generation' },
  { id: 'nanobanana', label: 'Nano Banana', desc: 'Stylized art' },
  { id: 'kontext', label: 'Kontext', desc: 'Context-aware' },
];

const ASPECTS = [
  { id: '1:1', w: 1024, h: 1024, label: '1:1' },
  { id: '16:9', w: 1024, h: 576, label: '16:9' },
  { id: '9:16', w: 576, h: 1024, label: '9:16' },
  { id: '4:3', w: 1024, h: 768, label: '4:3' },
  { id: '3:4', w: 768, h: 1024, label: '3:4' },
];

const API_BASE = 'http://localhost:3005';

export default function GeneratePage() {
  const router = useRouter();
  const [mode, setMode] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux');
  const [aspect, setAspect] = useState('16:9');
  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef(null);

  const selectedModel = MODELS.find((m) => m.id === model);
  const selectedAspect = ASPECTS.find((a) => a.id === aspect);

  const handleEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const res = await fetch(`${API_BASE}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
    } catch {
      /* silent fail */
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);

    const sessionId = crypto.randomUUID();
    const { w, h } = selectedAspect;

    // Store generation params in sessionStorage so the session page can pick them up
    sessionStorage.setItem(
      `gen_${sessionId}`,
      JSON.stringify({
        prompt: prompt.trim(),
        model,
        width: w,
        height: h,
        mode,
        timestamp: Date.now(),
      })
    );

    router.push(`/generate/${sessionId}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* Background decorative elements */}
        <div className={styles.bgOrb1} aria-hidden="true" />
        <div className={styles.bgOrb2} aria-hidden="true" />
        <div className={styles.gridOverlay} aria-hidden="true" />

        <div className={styles.center}>
          <h1 className={styles.title}>
            What will you <span className={styles.accent}>create</span> today?
          </h1>
          <p className={styles.subtitle}>
            Describe your vision and let AI bring it to life
          </p>

          {/* Mode toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === 'image' ? styles.modeActive : ''}`}
              onClick={() => setMode('image')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              Image
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'video' ? styles.modeActive : ''}`}
              onClick={() => setMode('video')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Video
            </button>
          </div>

          {/* Prompt area */}
          <div className={styles.promptCard}>
            <textarea
              ref={textareaRef}
              className={styles.promptInput}
              placeholder={
                mode === 'image'
                  ? 'Describe the image you want to create...'
                  : 'Describe the video scene you want to generate...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />

            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                {/* Enhance button */}
                <button
                  className={styles.toolBtn}
                  onClick={handleEnhance}
                  disabled={enhancing || !prompt.trim()}
                  title="Enhance prompt with AI"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                  </svg>
                  {enhancing ? 'Enhancing...' : 'Enhance'}
                </button>
              </div>

              <div className={styles.toolbarRight}>
                {/* Aspect ratio selector */}
                <div className={styles.aspectGroup}>
                  {ASPECTS.map((a) => (
                    <button
                      key={a.id}
                      className={`${styles.aspectBtn} ${aspect === a.id ? styles.aspectActive : ''}`}
                      onClick={() => setAspect(a.id)}
                      title={`${a.w}x${a.h}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                {/* Model selector */}
                <div className={styles.modelSelector}>
                  <button
                    className={styles.modelBtn}
                    onClick={() => setModelOpen(!modelOpen)}
                  >
                    <span className={styles.modelLabel}>Model</span>
                    <span className={styles.modelName}>{selectedModel.label}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                          <span className={styles.modelOptionName}>{m.label}</span>
                          <span className={styles.modelOptionDesc}>{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <button
                  className={styles.generateBtn}
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                >
                  {generating ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>Generate</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
