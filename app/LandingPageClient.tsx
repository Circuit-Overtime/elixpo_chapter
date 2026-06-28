'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import Footer from './components/Footer';
import Navbar from './components/Navbar';

const ACCENT = '#e53935';

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

const SignInIcon = () => (
  <Icon>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);
const ShortenIcon = () => (
  <Icon>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </Icon>
);
const TrackIcon = () => (
  <Icon>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </Icon>
);

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

/* ── Content (unchanged copy) ──────────────────────────────────────────── */

const REGIONS = [
  'North America',
  'Europe',
  'Asia Pacific',
  'South America',
  'Africa',
  'Middle East',
  '< 50ms',
];

const STEPS: { n: string; icon: ReactNode; title: string; body: string }[] = [
  {
    n: '01',
    icon: <SignInIcon />,
    title: 'Sign in',
    body: 'Authenticate with your Elixpo account — no separate signup, no password to remember.',
  },
  {
    n: '02',
    icon: <ShortenIcon />,
    title: 'Shorten',
    body: 'Paste a long URL, pick a slug or let us mint one, and your link goes live on the edge.',
  },
  {
    n: '03',
    icon: <TrackIcon />,
    title: 'Track',
    body: 'Watch clicks, countries, and referrers in real time — or call the API and pipe them anywhere.',
  },
];

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <BoltIcon />,
    title: 'Edge-native redirects',
    body: "Links resolve on Cloudflare's edge in under 50ms worldwide. No cold starts, no proxy hops between the click and the destination.",
  },
  {
    icon: <ChartIcon />,
    title: 'Click analytics',
    body: 'Real-time counts with country, referrer, and device breakdowns. No third-party script — the data lives on your account.',
  },
  {
    icon: <SlugIcon />,
    title: 'Custom slugs',
    body: 'Choose the slug yourself or generate a short one. Collision checks run at write time so a link is never ambiguous.',
  },
  {
    icon: <QrIcon />,
    title: 'Styled QR codes',
    body: 'Generate a QR for any link, tinted to your accent and exportable as SVG or PNG — ready for print or a slide.',
  },
  {
    icon: <DomainIcon />,
    title: 'Branded domains',
    body: 'Point your own domain at ElixpoURL on Pro and Business so every short link carries your name, not ours.',
  },
  {
    icon: <ApiIcon />,
    title: 'REST API',
    body: 'Create, list, and revoke links with scoped API keys and predictable JSON. Drop it into any app you ship.',
  },
];

