'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import GradientBlobs from '../components/shared/GradientBlobs';
import { motion as motionPresets } from '../lib/theme';
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

const stagger = motionPresets.stagger(0.1);

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className={styles.page}>
      <GradientBlobs preset="pricing" />
      <Navbar />
      <motion.main
        className={styles.main}
        initial={motionPresets.page.initial}
        animate={motionPresets.page.animate}
      >
        {/* Header */}
        <motion.div
          className={styles.header}
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.span className={styles.badge} variants={motionPresets.fadeUp}>Pricing</motion.span>
          <motion.h1 className={styles.title} variants={motionPresets.fadeUp}>
            Create more with the{' '}
            <span className={styles.titleAccent}>right plan</span>
          </motion.h1>
          <motion.p className={styles.subtitle} variants={motionPresets.fadeUp}>
            Start free with 40 daily generations. Upgrade when you need more credits, higher resolution, or video.
          </motion.p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          className={styles.toggleWrap}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <span className={`${styles.toggleLabel} ${!yearly ? styles.toggleLabelActive : ''}`}>Monthly</span>
          <button
            className={`${styles.toggle} ${yearly ? styles.active : ''}`}
            onClick={() => setYearly(!yearly)}
            aria-label="Toggle yearly billing"
          >
            <span className={styles.toggleDot} />
          </button>
          <span className={`${styles.toggleLabel} ${yearly ? styles.toggleLabelActive : ''}`}>Yearly</span>
          {yearly && <motion.span className={styles.saveBadge} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>Save ~17%</motion.span>}
        </motion.div>

        {/* Plan cards */}
        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={motionPresets.stagger(0.12)}
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              className={`${styles.card} ${plan.featured ? styles.cardFeatured : ''}`}
              variants={motionPresets.brushReveal}
              whileHover={motionPresets.hoverLift}
            >
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
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.section
          className={styles.faq}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={motionPresets.stagger(0.08)}
        >
          <motion.h2 className={styles.faqTitle} variants={motionPresets.fadeUp}>
            Frequently Asked Questions
          </motion.h2>
          <div className={styles.faqGrid}>
            {FAQ.map((item) => (
              <motion.div key={item.q} className={styles.faqItem} variants={motionPresets.fadeUp}>
                <h3 className={styles.faqQuestion}>{item.q}</h3>
                <p className={styles.faqAnswer}>{item.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </motion.main>
      <Footer />
    </div>
  );
}
