'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import {
  type BillingCurrency,
  type BillingInterval,
  CURRENCY_SYMBOL,
  type SellableTier,
  SELLABLE_TIER_ORDER,
  TIER_LIMITS,
  TIER_PRICING,
} from '@/lib/types';

const ACCENT = '#e53935';

// Per-tier feature bullets, derived from the single source of truth so the
// marketing copy can never drift from what the API actually enforces.
function retentionLabel(days: number): string {
  return days >= 365 ? `${Math.round(days / 365)}-year analytics retention` : `${days}-day click analytics`;
}

function featuresFor(tier: SellableTier): string[] {
  const l = TIER_LIMITS[tier];
  const out = [
    `${l.maxUrls.toLocaleString()} short links`,
    retentionLabel(l.maxClicksRetention),
    `${l.maxApiKeys} API key${l.maxApiKeys === 1 ? '' : 's'}`,
  ];
  out.push(l.customCodes ? 'Custom slugs' : 'Auto-generated slugs');
  out.push(l.analytics ? 'Geo / device analytics + CSV' : 'Click totals');
  if (l.expiringLinks) out.push('Expiring links');
  if (l.qrLogo) out.push('Custom QR logos and styles');
  return out;
}

interface MeState {
  loaded: boolean;
  loggedIn: boolean;
  currentTier: string | null;
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<BillingCurrency>('INR');
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [me, setMe] = useState<MeState>({
    loaded: false,
    loggedIn: false,
    currentTier: null,
  });
  // Tier whose checkout is in flight. Locks every CTA so a double-click
  // (or clicking a second tier mid-redirect) can't open two sessions.
  const [submitting, setSubmitting] = useState<SellableTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Gate the buttons until we know who the user is — otherwise we'd render
  // "Upgrade" to someone already on that tier, or fire checkout for a
  // logged-out visitor. Buttons stay disabled until this resolves.
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? (r.json() as Promise<{ tier?: string }>) : null))
      .then((d) => {
        if (!alive) return;
        setMe({
          loaded: true,
          loggedIn: !!d,
          currentTier: d?.tier ?? null,
        });
      })
      .catch(() => alive && setMe({ loaded: true, loggedIn: false, currentTier: null }));
    return () => {
      alive = false;
    };
  }, []);

  const select = useCallback(
    async (tier: SellableTier) => {
      // Hard guards: page not ready, or a checkout already in flight.
      if (!me.loaded || submitting) return;
      setError(null);

      if (!me.loggedIn) {
        window.location.assign(`/api/auth/login?return_to=${encodeURIComponent('/pricing')}`);
        return;
      }
      if (tier === 'free' || tier === me.currentTier) return;

      setSubmitting(tier);
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier, currency, interval }),
        });
        const data = (await res.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;
        if (res.ok && data?.url) {
          window.location.assign(data.url); // hosted Elixpo Pay checkout
          return; // keep locked through the navigation
        }
        setError(data?.error || 'Could not start checkout. Try again.');
        setSubmitting(null);
      } catch {
        setError('Network error starting checkout. Try again.');
        setSubmitting(null);
      }
    },
    [me, submitting, currency, interval],
  );

  return (
    <div className="theme-light min-h-screen flex flex-col text-[#111] bg-white">

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-16">
        <section className="text-center max-w-[720px] mx-auto flex flex-col items-center gap-5">
          <h1
            className="text-[2.2rem] md:text-[3.2rem] font-extrabold leading-[1.08] tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #111111 0%, #555555 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Simple pricing that <span style={{ color: ACCENT }}>scales with you.</span>
          </h1>
          <p className="text-base md:text-[1.1rem] text-white/65 max-w-[620px] leading-relaxed">
            Start free, no credit card. Scale to custom slugs, richer analytics,
            more API keys, and expiring links when you&apos;re ready.
          </p>

          {/* Toggles: currency + billing interval */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Toggle
              options={[
                { value: 'INR', label: '₹ INR' },
                { value: 'USD', label: '$ USD' },
              ]}
              value={currency}
              onChange={(v) => setCurrency(v as BillingCurrency)}
            />
            <div className="flex items-center gap-2">
              <Toggle
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'annual', label: 'Annual' },
                ]}
                value={interval}
                onChange={(v) => setInterval(v as BillingInterval)}
              />
              <span
                className="text-[0.7rem] font-bold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'rgba(52,211,153,0.14)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                2 months free
              </span>
            </div>
          </div>

          {/* Trust strip — lowers purchase anxiety */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.78rem] text-white/55 pt-1">
            {['No card on Free', 'Cancel anytime', 'Secure UPI / card autopay'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </section>

        {error && (
          <div
            className="mt-6 mx-auto max-w-md text-center text-sm rounded-xl px-4 py-3"
            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5' }}
          >
            {error}
          </div>
        )}

        {/* Tier cards */}
        <section className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {SELLABLE_TIER_ORDER.map((tier) => {
            const p = TIER_PRICING[tier];
            const amount = p.price[currency][interval];
            const isCurrent = me.loggedIn && me.currentTier === tier;
            const isPopular = tier === 'pro';
            return (
              <div
                key={tier}
                className="p-6 rounded-[18px] relative flex flex-col transition-opacity"
                style={{
                  // Current plan is greyed/dimmed — it's not an upgrade target.
                  background: isCurrent
                    ? 'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(250,250,250,0.9) 100%)'
                    : isPopular
                      ? 'linear-gradient(135deg, rgba(229,57,53,0.16) 0%, rgba(95,182,255,0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(250,250,250,0.92) 100%)',
                  border: isCurrent
                    ? '1px solid rgba(0,0,0,0.08)'
                    : isPopular
                      ? '1px solid rgba(229,57,53,0.45)'
                      : '1px solid rgba(0,0,0,0.10)',
                  backdropFilter: 'blur(20px)',
                  opacity: isCurrent ? 0.6 : 1,
                }}
              >
                {isCurrent ? (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,0,0,0.2)' }}
                  >
                    Current plan
                  </span>
                ) : isPopular ? (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)' }}
                  >
                    Most popular
                  </span>
                ) : null}

                <h3 className="text-[1.15rem] font-bold text-white">{p.name}</h3>
                <p className="text-[0.85rem] text-white/55 mt-1 mb-4 min-h-[2.4em]">{p.tagline}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[2.1rem] font-extrabold text-white">
                    {CURRENCY_SYMBOL[currency]}
                    {amount.toLocaleString()}
                  </span>
                  {amount > 0 && (
                    <span className="text-sm text-white/50">
                      /{interval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                <div className="text-[0.72rem] mb-5 h-4 flex items-center gap-2">
                  <span className="text-white/40">
                    {amount > 0 && interval === 'annual'
                      ? `${CURRENCY_SYMBOL[currency]}${Math.round(amount / 12).toLocaleString()}/mo, billed yearly`
                      : amount > 0
                        ? 'Billed monthly · autopay'
                        : 'Free forever'}
                  </span>
                  {amount > 0 && interval === 'annual' && (
                    <span className="font-semibold" style={{ color: '#6ee7b7' }}>
                      save {CURRENCY_SYMBOL[currency]}
                      {(p.price[currency].monthly * 12 - amount).toLocaleString()}
                    </span>
                  )}
                </div>

                <CtaButton
                  tier={tier}
                  loaded={me.loaded}
                  loggedIn={me.loggedIn}
                  isCurrent={isCurrent}
                  submitting={submitting}
                  popular={isPopular}
                  onSelect={select}
                  currentTier={me.currentTier}
                />

                <ul className="space-y-2 list-none p-0 mt-6">
                  {featuresFor(tier).map((f) => (
                    <li key={f} className="text-[0.85rem] text-white/75 flex items-start gap-2">
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Enterprise — non-priced 16:9 card to balance the layout */}
        <section className="mt-10">
          <div
            className="relative mx-auto w-full max-w-3xl rounded-[22px] overflow-hidden flex items-center justify-center text-center px-6 py-8"
            style={{
              aspectRatio: '16 / 9',
              background:
                'radial-gradient(120% 120% at 50% 0%, rgba(229,57,53,0.18) 0%, rgba(95,182,255,0.06) 40%, rgba(0,0,0,0.03) 100%)',
              border: '1px solid rgba(229,57,53,0.28)',
            }}
          >
            {/* soft glow accent */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(229,57,53,0.22) 0%, transparent 65%)' }}
            />
            <div className="relative z-10 flex flex-col items-center gap-4 max-w-[560px]">
              <span
                className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1 rounded-full"
                style={{ background: 'rgba(229,57,53,0.16)', color: '#c62828', border: '1px solid rgba(229,57,53,0.35)' }}
              >
                Enterprise
              </span>
              <h3
                className="text-[1.5rem] md:text-[1.9rem] font-extrabold leading-tight"
                style={{
                  background: 'linear-gradient(180deg, #111111 0%, #555555 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Built around your organization
              </h3>

              {/* Short perks */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                {[
                  'Custom link limits',
                  'Up to 2 years of analytics',
                  'Up to 100 API keys',
                  'Custom billing review',
                  'Priority onboarding',
                ].map((perk) => (
                  <span key={perk} className="inline-flex items-center gap-1.5 text-[0.82rem] text-white/75">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ACCENT }} />
                    {perk}
                  </span>
                ))}
              </div>

              <a
                href="mailto:hello@elixpo.com?subject=ElixpoURL%20Enterprise"
                className="mt-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[12px] font-semibold text-sm text-white no-underline transition-all"
                style={{
                  background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                  boxShadow: '0 8px 24px rgba(229,57,53,0.35)',
                }}
              >
                Contact team
              </a>
            </div>
          </div>
        </section>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="inline-flex p-1 rounded-[12px] gap-1"
      style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.10)' }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="px-3.5 py-1.5 rounded-[9px] text-[0.82rem] font-semibold transition-all cursor-pointer border-none"
          style={
            value === o.value
              ? { background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', color: '#fff' }
              : { background: 'transparent', color: 'rgba(0,0,0,0.6)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CtaButton({
  tier,
  loaded,
  loggedIn,
  isCurrent,
  submitting,
  popular,
  onSelect,
  currentTier,
}: {
  tier: SellableTier;
  loaded: boolean;
  loggedIn: boolean;
  isCurrent: boolean;
  submitting: SellableTier | null;
  popular: boolean;
  onSelect: (t: SellableTier) => void;
  currentTier: string | null;
}) {
  const thisSubmitting = submitting === tier;
  // Disabled while: page not yet loaded (idempotency guard — no clicks
  // before we know state), any checkout in flight, or this is the user's
  // current plan / the free tier for a logged-in user.
  const isCurrentPlanCta = isCurrent || (tier === 'free' && loggedIn);
  const disabled = !loaded || submitting !== null || isCurrentPlanCta;

  const currentTierIndex = currentTier === 'enterprise' ? 3 : SELLABLE_TIER_ORDER.indexOf(currentTier as SellableTier);
  const cardTierIndex = SELLABLE_TIER_ORDER.indexOf(tier);
  const isDowngrade = loggedIn && currentTierIndex > cardTierIndex;

  let label: string;
  if (!loaded) label = 'Loading…';
  else if (thisSubmitting) label = 'Starting checkout…';
  else if (isCurrent) label = 'Current plan';
  else if (isDowngrade) {
    const tierNames: Record<SellableTier, string> = { free: 'Free', pro: 'Pro', business: 'Business' };
    label = `Downgrade to ${tierNames[tier]}`;
  } else if (tier === 'free') label = loggedIn ? 'Included' : 'Start for free';
  else if (!loggedIn) label = `Sign in to get ${tier === 'pro' ? 'Pro' : 'Business'}`;
  else label = `Upgrade to ${tier === 'pro' ? 'Pro' : 'Business'}`;

  // The current-plan CTA is never a gradient — it's greyed out.
  const filled = !isCurrentPlanCta && (popular || tier !== 'free');

  return (
    <button
      type="button"
      onClick={() => onSelect(tier)}
      disabled={disabled}
      aria-busy={thisSubmitting}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-all border-none"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: !loaded ? 0.5 : 1,
        color: isCurrentPlanCta ? 'rgba(0,0,0,0.4)' : filled ? '#fff' : 'rgba(0,0,0,0.9)',
        background: isCurrentPlanCta
          ? 'rgba(0,0,0,0.06)'
          : filled
            ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)'
            : 'transparent',
        boxShadow: filled && !disabled ? '0 6px 18px rgba(229,57,53,0.32)' : 'none',
        border: isCurrentPlanCta
          ? '1px solid rgba(255,255,255,0.1)'
          : filled
            ? 'none'
            : '1px solid rgba(255,255,255,0.16)',
      }}
    >
      {thisSubmitting && (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}
