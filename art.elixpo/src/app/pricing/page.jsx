'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import styles from './Pricing.module.css';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    desc: 'Perfect for exploring AI art generation and casual creators.',
    monthly: 0,
    yearly: 0,
    credits: 40,
    featured: false,
    cta: 'Get Started',
    ctaStyle: 'ctaDefault',
    features: [
      '40 images per day',
      'Standard models',
      '1024 x 1024 max resolution',
      'Community support',
      'Public gallery access',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    desc: 'For serious creators who need more power and priority access.',
    monthly: 12,
    yearly: 120,
    credits: 200,
    featured: true,
    cta: 'Upgrade to Pro',
    ctaStyle: 'ctaPrimary',
    features: [
      '200 images per day',
      'All models including video',
      '2048 x 2048 max resolution',
      '30s video generation',
      'Priority queue',
      'Early access to new models',
      'Private creations',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    desc: 'Full platform access with API, custom models, and dedicated support.',
    monthly: 49,
    yearly: 490,
    credits: 1000,
    featured: false,
    cta: 'Contact Sales',
    ctaStyle: 'ctaEnterprise',
    features: [
      '1,000 images per day',
      'All models including video',
      '4096 x 4096 max resolution',
      '2 min video generation',
      'Priority queue',
      'API access',
      'Dedicated support',
      'Custom model fine-tuning',
    ],
  },
];

const FAQ = [
  {
    q: 'How do daily credits work?',
    a: 'Credits reset every 24 hours at midnight UTC. Each image generation costs 1 credit. Video generation costs vary by duration — typically 5 credits for a short clip.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Upgrades take effect immediately and you get the difference prorated. Downgrades apply at the end of your current billing cycle.',
  },
  {
    q: 'What happens if I run out of credits?',
    a: 'You can wait for the next daily reset, or upgrade your plan for more credits. We never charge overage fees — your generations simply pause until credits refresh.',
  },
  {
    q: 'Is there a free trial for Pro?',
    a: 'New accounts start on the Free plan with 40 daily credits. You can try the platform risk-free and upgrade when you need more power.',
  },
];

function CheckIcon() {
  return (
    <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CreditsIcon() {
  return (
    <svg className={styles.creditsIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z" />
    </svg>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.badge}>Pricing</span>
          <h1 className={styles.title}>
            Create more with the <span className={styles.titleAccent}>right plan</span>
          </h1>
          <p className={styles.subtitle}>
            Start free with 40 daily generations. Upgrade when you need more credits, higher resolution, or video.
          </p>
        </div>

        {/* Billing toggle */}
        <div className={styles.toggleWrap}>
          <span className={`${styles.toggleLabel} ${!yearly ? styles.toggleLabelActive : ''}`}>Monthly</span>
          <button
            className={`${styles.toggle} ${yearly ? styles.active : ''}`}
            onClick={() => setYearly(!yearly)}
            aria-label="Toggle yearly billing"
          >
            <span className={styles.toggleDot} />
          </button>
          <span className={`${styles.toggleLabel} ${yearly ? styles.toggleLabelActive : ''}`}>Yearly</span>
          {yearly && <span className={styles.saveBadge}>Save ~17%</span>}
        </div>

        {/* Plan cards */}
        <div className={styles.grid}>
          {PLANS.map((plan) => (
            <div key={plan.id} className={`${styles.card} ${plan.featured ? styles.cardFeatured : ''}`}>
              {plan.featured && <div className={styles.popularTag}>Most Popular</div>}

              <h2 className={styles.planName}>{plan.name}</h2>
              <p className={styles.planDesc}>{plan.desc}</p>

              {plan.monthly === 0 ? (
                <div className={styles.priceFree}>Free</div>
              ) : (
                <div className={styles.priceWrap}>
                  <span className={styles.currency}>$</span>
                  <span className={styles.price}>
                    {yearly ? Math.round(plan.yearly / 12) : plan.monthly}
                  </span>
                  <span className={styles.period}>/ mo</span>
                </div>
              )}

              <div className={styles.credits}>
                <CreditsIcon />
                <span className={styles.creditsText}>
                  {plan.credits.toLocaleString()} <span className={styles.creditsLabel}>credits / day</span>
                </span>
              </div>

              <a href={plan.id === 'free' ? '/generate' : '#'} className={`${styles.cta} ${styles[plan.ctaStyle]}`}>
                {plan.cta}
              </a>

              <div className={styles.divider} />
              <p className={styles.featuresTitle}>What&apos;s included</p>
              <ul className={styles.features}>
                {plan.features.map((f) => (
                  <li key={f} className={styles.feature}>
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            {FAQ.map((item) => (
              <div key={item.q} className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>{item.q}</h3>
                <p className={styles.faqAnswer}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
