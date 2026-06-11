'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const HeroCloud = dynamic(() => import('@/components/HeroCloud'), { ssr: false });

/* ────────────────────── FAQ Data ────────────────────── */
const faqItems = [
  {
    q: 'What is Elixpo Chat?',
    a: 'Elixpo Chat is a next-generation AI interface that combines cutting-edge language models with a beautifully designed conversational experience. It supports text, images, file uploads, and web search -- all in one seamless interface.',
  },
  {
    q: 'Which AI models does it support?',
    a: 'Elixpo Chat works with GPT-4o, Claude, Gemini, and more. You can switch between models mid-conversation to get the best response for your specific task.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Absolutely. We use end-to-end encryption for all conversations, your data is never used to train models, and you can delete your history at any time. Privacy is not optional -- it is foundational.',
  },
  {
    q: 'Can I use it for my team or business?',
    a: 'Yes. Elixpo offers workspace plans with shared conversation threads, role-based access, and API integrations so your entire team can leverage AI collaboratively.',
  },
  {
    q: 'How is the design and developer handoff?',
    a: 'Every component is built with proper naming conventions and production-grade code. The interface is fully responsive, accessible, and optimized for performance.',
  },
];

/* ─── Scroll-triggered animation hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── FAQ Item ─── */
function FaqItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border-b border-[rgba(240,237,230,0.08)] py-5 group cursor-pointer"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tracking-wider text-[rgba(240,237,230,0.25)]">
            {String(idx + 1).padStart(2, '0')}
          </span>
          <span className="text-[15px] font-medium text-[rgba(240,237,230,0.85)] group-hover:text-[#f0ede6] transition-colors">
            {q}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-[rgba(240,237,230,0.3)] transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-sm text-[rgba(240,237,230,0.4)] leading-relaxed pl-10 pr-8">{a}</p>
      </div>
    </button>
  );
}

