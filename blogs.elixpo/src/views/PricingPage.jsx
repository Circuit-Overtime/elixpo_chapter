'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import { PLANS } from '../../lib/pricing';

function fmtPrice(symbol, amount) {
  if (!amount) return 'Free';
  const n = Number.isInteger(amount) ? amount : amount.toFixed(1);
  return `${symbol}${n}`;
}

export default function PricingPage() {
  const { user } = useAuth();
  const [pricing, setPricing] = useState(null); // { currency, symbol, prices, country, band }

  useEffect(() => {
    fetch('/api/pricing')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPricing(d); })
      .catch(() => {});
  }, []);

  const symbol = pricing?.symbol || '$';
  const prices = pricing?.prices || { free: 0, member: 6, team: 5 };
  const currentTier = user?.tier || (user ? 'free' : null);

  const startCheckout = (planId) => {
    if (planId === 'free') { window.location.href = user ? '/' : '/sign-in'; return; }
    if (!user) { window.location.href = '/sign-in'; return; }
    // Server route signs the handoff token (region price + buyer) and redirects
    // to Elixpo Pay's hosted checkout.
    window.location.href = `/api/checkout?plan=${encodeURIComponent(planId)}`;
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="text-center mb-3">
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Plans that grow with you</h1>
          <p className="text-[15px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Publish for free. Upgrade to unlock sub-pages, more AI, and member-only earnings.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 mt-10">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const amount = prices[plan.id] ?? 0;
            const highlighted = plan.highlighted;
            return (
              <div
                key={plan.id}
                className="rounded-2xl p-6 flex flex-col"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: highlighted ? '1.5px solid #9b7bf7' : '1px solid var(--border-default)',
                  boxShadow: highlighted ? '0 12px 40px rgba(155,123,247,0.12)' : 'none',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                  {highlighted && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: '#9b7bf71f', color: '#9b7bf7' }}>Popular</span>
                  )}
                </div>
                <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>{plan.tagline}</p>

                <div className="mb-5">
                  <span className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(symbol, amount)}</span>
                  {amount ? (
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}> /{plan.perSeat ? 'seat · mo' : 'mo'}</span>
                  ) : null}
                </div>

                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-body)' }}>
                      <ion-icon name="checkmark-circle" style={{ fontSize: '16px', color: '#9b7bf7', flexShrink: 0, marginTop: '1px' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => startCheckout(plan.id)}
                  disabled={isCurrent}
                  className="w-full py-2.5 rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-default"
                  style={
                    isCurrent
                      ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                      : highlighted
                        ? { backgroundColor: '#9b7bf7', color: '#fff' }
                        : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }
                  }
                >
                  {isCurrent ? 'Current plan' : plan.id === 'free' ? 'Get started' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[12px] mt-8" style={{ color: 'var(--text-faint)' }}>
          {pricing?.country ? `Prices adjusted for your region (${pricing.country}). ` : ''}
          Payments are processed securely by Elixpo Pay. Cancel anytime.
        </p>
      </div>
    </AppShell>
  );
}