const USE_CASES = [
  'Campaign links',
  'Social bios',
  'QR codes for print',
  'API integrations',
  'Team link management',
  'Branded short domains',
];

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#111] bg-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="text-center px-6 pt-[88px] pb-[72px] max-w-[860px] mx-auto">
        <p
          className="text-[11px] font-bold tracking-[0.14em] uppercase mb-5"
          style={{ color: ACCENT }}
        >
          Edge-native URL shortener
        </p>
        <h1 className="font-semibold leading-[1.02] tracking-[-0.035em] text-[#111] text-[clamp(2.4rem,7vw,5.2rem)] mb-[22px]   ">
          Short <span className='text-slate-400'>links.</span>
           {/* <span className="italic font-bold text-[#888]">Real tracking.</span> */}
          <br />
          Edge Speed.
        </h1>
        <p className="text-[1.05rem] leading-relaxed text-[#555] max-w-[540px] mx-auto mb-9">
          Paste a URL, get a link that resolves in under 50ms worldwide — with
          click analytics, custom slugs, and a REST API, all from one
          dashboard.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/api/auth/login" className="btn-accent">
            Get started with Elixpo
          </Link>
          <Link href="/docs" className="btn-glass">
            Explore the docs
            <ArrowIcon />
          </Link>
        </div>
      </div>

      {/* ── Edge network strip ──────────────────────────────────────────── */}
      <div
        className="py-7 px-6 text-center"
        style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
      >
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#888] mb-[18px]">
          Resolves on Cloudflare&apos;s global network
        </p>
        <div className="flex items-center justify-center gap-10 flex-wrap">
          {REGIONS.map((r) => (
            <span key={r} className="text-[15px] font-semibold text-[#aaa] tracking-[-0.01em]">
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* ── How it works (3 steps) ──────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-[900px] mx-auto">
          <p
            className="text-center text-[11px] font-bold tracking-[0.14em] uppercase mb-3.5"
            style={{ color: ACCENT }}
          >
            How it works
          </p>
          <h2 className="text-center font-extrabold tracking-[-0.03em] text-[clamp(2rem,5vw,3rem)] text-[#111] mb-3.5">
            Live in three steps
          </h2>
          <p className="text-center text-base text-[#555] leading-relaxed max-w-[560px] mx-auto mb-[52px]">
            Sign in, shorten a URL, then watch the clicks — no redirect
            middleware, no separate account.
          </p>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0 max-w-[820px] mx-auto">
            <div
              className="hidden md:block absolute top-9 left-[calc(16.66%+4px)] w-[calc(66.66%-8px)] h-px"
              style={{ borderTop: `2px dashed ${ACCENT}33` }}
              aria-hidden="true"
            />
            {STEPS.map((s) => (
              <div key={s.n} className="relative z-[1] flex flex-col items-center text-center px-6">
                <div
                  className="w-[72px] h-[72px] rounded-[18px] grid place-items-center mb-4"
                  style={{
                    background: '#fff',
                    border: `1.5px solid ${ACCENT}33`,
                    boxShadow: `0 2px 12px ${ACCENT}14`,
                    color: ACCENT,
                  }}
                >
                  {s.icon}
                </div>
                <p
                  className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5"
                  style={{ color: ACCENT }}
                >
                  Step {s.n}
                </p>
                <h3 className="text-base font-bold text-[#111] mb-2">{s.title}</h3>
                <p className="text-[0.875rem] leading-relaxed text-[#555]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: 'var(--bg-cream)' }}>
        <div className="max-w-[1120px] mx-auto">
          <p
            className="text-center text-[11px] font-bold tracking-[0.14em] uppercase mb-3.5"
            style={{ color: ACCENT }}
          >
            Capabilities
          </p>
          <h2 className="text-center font-extrabold tracking-[-0.03em] text-[clamp(2rem,5vw,3rem)] text-[#111] mb-3.5">
            Everything a link should do
          </h2>
          <p className="text-center text-base text-[#555] leading-relaxed max-w-[560px] mx-auto mb-[52px]">
            Redirects, analytics, branding, and an API behind one dashboard —
            so you ship the link and skip the plumbing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass-card-hover p-7 flex flex-col gap-3"
                style={{ borderColor: '#ede9e3' }}
              >
                <div
                  className="w-11 h-11 rounded-xl grid place-items-center"
                  style={{ background: 'var(--accent-dim)', color: ACCENT }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-[#111]">{f.title}</h3>
                <p className="text-[0.875rem] leading-relaxed text-[#555] flex-1">{f.body}</p>
                <Link
                  href="/docs"
                  className="text-[13px] font-semibold no-underline inline-flex items-center gap-1"
                  style={{ color: ACCENT }}
                >
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases pill strip ─────────────────────────────────────────── */}
      <section className="pt-12 pb-16 px-6">
        <div className="max-w-[900px] mx-auto text-center">
          <p
            className="text-[11px] font-bold tracking-[0.14em] uppercase mb-3.5"
            style={{ color: ACCENT }}
          >
            Built for every link moment
          </p>
          <h2 className="font-extrabold tracking-[-0.03em] text-[clamp(1.8rem,4vw,2.4rem)] text-[#111] mb-8">
            Every use case, one tool
          </h2>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {USE_CASES.map((u) => (
              <div
                key={u}
                className="inline-flex items-center gap-2 px-[18px] py-2 rounded-full text-sm font-medium text-[#111] bg-white"
                style={{ border: '1.5px solid var(--line)' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
                {u}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API teaser ──────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-14 py-20">
            <div className="flex-1 md:max-w-[340px] text-center md:text-left">
              <p
                className="text-[11px] font-bold tracking-[0.14em] uppercase mb-3"
                style={{ color: ACCENT }}
              >
                For developers
              </p>
              <h3 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold tracking-[-0.025em] text-[#111] mb-3">
                One POST and you have a link
              </h3>
              <p className="text-[0.95rem] leading-relaxed text-[#555] mb-6">
                Authenticate with a scoped API key, send the destination, and
                get back the short URL plus its analytics handle. The same
                endpoints that power the dashboard are open to you.
              </p>
              <Link href="/docs/api" className="btn-glass" style={{ borderRadius: 8, padding: '9px 18px', fontSize: 14 }}>
                Explore the API →
              </Link>
            </div>

            {/* code artifact — non-interactive, framed as a terminal */}
            <div
              aria-hidden
              className="flex-1 w-full max-w-[520px] rounded-2xl overflow-hidden select-none"
              style={{ border: '1px solid var(--line)', background: '#1a1d26', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}
            >
              <div
                className="flex items-center gap-2 px-3.5 py-2.5"
                style={{ background: '#14161f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex gap-1.5">
                  {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                    <span key={c} className="w-[10px] h-[10px] rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <span
                  className="ml-1 text-[11px] text-white/35"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  POST api.lixrl.com/v1/links
                </span>
              </div>
              <pre
                className="p-5 text-[12.5px] leading-[1.75] overflow-x-auto m-0"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                <code>
                  <span className="text-white/35">{'$ '}</span>
                  <span className="text-[#86efac]">curl</span>
                  <span className="text-white/80">{' -X POST api.lixrl.com/v1/links \\'}</span>
                  {'\n'}
                  <span className="text-white/80">{'    -H '}</span>
                  <span className="text-[#fbbf24]">{'"Authorization: Bearer $KEY"'}</span>
                  <span className="text-white/80">{' \\'}</span>
                  {'\n'}
                  <span className="text-white/80">{'    -d '}</span>
                  <span className="text-[#fbbf24]">{'\'{"url":"https://elixpo.com","slug":"home"}\''}</span>
                  {'\n\n'}
                  <span className="text-white/35">{'{'}</span>
                  {'\n'}
                  <span className="text-white/35">{'  '}</span>
                  <span className="text-[#c4b5fd]">{'"short"'}</span>
                  <span className="text-white/80">{': '}</span>
                  <span className="text-[#86efac]">{'"https://lixrl.com/home"'}</span>
                  <span className="text-white/80">{','}</span>
                  {'\n'}
                  <span className="text-white/35">{'  '}</span>
                  <span className="text-[#c4b5fd]">{'"clicks"'}</span>
                  <span className="text-white/80">{': '}</span>
                  <span className="text-[#93c5fd]">{'0'}</span>
                  {'\n'}
                  <span className="text-white/35">{'}'}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ──────────────────────────────────────────────── */}
      <section className="text-center py-16 px-6" style={{ borderTop: '1px solid var(--line)' }}>
        <h2 className="font-extrabold tracking-[-0.025em] text-[clamp(1.8rem,4vw,2.5rem)] text-[#111] mb-3">
          Pricing that scales with you
        </h2>
        <p className="text-base text-[#555] mb-7">
          Start free, upgrade when you need branded domains and higher limits.
        </p>
        <Link href="/pricing" className="btn-glass" style={{ borderRadius: 8, padding: '10px 22px' }}>
          See pricing →
        </Link>
      </section>

      {/* ── Final CTA band ──────────────────────────────────────────────── */}
      <div className="px-6 pb-20">
        <div
          className="max-w-[820px] mx-auto rounded-[20px] py-14 px-10 text-center overflow-hidden relative"
          style={{ background: '#16192a' }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 480,
              height: 260,
              background:
                'radial-gradient(ellipse, rgba(229,57,53,0.45) 0%, rgba(180,40,40,0.25) 45%, transparent 70%)',
            }}
          />
          <h2 className="relative z-[1] text-[clamp(1.6rem,3.5vw,2.2rem)] font-extrabold text-white tracking-[-0.02em] mb-3">
            Mint your first short link
          </h2>
          <p className="relative z-[1] text-[0.97rem] text-white/65 max-w-[480px] mx-auto mb-7 leading-relaxed">
            Sign in with your Elixpo account, shorten a URL, and grab an API
            key — free tier, no credit card.
          </p>
          <Link
            href="/api/auth/login"
            className="relative z-[1] inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-[15px] text-[#111] no-underline transition-all"
            style={{ background: '#fff' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Sign in with Elixpo →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
