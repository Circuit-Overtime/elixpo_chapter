'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import BackgroundAurora from './components/BackgroundAurora';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import PixelHero from './components/PixelHero';

const CARD_BG =
  'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)';

/* ── Icons (inline SVG, stroke = currentColor) ──────────────────────────── */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const BoltIcon = () => (
  <Icon>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Icon>
);
const ChartIcon = () => (
  <Icon>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </Icon>
);
const SlugIcon = () => (
  <Icon>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </Icon>
);
const QrIcon = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <line x1="14" y1="14" x2="14" y2="14" />
    <path d="M14 14h3v3M21 14v7h-7v-3" />
  </Icon>
);
const DomainIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
  </Icon>
);
const ApiIcon = () => (
  <Icon>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Icon>
);
const ArrowIcon = () => (
  <Icon>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Icon>
);

/* ── Content ────────────────────────────────────────────────────────────── */

const STEPS: { n: string; title: string; body: string; accent: string }[] = [
  {
    n: '01',
    title: 'Sign in',
    body: 'Authenticate with your Elixpo account — no separate signup, no password to remember.',
    accent: '#9b7bf7',
  },
  {
    n: '02',
    title: 'Shorten',
    body: 'Paste a long URL, pick a slug or let us mint one, and your link goes live on the edge.',
    accent: '#5fb6ff',
  },
  {
    n: '03',
    title: 'Track',
    body: 'Watch clicks, countries, and referrers in real time — or call the API and pipe them anywhere.',
    accent: '#86efac',
  },
];

