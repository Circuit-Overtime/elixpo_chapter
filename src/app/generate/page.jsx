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

const VIDEO_ASPECTS = [
  { id: '1:1', w: 1024, h: 1024, label: '1:1' },
  { id: '16:9', w: 1024, h: 576, label: '16:9' },
  { id: '9:16', w: 576, h: 1024, label: '9:16' },
];

const DURATIONS = [
  { id: '4', label: '4s' },
  { id: '6', label: '6s' },
  { id: '10', label: '10s' },
];

const VIDEO_MODELS = [
  { id: 'hailuo', label: 'Hailuo 2.3', desc: 'Coming soon' },
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
  const [duration, setDuration] = useState('6');
  const [videoModel, setVideoModel] = useState('hailuo');
  const [modelOpen, setModelOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [randomizing, setRandomizing] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedModel = MODELS.find((m) => m.id === model);
  const selectedVideoModel = VIDEO_MODELS.find((m) => m.id === videoModel);
  const selectedAspect = (mode === 'video' ? VIDEO_ASPECTS : ASPECTS).find((a) => a.id === aspect) || ASPECTS[1];
  const selectedStyle = STYLES.find((s) => s.id === style);
  const selectedDuration = DURATIONS.find((d) => d.id === duration);

  const RANDOM_SUBJECTS = [
    'a celestial dragon coiled around a dying star',
    'an ancient library floating in the clouds at sunset',
    'a cyberpunk samurai standing in neon rain',
    'a crystal palace growing from a frozen waterfall',
    'a bioluminescent deep-sea city with jellyfish lanterns',
    'a time traveler stepping through a shattered mirror',
    'a forest of giant mushrooms under aurora borealis',
    'an ethereal phoenix rising from volcanic glass',
    'a steampunk airship docked at a sky island',
    'a witch brewing potions in a cozy treehouse',
    'a massive titan sleeping beneath a mountain range',
    'an underwater temple guarded by spectral whales',
    'a lone astronaut discovering alien flowers on Mars',
    'a floating marketplace above a city of canals',
    'a knight made of starlight fighting shadow creatures',
  ];

  const handleRandomPrompt = async () => {
    if (randomizing) return;
    setRandomizing(true);
    const subject = RANDOM_SUBJECTS[Math.floor(Math.random() * RANDOM_SUBJECTS.length)];
    try {
      const res = await fetch(`${API_BASE}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: subject }),
      });
      const data = await res.json();
      setPrompt(data.enhanced || subject);
    } catch {
      setPrompt(subject);
    } finally {
      setRandomizing(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    setUploadedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

          {/* Uploaded image preview */}
          {uploadedPreview && (
            <div className={styles.uploadPreview}>
              <img src={uploadedPreview} alt="Uploaded" className={styles.uploadThumb} />
              <span className={styles.uploadLabel}>
                {mode === 'video' ? 'Start frame' : 'Reference image'}
              </span>
              <button className={styles.uploadRemove} onClick={clearUploadedImage} title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Prompt input bar */}
          <div className={styles.promptBar}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <div className={styles.tooltipWrap}>
              <button
                className={styles.promptIconBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </button>
              <span className={styles.tooltip}>
                {mode === 'video' ? 'Upload start frame' : 'Upload reference image'}
              </span>
            </div>
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
              {/* Aspect ratio — different set for video */}
              <div className={styles.aspectGroup}>
                {(mode === 'video' ? VIDEO_ASPECTS : ASPECTS).map((a) => (
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

              {mode === 'video' ? (
                <>
                  {/* Duration selector */}
                  <div className={styles.dropdownWrap}>
                    <button
                      className={styles.optionBtn}
                      onClick={() => { setDurationOpen(!durationOpen); setModelOpen(false); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {selectedDuration.label}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {durationOpen && (
                      <div className={styles.dropdown}>
                        {DURATIONS.map((d) => (
                          <button
                            key={d.id}
                            className={`${styles.dropdownItem} ${duration === d.id ? styles.dropdownItemActive : ''}`}
                            onClick={() => { setDuration(d.id); setDurationOpen(false); }}
                          >
                            {d.label}
                            {duration === d.id && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video model selector */}
                  <div className={styles.dropdownWrap}>
                    <button
                      className={styles.optionBtn}
                      onClick={() => { setModelOpen(!modelOpen); setDurationOpen(false); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                      {selectedVideoModel.label}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {modelOpen && (
                      <div className={styles.dropdown}>
                        {VIDEO_MODELS.map((m) => (
                          <button
                            key={m.id}
                            className={`${styles.dropdownItem} ${videoModel === m.id ? styles.dropdownItemActive : ''}`}
                            onClick={() => { setVideoModel(m.id); setModelOpen(false); }}
                          >
                            <span>{m.label}</span>
                            <span className={styles.dropdownDesc}>{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Style selector (image only) */}
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

                  {/* Image model selector */}
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
                </>
              )}

              {/* Random prompt button */}
              <div className={styles.tooltipWrap}>
                <button
                  className={`${styles.enhanceBtn} ${randomizing ? styles.enhanceSpin : ''}`}
                  onClick={handleRandomPrompt}
                  disabled={randomizing}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                  </svg>
                </button>
                <span className={styles.tooltip}>Random prompt</span>
              </div>

              {/* Generate button */}
              <button
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                title="Generate"
              >
                {generating ? (
                  <span className={styles.spinner} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
