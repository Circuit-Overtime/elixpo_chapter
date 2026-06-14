'use client';

import AppShell from '../components/AppShell';
import Link from 'next/link';
import '../styles/pricing/pricing.css';

export default function PricingPage() {
  return (
    <AppShell>
      <div className="pricing-page">
        <div className="pricing-coming-soon">
          <div className="pricing-coming-soon-icon">
            <ion-icon name="sparkles-outline" />
          </div>
          <h1 className="pricing-title">Pricing is coming soon</h1>
          <p className="pricing-subtitle">
            We're still figuring out the right plans. For now, everything is free while we build.
          </p>
          <div className="pricing-coming-soon-cta">
            <Link href="/" className="cta-button cta-primary">
              Back to feed
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