/* ════════════════════ LANDING PAGE ════════════════════ */
export default function LandingPage() {
  const hero = useInView(0.1);
  const features = useInView(0.1);
  const faq = useInView(0.1);
  const cta = useInView(0.1);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#f0ede6] overflow-hidden selection:bg-[#6366f1]/40">
      {/* ════ Overlays (scanlines, noise, grain) — Rig AI style ════ */}
      <div className="fixed inset-0 z-[100] pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)'
      }} />
      <div className="fixed inset-0 z-[99] pointer-events-none opacity-[0.04]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        backgroundSize: '128px 128px'
      }} />

      {/* ═══════════════════ HERO — FULL ACCENT VIEWPORT ═══════════════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#f0ede6]">
        {/* ═══ Three.js volumetric cloud canvas ═══ */}
        <HeroCloud />

        {/* Huge watermark — z-[2] sits above cloud canvas but below content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-[2] select-none">
          <span className="text-[28vw] font-bold tracking-tighter leading-none text-[#0a0a0a]" style={{ fontFamily: 'system-ui' }}>
            ELIXPO
          </span>
        </div>

        {/* Navigation */}
        <header className="relative z-20">
          <nav className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-wider uppercase text-[#0a0a0a]">
              Elixpo
            </Link>
            <ul className="hidden md:flex items-center gap-8 list-none">
              <li>
                <a href="#features" className="font-mono text-xs font-bold tracking-[0.05em] text-[#0a0a0a] opacity-70 hover:opacity-100 transition-opacity">
                  Features
                </a>
              </li>
              <li>
                <a href="#faq" className="font-mono text-xs font-bold tracking-[0.05em] text-[#0a0a0a] opacity-70 hover:opacity-100 transition-opacity">
                  FAQ
                </a>
              </li>
              <li>
                <Link
                  href="/chat/new"
                  className="font-mono text-xs font-bold tracking-[0.05em] text-[#f0ede6] bg-[#0a0a0a] px-5 py-3 hover:bg-[#1a1a2e] transition-colors"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
                >
                  Start Chatting
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pb-24">
          <div
            ref={hero.ref}
            className={`max-w-3xl text-center transition-all duration-[1000ms] ease-out ${
              hero.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h1
              className="text-[clamp(2.5rem,6vw,5rem)] font-bold tracking-[-0.03em] leading-[1.05] mb-6 text-[#0a0a0a]"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Build Smarter Conversations.<br />
              <span className="text-emerald-600 drop-shadow-sm">Running on a powerful 3-tier CPU Architecture.</span>
            </h1>
            <p className="text-[#0a0a0a]/70 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ fontFamily: 'system-ui' }}>
              A modern AI interface designed for speed, privacy, and
              unparalleled multimodal capabilities. Your conversations, elevated.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/chat/new"
                className="relative font-mono text-xs font-bold tracking-[0.05em] uppercase bg-[#0a0a0a] text-[#f0ede6] px-7 py-4 hover:bg-[#1a1a2e] transition-colors overflow-visible"
                style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
              >
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap z-10" style={{ clipPath: "none" }}>
                  CPU-POWERED
                </div>
                Start Chatting
              </Link>
              <a
                href="#features"
                className="font-mono text-xs font-bold tracking-[0.05em] uppercase text-[#0a0a0a] border-2 border-[rgba(10,10,10,0.3)] px-7 py-4 hover:border-[#0a0a0a] transition-colors"
                style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="relative z-10 border-t border-[rgba(10,10,10,0.15)] overflow-hidden">
          <div className="flex animate-[ticker_20s_linear_infinite] whitespace-nowrap py-3">
            {Array(2).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-3 shrink-0">
                {['3-Tier Models', 'GPT-4o & Claude', 'CPU Inference', 'Voice input', 'Web search', 'Pollinations AI', 'Real-time streaming', 'Markdown rendering'].map((t) => (
                  <React.Fragment key={`${i}-${t}`}>
                    <span className="font-mono text-xs font-bold tracking-wide text-[#0a0a0a]/60 uppercase">{t}</span>
                    <span className="text-[#0a0a0a]/30">&bull;</span>
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ Content lines (vertical guides like Rig AI) ════ */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div className="max-w-[calc(1200px+6rem)] mx-auto h-full relative px-6 md:px-12">
          <div className="absolute left-6 md:left-12 top-0 bottom-0 w-px bg-[rgba(240,237,230,0.06)]" />
          <div className="absolute right-6 md:right-12 top-0 bottom-0 w-px bg-[rgba(240,237,230,0.06)]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[rgba(240,237,230,0.03)]" />
        </div>
      </div>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <main className="relative z-10">
        {/* Section Divider */}
        <div className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-8">
          <div className="h-px bg-[rgba(240,237,230,0.08)]" />
        </div>

        {/* ══════ CAPABILITIES SECTION ══════ */}
        <section className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-20" id="features">
          <div
            ref={features.ref}
            className={`transition-all duration-[800ms] ease-out ${features.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {/* Section badge */}
            <div className="flex items-center gap-2 mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="4" height="4" fill="#6366f1" />
                <rect x="10" y="4" width="4" height="4" fill="#6366f1" />
                <rect x="16" y="4" width="4" height="4" fill="#6366f1" />
                <rect x="4" y="10" width="4" height="4" fill="#6366f1" />
                <rect x="10" y="10" width="4" height="4" fill="#6366f1" />
                <rect x="4" y="16" width="4" height="4" fill="#6366f1" />
              </svg>
              <span className="font-mono text-xs font-bold tracking-[0.15em] uppercase text-[rgba(240,237,230,0.5)]">
                Capabilities
              </span>
            </div>

            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-[-0.03em] leading-[1.1] mb-5" style={{ fontFamily: 'system-ui' }}>
              Designed by AI Experts for<br />
              <span className="text-[rgba(240,237,230,0.35)]">Next-Generation Interfaces.</span>
            </h2>
            <p className="text-[rgba(240,237,230,0.4)] max-w-xl text-base leading-relaxed mb-14">
              We are a team of AI engineers and product designers passionate about building intelligent tools.
              Built from real-world use cases, tested, flexible, and designed for infinite scalability.
            </p>

            {/* ── Animated Architecture Diagram ── */}
            <div className="mb-16 flex justify-center">
              <svg viewBox="0 0 560 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-2xl">
                <defs>
                  <linearGradient id="trail-in" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f0ede6" stopOpacity="0" />
                    <stop offset="70%" stopColor="#f0ede6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f0ede6" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="trail-out" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                    <stop offset="70%" stopColor="#22c55e" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
                  </linearGradient>
                  <path id="path-user-elixpo" d="M110,110 L160,110" />
                  <path id="path-elixpo-resp" d="M400,110 L450,110" />
                </defs>

                {/* Machine boundary */}
                <rect x="5" y="55" width="550" height="112" fill="none" stroke="rgba(240,237,230,0.08)" strokeWidth="1" strokeDasharray="4 4" />
                <rect x="15" y="48" width="130" height="14" fill="#0a0a0a" />
                <text x="20" y="58" fontFamily="monospace" fontSize="6" letterSpacing="2" fill="rgba(240,237,230,0.3)">CPU INFERENCE PIPELINE</text>

                {/* YOUR PROMPT (left) */}
                <rect x="20" y="85" width="90" height="50" fill="rgba(10,10,10,0.95)" stroke="rgba(240,237,230,0.15)" strokeWidth="1" />
                <text x="65" y="106" textAnchor="middle" fontFamily="monospace" fontSize="7" letterSpacing="1.5" fill="rgba(240,237,230,0.4)">YOUR PROMPT</text>
                <text x="65" y="118" textAnchor="middle" fontFamily="monospace" fontSize="5.5" letterSpacing="1" fill="rgba(240,237,230,0.25)">TEXT · FILES · VOICE</text>

                {/* Connector In */}
                <line x1="110" y1="110" x2="160" y2="110" stroke="rgba(240,237,230,0.1)" strokeWidth="1" />
                <line x1="110" y1="110" x2="160" y2="110" stroke="url(#trail-in)" strokeWidth="2">
                  <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" />
                </line>
                <rect x="-1.5" y="-1.5" width="3" height="3" fill="#f0ede6">
                  <animateMotion dur="2s" repeatCount="indefinite"><mpath href="#path-user-elixpo" /></animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="2s" repeatCount="indefinite" />
                </rect>

                {/* 3-TIER ARCHITECTURE */}
                <rect x="160" y="65" width="240" height="90" fill="none" stroke="rgba(240,237,230,0.05)" strokeWidth="1" />
                
                {/* Tier: FREE */}
                <rect x="170" y="75" width="220" height="20" fill="rgba(16,185,129,0.03)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <rect x="170" y="75" width="30" height="20" fill="rgba(16,185,129,0.1)" />
                <text x="185" y="88" textAnchor="middle" fontFamily="monospace" fontSize="6" letterSpacing="1" fill="#34d399" fontWeight="bold">FREE</text>
                <text x="210" y="88" fontFamily="monospace" fontSize="6" fill="rgba(240,237,230,0.6)">GPT-5 Mini · Mistral · DeepSeek · Gemini Flash</text>

                {/* Tier: PRO */}
                <rect x="170" y="100" width="220" height="20" fill="rgba(245,158,11,0.03)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
                <rect x="170" y="100" width="30" height="20" fill="rgba(245,158,11,0.1)" />
                <text x="185" y="113" textAnchor="middle" fontFamily="monospace" fontSize="6" letterSpacing="1" fill="#fbbf24" fontWeight="bold">PRO</text>
                <text x="210" y="113" fontFamily="monospace" fontSize="6" fill="rgba(240,237,230,0.6)">GPT-5.2 · Gemini 3 Flash · Claude Sonnet</text>

                {/* Tier: MAX */}
                <rect x="170" y="125" width="220" height="20" fill="rgba(139,92,246,0.03)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
                <rect x="170" y="125" width="30" height="20" fill="rgba(139,92,246,0.1)" />
                <text x="185" y="138" textAnchor="middle" fontFamily="monospace" fontSize="6" letterSpacing="1" fill="#a78bfa" fontWeight="bold">MAX</text>
                <text x="210" y="138" fontFamily="monospace" fontSize="6" fill="rgba(240,237,230,0.6)">Claude Opus · Gemini 3.1 Pro · Grok Reasoning</text>

                {/* Vertical active flow indicators */}
                <circle cx="165" cy="110" r="2" fill="#22c55e">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="395" cy="110" r="2" fill="#22c55e">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>

                {/* Connector Out */}
                <line x1="400" y1="110" x2="450" y2="110" stroke="rgba(34,197,94,0.15)" strokeWidth="1" />
                <line x1="400" y1="110" x2="450" y2="110" stroke="url(#trail-out)" strokeWidth="2">
                  <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" begin="1s" repeatCount="indefinite" />
                </line>
                <rect x="-1.5" y="-1.5" width="3" height="3" fill="#22c55e">
                  <animateMotion dur="2s" begin="1s" repeatCount="indefinite"><mpath href="#path-elixpo-resp" /></animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="2s" begin="1s" repeatCount="indefinite" />
                </rect>

                {/* RESPONSE (right) */}
                <rect x="450" y="85" width="90" height="50" fill="rgba(10,10,10,0.95)" stroke="rgba(240,237,230,0.15)" strokeWidth="1" />
                <text x="495" y="106" textAnchor="middle" fontFamily="monospace" fontSize="7" letterSpacing="1.5" fill="rgba(240,237,230,0.4)">RESPONSE</text>
                <text x="495" y="118" textAnchor="middle" fontFamily="monospace" fontSize="5.5" letterSpacing="1" fill="#22c55e">STREAMING · FAST</text>

                {/* Privacy label */}
                <text x="280" y="195" textAnchor="middle" fontFamily="monospace" fontSize="6" letterSpacing="2" fill="rgba(240,237,230,0.2)">ZERO TELEMETRY · POLLINATIONS.AI · CPU OPTIMIZED</text>
              </svg>
            </div>

            {/* Feature Cards — Rig AI chamfered style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[rgba(240,237,230,0.08)]">
              {[
                {
                  label: 'Privacy & security',
                  num: '001',
                  title: 'Your data stays yours.',
                  desc: 'End-to-end encryption for every conversation. Never used to train models. Delete your history at any time. Privacy is foundational.',
                },
                {
                  label: 'Multi-model',
                  num: '002',
                  title: 'One interface, every model.',
                  desc: 'GPT-4o, Claude, Gemini, and more. Switch models mid-conversation to get the best response for your specific task.',
                },
                {
                  label: 'Multimodal',
                  num: '003',
                  title: 'Beyond text conversations.',
                  desc: 'Share files, voice notes, code snippets, and images seamlessly. Elixpo understands multiple formats and context simultaneously.',
                },
                {
                  label: 'Architecture',
                  num: '004',
                  title: 'Runs on CPU. Seriously.',
                  desc: 'No expensive GPU clusters required. Elixpo leverages Pollinations optimized CPU inference pipeline for fast, cost-effective AI generation across all model tiers.',
                },
              ].map((card) => (
                <div key={card.num} className="bg-[#0a0a0a] p-8 md:p-10 group hover:bg-[rgba(240,237,230,0.02)] transition-colors duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-[rgba(240,237,230,0.35)]">
                      {card.label}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.1em] text-[rgba(240,237,230,0.2)]">
                      {card.num}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold tracking-[-0.02em] mb-3 text-[#f0ede6]" style={{ fontFamily: 'system-ui' }}>
                    {card.title}
                  </h3>
                  <p className="text-sm text-[rgba(240,237,230,0.4)] leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-4">
          <div className="h-px bg-[rgba(240,237,230,0.08)]" />
        </div>

        {/* ══════ PARTNER SECTION ══════ */}
        <section className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-16">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-[rgba(240,237,230,0.3)] block mb-3">
                Powering next-generation AI workflows
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold tracking-tight text-[rgba(240,237,230,0.5)]">
                  Pollinations.ai
                </span>
                <span className="bg-[rgba(240,237,230,0.08)] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider text-[rgba(240,237,230,0.6)]">
                  CPU-POWERED
                </span>
              </div>
              <p className="text-sm text-[rgba(240,237,230,0.4)] mt-2">Running on CPU · 3 Model Tiers</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] font-bold tracking-[0.1em] text-[rgba(240,237,230,0.4)] uppercase">
                Active
              </span>
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-4">
          <div className="h-px bg-[rgba(240,237,230,0.08)]" />
        </div>

        {/* ══════ FAQ SECTION ══════ */}
        <section className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-20" id="faq">
          <div
            ref={faq.ref}
            className={`transition-all duration-[800ms] ease-out ${faq.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-16 items-start">
              <div>
                {/* Section badge */}
                <div className="flex items-center gap-2 mb-6">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="4" width="4" height="4" fill="#6366f1" />
                    <rect x="14" y="4" width="4" height="4" fill="#6366f1" />
                    <rect x="10" y="10" width="4" height="4" fill="#6366f1" />
                    <rect x="6" y="16" width="4" height="4" fill="#6366f1" />
                    <rect x="14" y="16" width="4" height="4" fill="#6366f1" />
                  </svg>
                  <span className="font-mono text-xs font-bold tracking-[0.15em] uppercase text-[rgba(240,237,230,0.5)]">
                    FAQ
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.03em] leading-tight mb-5" style={{ fontFamily: 'system-ui' }}>
                  Frequently Asked<br />
                  <span className="text-[rgba(240,237,230,0.35)]">Questions.</span>
                </h2>
                <p className="text-[rgba(240,237,230,0.4)] text-sm leading-relaxed mb-8">
                  Everything you need to know about Elixpo Chat. Can not find the answer you are looking for?
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href="#"
                    className="font-mono text-[11px] font-bold tracking-[0.05em] uppercase px-5 py-3 bg-[rgba(240,237,230,0.04)] border border-[rgba(240,237,230,0.1)] text-[rgba(240,237,230,0.6)] hover:text-[#f0ede6] hover:bg-[rgba(240,237,230,0.08)] transition-all"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
                  >
                    Documentation
                  </Link>
                  <Link
                    href="#"
                    className="font-mono text-[11px] font-bold tracking-[0.05em] uppercase px-5 py-3 bg-[#6366f1] text-[#f0ede6] hover:bg-[#5b5bd6] transition-colors"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
                  >
                    Ask Question
                  </Link>
                </div>
              </div>
              <div className="border-t border-[rgba(240,237,230,0.08)] md:border-t-0">
                {faqItems.map((item, idx) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} idx={idx} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-4">
          <div className="h-px bg-[rgba(240,237,230,0.08)]" />
        </div>

        {/* ══════ CTA SECTION ══════ */}
        <section className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-24">
          <div
            ref={cta.ref}
            className={`relative border border-[rgba(240,237,230,0.1)] p-12 md:p-20 text-center overflow-hidden transition-all duration-[800ms] ease-out ${cta.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {/* Top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-[#6366f1]/50 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-32 bg-gradient-to-b from-[#6366f1]/[0.06] to-transparent blur-[60px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] mb-5" style={{ fontFamily: 'system-ui' }}>
                Ready to Build Your AI<br />
                <span className="text-[rgba(240,237,230,0.35)]">Chat Experience?</span>
              </h2>
              <p className="text-[rgba(240,237,230,0.4)] text-base max-w-md mx-auto mb-10 leading-relaxed">
                Start chatting with Elixpo AI today and experience the future of conversational interfaces.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link
                  href="/chat"
                  className="font-mono text-xs font-bold tracking-[0.05em] uppercase bg-[#6366f1] text-[#f0ede6] px-7 py-4 hover:bg-[#5b5bd6] transition-colors"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
                >
                  Open App
                </Link>
                <Link
                  href="#"
                  className="font-mono text-xs font-bold tracking-[0.05em] uppercase text-[rgba(240,237,230,0.6)] border border-[rgba(240,237,230,0.12)] px-7 py-4 hover:text-[#f0ede6] hover:border-[rgba(240,237,230,0.25)] transition-all"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
                >
                  Join Community
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ════════ Footer ════════ */}
      <footer className="relative z-10 border-t border-[rgba(240,237,230,0.08)] bg-[#0a0a0a]">
        <div className="max-w-[calc(1200px+6rem)] mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-8">
            <div>
              <span className="text-lg font-bold tracking-wider uppercase block mb-3">Elixpo</span>
              <p className="text-[rgba(240,237,230,0.4)] text-sm max-w-[280px] leading-relaxed">
                Next-generation AI interface. Multi-model, privacy-first, beautifully designed.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-[rgba(240,237,230,0.35)] mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/chat" className="text-sm text-[rgba(240,237,230,0.5)] hover:text-[#6366f1] transition-colors">Chat</Link></li>
                <li><a href="#features" className="text-sm text-[rgba(240,237,230,0.5)] hover:text-[#6366f1] transition-colors">Features</a></li>
                <li><a href="#faq" className="text-sm text-[rgba(240,237,230,0.5)] hover:text-[#6366f1] transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-[rgba(240,237,230,0.35)] mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-[rgba(240,237,230,0.5)] hover:text-[#6366f1] transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-[rgba(240,237,230,0.5)] hover:text-[#6366f1] transition-colors">Terms</a></li>
                <li><a href="#" className="text-sm text-[rgba(240,237,230,0.5)] hover:text-[#6366f1] transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-[rgba(240,237,230,0.06)]">
            <span className="font-mono text-[11px] tracking-[0.1em] text-[rgba(240,237,230,0.25)] uppercase">
              &copy; {new Date().getFullYear()} Elixpo
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#6366f1] animate-[blink_1.5s_step-end_infinite]" />
              <span className="font-mono text-[11px] tracking-[0.1em] text-[rgba(240,237,230,0.4)]">
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ──── Custom Animations ──── */}
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
