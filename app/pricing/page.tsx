'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BackgroundAurora from '../components/BackgroundAurora';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import {
  type BillingCurrency,
  type BillingInterval,
  CURRENCY_SYMBOL,
  EXTRA_SEAT_PRICE,
  type SellableTier,
  SELLABLE_TIER_ORDER,
  TIER_LIMITS,
  TIER_PRICING,
} from '@/lib/types';

const ACCENT = '#9b7bf7';

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
    `${l.maxApiKeys} API key${l.maxApiKeys === 1 ? '' : 's'} · ${l.rateLimitPerMin.toLocaleString()}/min`,
  ];
  out.push(l.customCodes ? 'Custom slugs' : 'Auto-generated slugs');
  out.push(l.analytics ? 'Geo / device analytics + CSV' : 'Click totals');
  if (l.expiringLinks) out.push('Expiring links');
  if (l.brandedDomains > 0) {
    out.push(`${l.brandedDomains} branded domain${l.brandedDomains === 1 ? '' : 's'}`);
  }
  if (l.webhooks) out.push('Webhook delivery');
  if (l.seats > 1) {
    out.push(`${l.seats} team seats · +${CURRENCY_SYMBOL.INR}${EXTRA_SEAT_PRICE.INR}/extra seat`);
  }
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
    <div className="min-h-screen flex flex-col text-[#f5f5f4] relative">
      <BackgroundAurora variant="default" />

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-16">
        <section className="text-center max-w-[720px] mx-auto flex flex-col items-center gap-5">
          <h1
            className="text-[2.2rem] md:text-[3.2rem] font-extrabold leading-[1.08] tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #c8c4d8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Simple pricing that <span style={{ color: ACCENT }}>scales with you.</span>
          </h1>
          <p className="text-base md:text-[1.1rem] text-white/65 max-w-[620px] leading-relaxed">
            Start free, no card required. Upgrade when you need more links,
            longer analytics, or branded domains.
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
            <Toggle
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'annual', label: 'Annual · 2 mo free' },
              ]}
              value={interval}
              onChange={(v) => setInterval(v as BillingInterval)}
            />
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
                className="p-6 rounded-[18px] relative flex flex-col"
                style={{
                  background: isPopular
                    ? 'linear-gradient(135deg, rgba(155,123,247,0.16) 0%, rgba(95,182,255,0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
                  border: isPopular
                    ? '1px solid rgba(155,123,247,0.45)'
                    : '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {isPopular && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)' }}
                  >
                    Most popular
                  </span>
                )}

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
                <div className="text-[0.72rem] text-white/40 mb-5 h-4">
                  {amount > 0 && interval === 'annual'
                    ? `Billed yearly · ${CURRENCY_SYMBOL[currency]}${Math.round(amount / 12).toLocaleString()}/mo`
                    : amount > 0
                      ? 'Billed monthly · autopay'
                      : 'Free forever'}
                </div>

                <CtaButton
                  tier={tier}
                  loaded={me.loaded}
                  loggedIn={me.loggedIn}
                  isCurrent={isCurrent}
                  submitting={submitting}
                  popular={isPopular}
                  onSelect={select}
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

        {/* Enterprise — non-priced contact card */}
        <section
          className="mt-8 p-6 md:p-7 rounded-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <h3 className="text-[1.05rem] font-bold text-white">Enterprise</h3>
            <p className="text-[0.88rem] text-white/60 mt-1">
              Custom limits, SLA + support, SSO, and invoicing. Built around your team.
            </p>
          </div>
          <a
            href="mailto:hello@elixpo.com?subject=ElixpoURL%20Enterprise"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] font-semibold text-sm text-white/90 no-underline whitespace-nowrap transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.16)' }}
          >
            Contact sales
          </a>
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
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="px-3.5 py-1.5 rounded-[9px] text-[0.82rem] font-semibold transition-all cursor-pointer border-none"
          style={
            value === o.value
              ? { background: 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)', color: '#fff' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.6)' }
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
}: {
  tier: SellableTier;
  loaded: boolean;
  loggedIn: boolean;
  isCurrent: boolean;
  submitting: SellableTier | null;
  popular: boolean;
  onSelect: (t: SellableTier) => void;
}) {
  const thisSubmitting = submitting === tier;
  // Disabled while: page not yet loaded (idempotency guard — no clicks
  // before we know state), any checkout in flight, or this is the user's
  // current plan / the free tier for a logged-in user.
  const isCurrentPlanCta = isCurrent || (tier === 'free' && loggedIn);
  const disabled = !loaded || submitting !== null || isCurrentPlanCta;

  let label: string;
  if (!loaded) label = 'Loading…';
  else if (thisSubmitting) label = 'Starting checkout…';
  else if (isCurrent) label = 'Current plan';
  else if (tier === 'free') label = loggedIn ? 'Included' : 'Start for free';
  else if (!loggedIn) label = `Sign in to get ${tier === 'pro' ? 'Pro' : 'Business'}`;
  else label = `Upgrade to ${tier === 'pro' ? 'Pro' : 'Business'}`;

  const filled = popular || (!isCurrentPlanCta && tier !== 'free');

  return (
    <button
      type="button"
      onClick={() => onSelect(tier)}
      disabled={disabled}
      aria-busy={thisSubmitting}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-all border-none"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: !loaded ? 0.5 : disabled && !isCurrentPlanCta ? 0.6 : 1,
        color: filled ? '#fff' : 'rgba(255,255,255,0.9)',
        background: filled
          ? 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)'
          : 'transparent',
        boxShadow: filled && !disabled ? '0 6px 18px rgba(155,123,247,0.32)' : 'none',
        border: filled ? 'none' : '1px solid rgba(255,255,255,0.16)',
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