const FEATURES: {
  icon: ReactNode;
  title: string;
  body: string;
  accent: string;
}[] = [
  {
    icon: <BoltIcon />,
    title: 'Edge-native redirects',
    body: "Links resolve on Cloudflare's edge in under 50ms worldwide. No cold starts, no proxy hops between the click and the destination.",
    accent: '#9b7bf7',
  },
  {
    icon: <ChartIcon />,
    title: 'Click analytics',
    body: 'Real-time counts with country, referrer, and device breakdowns. No third-party script — the data lives on your account.',
    accent: '#5fb6ff',
  },
  {
    icon: <SlugIcon />,
    title: 'Custom slugs',
    body: 'Choose the slug yourself or generate a short one. Collision checks run at write time so a link is never ambiguous.',
    accent: '#86efac',
  },
  {
    icon: <QrIcon />,
    title: 'Styled QR codes',
    body: 'Generate a QR for any link, tinted to your accent and exportable as SVG or PNG — ready for print or a slide.',
    accent: '#fbbf24',
  },
  {
    icon: <DomainIcon />,
    title: 'Branded domains',
    body: 'Point your own domain at ElixpoURL on Pro and Business so every short link carries your name, not ours.',
    accent: '#ff7cc9',
  },
  {
    icon: <ApiIcon />,
    title: 'REST API',
    body: 'Create, list, and revoke links with scoped API keys and predictable JSON. Drop it into any app you ship.',
    accent: '#c4b5fd',
  },
];

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const rise = (delay: string) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 0.7s ease, transform 0.7s ease',
    transitionDelay: delay,
  });

  return (
    <div className="min-h-screen flex flex-col text-[#f5f5f4] relative bg-black">
      <BackgroundAurora variant="default" />

      <style>{`
        @keyframes url-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .url-marquee { animation: url-marquee 26s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .url-marquee { animation: none; } }
      `}</style>

      <div className="relative z-10">
        <Navbar />
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* soft purple glow behind the headline */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '60vmax',
            height: '38vmax',
            background:
              'radial-gradient(circle, rgba(155,123,247,0.16) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />

        <span
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[0.8rem] font-semibold backdrop-blur-md"
          style={{
            ...rise('0s'),
            color: '#b69aff',
            background: 'rgba(155,123,247,0.1)',
            border: '1px solid rgba(155,123,247,0.25)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: ACCENT }}
          />
          Built on Cloudflare&rsquo;s edge
        </span>

        <h1
          className="mt-6 font-bold tracking-[-0.03em] leading-[1.02] flex flex-wrap justify-center gap-x-[0.35em]"
          style={{ ...rise('0.05s'), fontSize: 'clamp(2.6rem, 8vw, 5.6rem)' }}
        >
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'rgba(245,245,244,0.92)',
            }}
          >
            Short links,
          </span>
          <span
            style={{
              fontWeight: 800,
              backgroundImage:
                'linear-gradient(135deg, #f5f5f4 0%, #9b7bf7 42%, #5fb6ff 78%, #86efac 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            edge speed.
          </span>
        </h1>

        <p
          className="mt-6 max-w-[600px] text-[1.02rem] md:text-[1.12rem] leading-relaxed text-white/72"
          style={rise('0.15s')}
        >
          An open URL shortener built on Cloudflare&rsquo;s edge. Instant
          redirects, click analytics, custom slugs, and a developer-first REST
          API — for any app you ship, Elixpo or yours.
        </p>

        <div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          style={rise('0.3s')}
        >
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-2 h-[50px] px-7 rounded-[14px] font-bold text-[0.95rem] text-white no-underline transition-all"
            style={{
              background: 'linear-gradient(180deg, #a98cff 0%, #7c5cff 100%)',
              boxShadow:
                'inset 0 1px 1px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2), 0 14px 30px rgba(124,92,255,0.35)',
            }}
          >
            Start free
            <ArrowIcon />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 h-[50px] px-7 rounded-[14px] font-bold text-[0.95rem] text-[#f5f5f4] no-underline backdrop-blur-md transition-all"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
            }}
          >
            Read the docs
          </Link>
        </div>

        {/* trust marquee */}
        <div
          className="mt-14 w-full max-w-[860px] overflow-hidden"
          style={{
            ...rise('0.5s'),
            WebkitMaskImage:
              'linear-gradient(to right, transparent, white 15%, white 85%, transparent)',
            maskImage:
              'linear-gradient(to right, transparent, white 15%, white 85%, transparent)',
          }}
        >
          <div className="url-marquee flex w-max gap-12 py-1">
            {[0, 1].map((dup) => (
              <div
                key={dup}
                className="flex gap-12 items-center shrink-0"
                aria-hidden={dup === 1}
              >
                {TRUST.map((t) => (
                  <span
                    key={`${dup}-${t}`}
                    className="text-[0.95rem] font-semibold whitespace-nowrap text-white/45"
                    style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works (3 steps) ──────────────────────────────────────── */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-4 py-12 md:py-16">
        <p className="text-center text-[0.8rem] font-bold tracking-[0.12em] uppercase text-[#b69aff] mb-2">
          Get started
        </p>
        <h2 className="text-center font-extrabold tracking-[-0.02em] text-[1.7rem] md:text-[2.3rem] text-white">
          Live in three steps
        </h2>

        <div className="relative mt-10 md:mt-14">
          {/* dashed roadmap line (desktop) */}
          <svg
            viewBox="0 0 1000 54"
            preserveAspectRatio="none"
            className="hidden md:block absolute top-0 left-[8%] w-[84%] h-14 overflow-visible z-0"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="url-rm" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9b7bf7" />
                <stop offset="50%" stopColor="#5fb6ff" />
                <stop offset="100%" stopColor="#86efac" />
              </linearGradient>
            </defs>
            <path
              d="M0 27 C 110 4, 230 4, 333 27 S 560 50, 666 27 S 880 4, 1000 27"
              fill="none"
              stroke="url(#url-rm)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="1 13"
              opacity="0.65"
            />
          </svg>

          <div className="relative z-[1] flex flex-col md:flex-row md:justify-between gap-10 md:gap-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="flex-1 flex flex-col items-center text-center md:max-w-[240px] mx-auto"
              >
                <div
                  className="w-[54px] h-[54px] rounded-full grid place-items-center font-extrabold text-lg"
                  style={{
                    color: s.accent,
                    background: '#0e1117',
                    border: `1px solid ${s.accent}55`,
                    boxShadow: `0 0 0 6px #0b0d12, 0 8px 24px ${s.accent}33`,
                  }}
                >
                  {s.n}
                </div>
                <h3 className="mt-4 text-[1.05rem] font-bold text-white">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-[0.88rem] leading-relaxed text-white/60">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────────────────── */}
      <section
        id="features"
        className="relative z-10 w-full max-w-6xl mx-auto px-4 py-14 md:py-20 scroll-mt-20"
      >
        <div className="text-center max-w-[620px] mx-auto mb-10 md:mb-14">
          <h2 className="font-extrabold tracking-[-0.02em] leading-[1.05] text-[2.1rem] md:text-[3rem] text-white">
            Everything a link should do
          </h2>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-white/65">
            Redirects, analytics, branding, and an API behind one dashboard —
            so you ship the link and skip the plumbing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-[16px] transition-colors"
              style={{
                background: CARD_BG,
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(155,123,247,0.3)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')
              }
            >
              <div
                className="inline-flex items-center justify-center w-[54px] h-[54px] rounded-[16px] mb-4"
                style={{
                  color: f.accent,
                  background: `${f.accent}14`,
                  border: `1px solid ${f.accent}40`,
                  boxShadow: `0 8px 26px ${f.accent}26`,
                }}
              >
                {f.icon}
              </div>
              <h3 className="text-[1.05rem] font-bold mb-2 text-white">
                {f.title}
              </h3>
              <p
                className="text-[0.9rem] leading-relaxed text-white/62"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── API teaser ──────────────────────────────────────────────────── */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 py-10 md:py-16">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="max-w-[400px] text-center md:text-left">
            <p className="text-[0.8rem] font-bold tracking-[0.12em] uppercase text-[#b69aff] mb-2">
              For developers
            </p>
            <h3 className="text-[1.6rem] md:text-[2rem] font-bold text-white tracking-tight mb-3">
              One POST and you have a link
            </h3>
            <p className="text-[0.95rem] leading-relaxed text-white/62 mb-6">
              Authenticate with a scoped API key, send the destination, and get
              back the short URL plus its analytics handle. The same endpoints
              that power the dashboard are open to you.
            </p>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-semibold text-[0.92rem] text-white no-underline transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.16)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(155,123,247,0.5)';
                e.currentTarget.style.background = 'rgba(155,123,247,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Explore the API
              <ArrowIcon />
            </Link>
          </div>

          {/* code artifact — non-interactive, framed as a terminal */}
          <div
            aria-hidden
            className="w-full max-w-[440px] rounded-[16px] overflow-hidden select-none"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#0b0d12',
              boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            }}
          >
            <div
              className="flex items-center gap-2 px-3.5 py-2.5"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.025)',
              }}
            >
              <div className="flex gap-1.5">
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                  <span
                    key={c}
                    className="w-[9px] h-[9px] rounded-full"
                    style={{ background: c, opacity: 0.55 }}
                  />
                ))}
              </div>
              <span
                className="ml-1 text-[0.66rem] text-white/40"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                POST api.lixrl.com/v1/links
              </span>
            </div>
            <pre
              className="p-4 text-[0.78rem] leading-[1.7] overflow-x-auto m-0"
              style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              <code>
                <span className="text-white/40">{'$ '}</span>
                <span className="text-[#86efac]">curl</span>
                <span className="text-white/85">{' -X POST api.lixrl.com/v1/links \\'}</span>
                {'\n'}
                <span className="text-white/85">{'    -H '}</span>
                <span className="text-[#fbbf24]">{'"Authorization: Bearer $KEY"'}</span>
                <span className="text-white/85">{' \\'}</span>
                {'\n'}
                <span className="text-white/85">{'    -d '}</span>
                <span className="text-[#fbbf24]">{'\'{"url":"https://elixpo.com","slug":"home"}\''}</span>
                {'\n\n'}
                <span className="text-white/40">{'{'}</span>
                {'\n'}
                <span className="text-white/40">{'  '}</span>
                <span className="text-[#9b7bf7]">{'"short"'}</span>
                <span className="text-white/85">{': '}</span>
                <span className="text-[#86efac]">{'"https://lixrl.com/home"'}</span>
                <span className="text-white/85">{','}</span>
                {'\n'}
                <span className="text-white/40">{'  '}</span>
                <span className="text-[#9b7bf7]">{'"clicks"'}</span>
                <span className="text-white/85">{': '}</span>
                <span className="text-[#5fb6ff]">{'0'}</span>
                {'\n'}
                <span className="text-white/40">{'}'}</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ──────────────────────────────────────────────── */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center max-w-[560px] mx-auto mb-8 md:mb-10">
          <h2 className="font-extrabold tracking-[-0.02em] text-[1.9rem] md:text-[2.5rem] text-white">
            Pricing that scales with you
          </h2>
          <p className="mt-3 text-[1rem] leading-relaxed text-white/65">
            Start free, upgrade when you need branded domains and higher limits.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              name: 'Free',
              price: '$0',
              note: 'For personal links',
              perks: ['Unlimited edge redirects', 'Basic click analytics', 'API access'],
              highlight: false,
            },
            {
              name: 'Pro',
              price: '$8',
              note: 'per month',
              perks: ['1 branded domain', 'Full analytics history', 'Styled QR codes'],
              highlight: true,
            },
            {
              name: 'Business',
              price: '$24',
              note: 'per month',
              perks: ['Multiple domains', 'Team API keys', 'Priority edge support'],
              highlight: false,
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className="p-6 rounded-[16px] flex flex-col"
              style={{
                background: tier.highlight
                  ? 'linear-gradient(135deg, rgba(155,123,247,0.14) 0%, rgba(95,182,255,0.06) 100%)'
                  : CARD_BG,
                border: tier.highlight
                  ? '1px solid rgba(155,123,247,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.95rem] font-bold text-white">
                  {tier.name}
                </span>
                {tier.highlight && (
                  <span
                    className="text-[0.62rem] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{
                      color: '#b69aff',
                      background: 'rgba(155,123,247,0.16)',
                      border: '1px solid rgba(155,123,247,0.3)',
                    }}
                  >
                    Popular
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[2rem] font-extrabold text-white">
                  {tier.price}
                </span>
                <span className="text-[0.8rem] text-white/45">{tier.note}</span>
              </div>
              <ul className="mt-4 space-y-2 list-none p-0 flex-1">
                {tier.perks.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-[0.88rem] text-white/70"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#86efac"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] font-semibold text-[0.95rem] text-white no-underline transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.16)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(155,123,247,0.5)';
              e.currentTarget.style.background = 'rgba(155,123,247,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Compare all plans
            <ArrowIcon />
          </Link>
        </div>
      </section>

      {/* ── Final CTA band ──────────────────────────────────────────────── */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div
          className="p-8 md:p-12 rounded-[20px] text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(155,123,247,0.14) 0%, rgba(95,182,255,0.06) 100%)',
            border: '1px solid rgba(155,123,247,0.25)',
          }}
        >
          <h2 className="text-[1.6rem] md:text-[2.1rem] font-bold text-white tracking-tight mb-3">
            Mint your first short link
          </h2>
          <p className="text-white/65 max-w-[520px] mx-auto mb-7">
            Sign in with your Elixpo account, shorten a URL, and grab an API key
            — free tier, no credit card.
          </p>
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-[12px] font-semibold text-base text-white no-underline transition-all"
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
            Start free
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
