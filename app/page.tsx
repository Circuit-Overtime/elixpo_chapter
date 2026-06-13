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
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'Click analytics out of the box',
    body: 'Real-time counts, country breakdown, referrers, devices — no extra setup, no third-party script. Your data stays on your account.',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'Custom slugs & branded links',
    body: 'Pick the slug yourself or let us generate one. Branded domains coming on the Growth tier so your links wear your name.',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#f5f5f4] relative">
      <BackgroundAurora variant="default" />

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-16 md:pb-20">
        {/* Hero */}
        <section className="max-w-[820px] mx-auto text-center flex flex-col items-center gap-5">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase"
            style={{
              background: 'rgba(155, 123, 247, 0.12)',
              color: ACCENT,
              border: '1px solid rgba(155, 123, 247, 0.3)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: ACCENT }}
            />
            Built on Cloudflare&rsquo;s edge
          </span>

          <h1
            className="text-[2.4rem] md:text-[3.6rem] font-extrabold leading-[1.08] tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #c8c4d8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Short links.{' '}
            <span style={{ color: ACCENT }}>For any app you ship.</span>
          </h1>

          <p
            className="text-base md:text-[1.15rem] text-white/65 max-w-[640px] leading-relaxed"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            Open URL shortener with edge-fast redirects, real-time click
            analytics, and a developer-first API. Born inside the Elixpo
            ecosystem, free for any product or developer to use.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/api/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] font-semibold text-base text-white no-underline transition-all"
              style={{
                background:
                  'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
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
              Get started
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
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] font-medium text-base text-white/85 no-underline transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(155,123,247,0.4)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Integrator docs
            </Link>
          </div>
        </section>

        {/* Product video */}
        <section className="mt-12 md:mt-16 max-w-[960px] mx-auto">
          <div
            className="rounded-[20px] overflow-hidden"
            style={{
              border: '1px solid rgba(155,123,247,0.25)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
              background: 'rgba(11,13,18,0.5)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <video
              src="/product_pitch.mp4"
              controls
              playsInline
              preload="metadata"
              poster="/og-image.png"
              className="w-full h-auto block"
            >
              <track kind="captions" />
              Your browser does not support embedded video.
            </video>
          </div>
        </section>

        {/* Features */}
        <section className="mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 gap-5">
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
