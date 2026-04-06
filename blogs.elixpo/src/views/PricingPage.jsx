'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import Link from 'next/link';
import '../styles/pricing/pricing.css';

const MONTHLY_PRICE = 5;
const YEARLY_PRICE = 50;

const FREE_FEATURES = [
  { text: '50 MB storage', icon: 'cloud-outline' },
  { text: '2 MB images per blog', icon: 'image-outline' },
  { text: '15 AI requests / day', icon: 'sparkles-outline' },
  { text: 'Up to 3 co-authors per blog', icon: 'people-outline' },
  { text: '1 organization', icon: 'business-outline' },
  { text: 'Unlimited blogs', icon: 'document-text-outline' },
  { text: 'Custom short links', icon: 'link-outline' },
];

const MEMBER_FEATURES = [
  { text: '2 GB storage', icon: 'cloud-outline' },
  { text: '10 MB images per blog', icon: 'image-outline' },
  { text: '50 AI requests / day', icon: 'sparkles-outline' },
  { text: 'Up to 5 co-authors per blog', icon: 'people-outline' },
  { text: '5 organizations', icon: 'business-outline' },
  { text: 'Unlimited blogs', icon: 'document-text-outline' },
  { text: 'Custom short links', icon: 'link-outline' },
  { text: 'Read member-only content', icon: 'lock-open-outline' },
  { text: 'Publish member-only posts', icon: 'shield-checkmark-outline' },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);
  const currentTier = user?.tier || 'free';

  const memberPrice = yearly ? YEARLY_PRICE : MONTHLY_PRICE;
  const memberPeriod = yearly ? '/year' : '/month';
  const monthlyCostIfYearly = (YEARLY_PRICE / 12).toFixed(2);

  return (
    <AppShell>
      <div className="pricing-page">
        {/* Header */}
        <div className="pricing-header">
          <h1 className="pricing-title">Simple, transparent pricing</h1>
          <p className="pricing-subtitle">
            Start for free. Upgrade when you need more power.
          </p>

          {/* Billing toggle */}
          <div className="billing-toggle">
            <span className={`billing-label ${!yearly ? 'active' : ''}`}>Monthly</span>
            <button
              className={`toggle-track ${yearly ? 'on' : ''}`}
              onClick={() => setYearly(!yearly)}
              aria-label="Toggle billing period"
            >
              <span className="toggle-thumb" />
            </button>
            <span className={`billing-label ${yearly ? 'active' : ''}`}>
              Yearly
              <span className="save-badge">Save $10</span>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="pricing-cards">
          {/* Free tier */}
          <div className="pricing-card">
            <div className="card-header">
              <div className="tier-icon free-icon">
                <ion-icon name="leaf-outline" />
              </div>
              <h2 className="tier-name">Free</h2>
              <p className="tier-tagline">Everything you need to get started</p>
            </div>

            <div className="price-block">
              <span className="price-amount">$0</span>
              <span className="price-period">forever</span>
            </div>

            <div className="card-cta">
              {currentTier === 'free' ? (
                <div className="current-plan-badge">
                  <ion-icon name="checkmark-circle" />
                  Current plan
                </div>
              ) : (
                <Link href="/settings?tab=subscription" className="cta-button cta-secondary">
                  Downgrade
                </Link>
              )}
            </div>

            <div className="features-divider" />

            <ul className="features-list">
              {FREE_FEATURES.map((f) => (
                <li key={f.text} className="feature-item">
                  <ion-icon name={f.icon} />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Member tier */}
          <div className="pricing-card member-card">
            <div className="member-glow" />
            <div className="popular-tag">Most Popular</div>

            <div className="card-header">
              <div className="tier-icon member-icon">
                <ion-icon name="diamond-outline" />
              </div>
              <h2 className="tier-name">Member</h2>
              <p className="tier-tagline">For serious writers and teams</p>
            </div>

            <div className="price-block">
              <span className="price-amount">${memberPrice}</span>
              <span className="price-period">{memberPeriod}</span>
            </div>
            {yearly && (
              <p className="yearly-breakdown">
                That's ${monthlyCostIfYearly}/mo — 2 months free
              </p>
            )}

            <div className="card-cta">
              {currentTier === 'member' ? (
                <div className="current-plan-badge member-badge">
                  <ion-icon name="checkmark-circle" />
                  Current plan
                </div>
              ) : (
                <button className="cta-button cta-primary">
                  Upgrade to Member
                </button>
              )}
            </div>

            <div className="features-divider" />

            <ul className="features-list">
              {MEMBER_FEATURES.map((f) => (
                <li key={f.text} className="feature-item">
                  <ion-icon name={f.icon} />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ / footer note */}
        <div className="pricing-footer">
          <p className="pricing-footer-text">
            All plans include unlimited blogs, the full editor experience, and access to the community feed.
            <br />
            Questions? <Link href="/about" className="pricing-link">Get in touch</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
