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

const STYLES = [
  { id: 'dynamic', label: 'Dynamic' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'creative', label: 'Creative' },
  { id: 'vibrant', label: 'Vibrant' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'anime', label: 'Anime' },
];

const API_BASE = 'http://localhost:3005';

export default function GeneratePage() {
  const router = useRouter();
  const [mode, setMode] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux');
  const [aspect, setAspect] = useState('16:9');
  const [style, setStyle] = useState('dynamic');
  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const inputRef = useRef(null);

  const selectedModel = MODELS.find((m) => m.id === model);
  const selectedAspect = ASPECTS.find((a) => a.id === aspect);
  const selectedStyle = STYLES.find((s) => s.id === style);

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

    sessionStorage.setItem(
      `gen_${sessionId}`,
      JSON.stringify({
        prompt: prompt.trim(),
        model,
        width: w,
        height: h,
        style,
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

          {/* Prompt input bar */}
          <div className={styles.promptBar}>
            <svg className={styles.promptIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className={styles.promptInput}
              placeholder="Type a prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Options bar — separate row below prompt */}
          <div className={styles.optionsBar}>
            <div className={styles.optionsLeft}>
              {/* Mode toggle */}
              <div className={styles.modeToggle}>
                <button
                  className={`${styles.modeBtn} ${mode === 'image' ? styles.modeActive : ''}`}
                  onClick={() => setMode('image')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Video
                </button>
              </div>
            </div>

            <div className={styles.optionsRight}>
              {/* Aspect ratio */}
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

              {/* Style selector */}
              <div className={styles.dropdownWrap}>
                <button
                  className={styles.optionBtn}
                  onClick={() => { setStyleOpen(!styleOpen); setModelOpen(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  {selectedStyle.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {styleOpen && (
                  <div className={styles.dropdown}>
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        className={`${styles.dropdownItem} ${style === s.id ? styles.dropdownItemActive : ''}`}
                        onClick={() => { setStyle(s.id); setStyleOpen(false); }}
                      >
                        {s.label}
                        {style === s.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Model selector */}
              <div className={styles.dropdownWrap}>
                <button
                  className={styles.optionBtn}
                  onClick={() => { setModelOpen(!modelOpen); setStyleOpen(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                  {selectedModel.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {modelOpen && (
                  <div className={styles.dropdown}>
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        className={`${styles.dropdownItem} ${model === m.id ? styles.dropdownItemActive : ''}`}
                        onClick={() => { setModel(m.id); setModelOpen(false); }}
                      >
                        <span>{m.label}</span>
                        <span className={styles.dropdownDesc}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Enhance button */}
              <button
                className={styles.enhanceBtn}
                onClick={handleEnhance}
                disabled={enhancing || !prompt.trim()}
                title="Enhance prompt with AI"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                </svg>
              </button>

              {/* Generate button */}
              <button
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
              >
                {generating ? (
                  <span className={styles.spinner} />
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
