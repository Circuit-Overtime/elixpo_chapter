'use client';

import Link from 'next/link';
import BackgroundAurora from '../components/BackgroundAurora';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const ACCENT = '#9b7bf7';

const PLANNED_TIERS = [
  {
    name: 'Free',
    tagline: 'For personal projects and trying things out.',
    highlights: ['Generous link quota', '1 API key', 'Basic click analytics'],
  },
  {
    name: 'Core',
    tagline: 'For makers shipping real apps.',
    highlights: [
      'Higher monthly limit',
      'Multiple API keys',
      'Click analytics, 30 days',
    ],
  },
  {
    name: 'Growth',
    tagline: 'For teams that need branded links and headroom.',
    highlights: [
      'Branded short domain',
      'Long-retention analytics',
      'Webhook delivery',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Talk to us.',
    highlights: ['Custom limits', 'SLA + support', 'Single sign-on'],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#f5f5f4] relative">
      <BackgroundAurora variant="default" />

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-16">
        <section className="text-center max-w-[720px] mx-auto flex flex-col items-center gap-5">
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
            Pricing — Coming soon
          </span>

          <h1
            className="text-[2.2rem] md:text-[3.2rem] font-extrabold leading-[1.08] tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #c8c4d8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Paid tiers are{' '}
            <span style={{ color: ACCENT }}>almost ready.</span>
          </h1>

          <p
            className="text-base md:text-[1.1rem] text-white/65 max-w-[620px] leading-relaxed"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            Until then, every account uses the Free tier — generous limits, no
            credit card, no surprises. Drop us a line if you want first dibs
            when Core, Growth, or Enterprise go live.
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
              Start with Free
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
              Read the docs
            </Link>
          </div>
        </section>

        {/* Teaser cards — labelled "Coming soon" so expectations are clear */}
        <section className="mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PLANNED_TIERS.map((t) => (
            <div
              key={t.name}
              className="p-6 rounded-[16px] relative"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-[1.1rem] font-bold text-white"
                  style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                >
                  {t.name}
                </h3>
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Soon
                </span>
              </div>
              <p
                className="text-[0.9rem] text-white/60 leading-relaxed mb-4"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                {t.tagline}
              </p>
              <ul className="space-y-1.5 list-none p-0">
                {t.highlights.map((h) => (
                  <li
                    key={h}
                    className="text-[0.88rem] text-white/70 flex items-start gap-2"
                  >
                    <span
                      className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ background: ACCENT }}
                    />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section
          className="mt-14 md:mt-20 p-6 md:p-8 rounded-[20px] text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(155,123,247,0.12) 0%, rgba(95,182,255,0.05) 100%)',
            border: '1px solid rgba(155,123,247,0.25)',
          }}
        >
          <h2 className="text-[1.3rem] md:text-[1.7rem] font-bold text-white tracking-tight mb-2">
            Building something on ElixpoURL?
          </h2>
          <p className="text-white/65 max-w-[520px] mx-auto mb-5 text-sm md:text-base">
            Tell us what limits matter to your use case. Your input shapes the
            paid tiers before they ship.
          </p>
          <a
            href="mailto:hello@elixpo.com?subject=ElixpoURL%20pricing%20feedback"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-semibold text-sm text-white no-underline transition-all"
            style={{
              background: 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
              boxShadow: '0 6px 20px rgba(155,123,247,0.32)',
            }}
          >
            Tell us what you need
          </a>
        </section>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
