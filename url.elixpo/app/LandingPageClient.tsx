'use client';

import Link from 'next/link';
import BackgroundAurora from './components/BackgroundAurora';
import Footer from './components/Footer';
import Navbar from './components/Navbar';

const ACCENT = '#9b7bf7';

const FEATURES = [
  {
    title: 'Edge-native redirects',
    body: "Every short link resolves on Cloudflare's edge — sub-50ms anywhere on the planet, no cold starts, no proxies in between.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'Click analytics out of the box',
    body: 'Real-time counts, country breakdown, referrers, devices — no extra setup, no third-party script. Your data stays on your account.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: 'Developer-first API',
    body: 'A clean REST API with API keys, scoped permissions, and predictable JSON. Drop it into any app, Elixpo or yours.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'Custom slugs & branded links',
    body: 'Pick the slug yourself or let us generate one. Branded domains on Pro and Business so your links wear your name.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#f5f5f4] relative bg-black">
      <BackgroundAurora variant="default" />

      <div className="relative z-10">
        <Navbar />
      </div>

      {/* Hero panel: full-bleed rounded video card. Video sits behind a vignette
          + dim layer; oversized wordmark anchors the bottom-left while the
          description + CTA float to the right. Matches the elixpo.com hero. */}
      <section className="relative z-10 w-full px-3 md:px-5 mt-3 md:mt-4">
        <div
          className="video-hero relative w-full mx-auto overflow-hidden"
          style={{
            maxWidth: '1480px',
            minHeight: 'min(78vh, 760px)',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
          }}
        >
          <video
            src="/product_pitch.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/og-image.png"
            aria-hidden="true"
          />

          {/* Two-column overlay. Left column anchors the wordmark at the
              bottom; right column centers the tagline + CTA vertically.
              Mirrors the elixpo.com hero composition. */}
          <div className="video-hero-content absolute inset-0 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr]">
            {/* Left — wordmark pinned bottom-left */}
            <div className="flex flex-col justify-end px-6 sm:px-10 md:px-14 lg:px-20 pb-8 md:pb-12 lg:pb-14">
              <h1
                className="font-extrabold leading-[0.9] tracking-[-0.045em] text-white drop-shadow-[0_8px_40px_rgba(0,0,0,0.7)]"
                style={{
                  fontSize: 'clamp(2.5rem, 8.5vw, 8rem)',
                }}
              >
                Elixpo
                <span style={{ color: '#c8b6ff' }}>URL</span>
              </h1>
            </div>

            {/* Right — pill + tagline + CTA, baseline-aligned with the
                wordmark (justify-end pushes everything to the bottom). */}
            <div className="flex flex-col justify-end items-start gap-5 px-6 sm:px-10 md:px-14 lg:pr-20 lg:pl-4 pb-10 md:pb-12 lg:pb-14 max-w-[420px]">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase"
                style={{
                  background: 'rgba(155, 123, 247, 0.18)',
                  color: '#fff',
                  border: '1px solid rgba(155, 123, 247, 0.45)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: ACCENT }}
                />
                Built on Cloudflare&rsquo;s edge
              </span>

              <p
                className="text-base md:text-[1.05rem] text-white/90 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                An open URL shortener built on Cloudflare&rsquo;s edge.
                Lightning-fast redirects, click analytics, and a
                developer-first API — for any app you ship, Elixpo or
                yours.
              </p>

              <Link
                href="/api/auth/login"
                className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full font-semibold text-[0.95rem] text-white no-underline transition-all"
                style={{
                  background: 'rgba(11,13,18,0.85)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'rgba(155,123,247,0.22)';
                  e.currentTarget.style.borderColor =
                    'rgba(155,123,247,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    'rgba(11,13,18,0.85)';
                  e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.15)';
                }}
              >
                <span className="tracking-wider uppercase text-[0.78rem]">
                  Get Started
                </span>
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white transition-all group-hover:translate-x-0.5"
                  style={{
                    background:
                      'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
                    boxShadow: '0 4px 14px rgba(155,123,247,0.5)',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16 md:pb-20">
        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-[16px] transition-colors"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor =
                  'rgba(155,123,247,0.3)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor =
                  'rgba(255,255,255,0.08)')
              }
            >
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] mb-4"
                style={{
                  background: 'rgba(155,123,247,0.12)',
                  border: '1px solid rgba(155,123,247,0.25)',
                  color: ACCENT,
                }}
              >
                {f.icon}
              </div>
              <h3
                className="text-[1.05rem] font-bold mb-2 text-white"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                {f.title}
              </h3>
              <p
                className="text-[0.92rem] leading-relaxed text-white/62"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section
          className="mt-16 md:mt-20 p-6 md:p-10 rounded-[20px] text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(155,123,247,0.14) 0%, rgba(95,182,255,0.06) 100%)',
            border: '1px solid rgba(155,123,247,0.25)',
          }}
        >
          <h2 className="text-[1.5rem] md:text-[1.9rem] font-bold text-white tracking-tight mb-3">
            Start shortening in seconds.
          </h2>
          <p className="text-white/65 max-w-[520px] mx-auto mb-6">
            Sign in with your Elixpo account, mint your first short link, and
            grab an API key. Free tier, no credit card.
          </p>
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] font-semibold text-base text-white no-underline transition-all"
            style={{
              background: 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
              boxShadow: '0 8px 24px rgba(155,123,247,0.35)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)';
              e.currentTarget.style.boxShadow =
                '0 12px 32px rgba(155,123,247,0.5)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)';
              e.currentTarget.style.boxShadow =
                '0 8px 24px rgba(155,123,247,0.35)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Continue to sign in
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </section>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
