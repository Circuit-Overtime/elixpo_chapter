'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
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

const PLAN_GUIDANCE: Record<SellableTier, string> = {
  free: 'Learn the workflow and keep a small personal link set.',
  pro: 'Publish regularly with branded slugs and useful analytics.',
  business: 'Run higher-volume campaigns with a full year of history.',
};

const COMPARISON_ROWS: { label: string; values: Record<SellableTier, string> }[] = [
  { label: 'Stored short links', values: { free: '25', pro: '1,000', business: '10,000' } },
  { label: 'New-link allowance', values: { free: '2 per UTC day', pro: 'Up to plan limit', business: 'Up to plan limit' } },
  { label: 'Analytics', values: { free: 'Click totals · 7 days', pro: 'Geo, device & CSV · 30 days', business: 'Geo, device & CSV · 1 year' } },
  { label: 'Custom slugs', values: { free: '—', pro: 'Included', business: 'Included' } },
  { label: 'API keys', values: { free: '1', pro: '5', business: '20' } },
  { label: 'Expiring links', values: { free: '—', pro: 'Included', business: 'Included' } },
  { label: 'QR customization', values: { free: '3 presets', pro: 'All presets + logo', business: 'All presets + logo' } },
];

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
        <section className="text-center max-w-[780px] mx-auto flex flex-col items-center gap-5">
          <span className="rounded-full border border-[#f0c8c6] bg-[#fff6f5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#c62828]">
            Clear limits · no hidden feature promises
          </span>
          <h1
            className="text-[2.2rem] md:text-[3.2rem] font-extrabold leading-[1.08] tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #111111 0%, #555555 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Pick the right plan <span style={{ color: ACCENT }}>at a glance.</span>
          </h1>
          <p className="text-base md:text-[1.1rem] text-[#555] max-w-[650px] leading-relaxed">
            Free is enough to try the full workflow. Choose Pro for regular publishing,
            or Business when volume and a year of analytics matter.
          </p>

          <div className="grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-3">
            {[
              ['Guest', '1 link · expires in 24 hours'],
              ['Free account', '2 new links/day · 25 stored'],
              ['Every paid plan', 'Cancel renewal anytime'],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
                <div className="text-xs font-bold text-[#111]">{label}</div>
                <div className="mt-1 text-xs text-[#666]">{detail}</div>
              </div>
            ))}
          </div>

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
            {['No card on Free', 'Hosted checkout', 'Edge redirects on every plan'].map((t) => (
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

                <h3 className="text-[1.15rem] font-bold text-[#111]">{p.name}</h3>
                <p className="text-[0.85rem] text-[#666] mt-1 min-h-[2.4em]">{p.tagline}</p>
                <p className="mb-4 mt-2 min-h-[3em] text-[0.78rem] leading-5 text-[#777]">{PLAN_GUIDANCE[tier]}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[2.1rem] font-extrabold text-[#111]">
                    {CURRENCY_SYMBOL[currency]}
                    {amount.toLocaleString()}
                  </span>
                  {amount > 0 && (
                    <span className="text-sm text-[#777]">
                      /{interval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                <div className="text-[0.72rem] mb-5 h-4 flex items-center gap-2">
                  <span className="text-[#777]">
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
                    <li key={f} className="text-[0.85rem] text-[#555] flex items-start gap-2">
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mt-16" aria-labelledby="compare-plans">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c62828]">Exact plan limits</p>
            <h2 id="compare-plans" className="mt-2 text-2xl font-extrabold tracking-tight text-[#111] md:text-3xl">
              Compare what changes when you upgrade
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#666]">
              Every item below is available in the product today and enforced by the API.
            </p>
          </div>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#e5e5e5]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-[#fafafa]">
                <tr>
                  <th className="px-5 py-4 font-semibold text-[#777]">Feature</th>
                  {SELLABLE_TIER_ORDER.map((tier) => (
                    <th key={tier} className="px-5 py-4 text-base font-bold text-[#111]">{TIER_PRICING[tier].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-[#ececec]">
                    <th className="px-5 py-4 font-semibold text-[#333]">{row.label}</th>
                    {SELLABLE_TIER_ORDER.map((tier) => (
                      <td key={tier} className="px-5 py-4 text-[#666]">{row.values[tier]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Enterprise — non-priced 16:9 card to balance the layout */}
        <section className="mt-16">
          <div
            className="relative mx-auto flex min-h-[320px] w-full max-w-3xl items-center justify-center overflow-hidden rounded-[22px] px-6 py-10 text-center"
            style={{
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

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
                <a
                  href="mailto:hello@elixpo.com?subject=ElixpoURL%20Enterprise"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[12px] font-semibold text-sm text-white no-underline transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                    boxShadow: '0 8px 24px rgba(229,57,53,0.35)',
                  }}
                >
                  Contact team
                </a>
                <EmailChip />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="pricing-faq">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c62828]">Before you choose</p>
            <h2 id="pricing-faq" className="mt-2 text-2xl font-extrabold tracking-tight text-[#111] md:text-3xl">Pricing questions, answered</h2>
          </div>
          <div className="mt-7 divide-y divide-[#e8e8e8] rounded-2xl border border-[#e5e5e5] px-5 md:px-7">
            <Faq question="Can I shorten a link without an account?">
              Yes. A guest can create one short link, valid for 24 hours. Create a Free account for persistent links and dashboard access.
            </Faq>
            <Faq question="What happens when I reach a limit?">
              Existing links continue to resolve. New creation or plan-gated actions are blocked until the daily allowance resets, capacity is freed, or the plan is upgraded.
            </Faq>
            <Faq question="How does annual billing work?">
              Annual prices cover 12 months and cost about the same as 10 monthly payments. The exact annual total and monthly equivalent are shown above before checkout.
            </Faq>
            <Faq question="Are custom domains included?">
              Not yet. Custom-domain and subdomain routing are intentionally excluded until domain verification, TLS, tenant routing, and takeover protection are complete.
            </Faq>
            <Faq question="Can I cancel a paid plan?">
              You can stop renewal at any time. Paid access continues through the current billing period unless the checkout terms state otherwise.
            </Faq>
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

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#111]">
        {question}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#ddd] text-lg font-normal text-[#777] transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="max-w-2xl pr-10 pt-3 text-sm leading-6 text-[#666]">{children}</p>
    </details>
  );
}

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
          ? '1px solid rgba(0,0,0,0.1)'
          : filled
            ? 'none'
            : '1px solid rgba(0,0,0,0.16)',
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

function EmailChip() {
  const [copied, setCopied] = useState(false);
  const email = 'hello@elixpo.com';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        window.location.href = `mailto:${email}`;
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopyEmail}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-sm transition-all"
      style={{
        border: '1px solid rgba(0, 0, 0, 0.14)',
        background: '#fff',
        color: '#555',
        fontFamily: 'var(--font-geist-mono), monospace',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#111';
        e.currentTarget.style.borderColor = 'rgba(229, 57, 53, 0.5)';
        e.currentTarget.style.background = 'rgba(229, 57, 53, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#555';
        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.14)';
        e.currentTarget.style.background = '#fff';
      }}
      title={copied ? 'Copied!' : 'Click to copy'}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
      <span>{email}</span>
      {copied ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-[#86efac] transition-all animate-pulse">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12" />
          </svg>
          <span>Copied!</span>
        </span>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}
