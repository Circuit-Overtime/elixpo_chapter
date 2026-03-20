'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For personal projects and trying things out.',
    accent: '#a1a1aa',
    features: [
      '25 short URLs',
      '1 API key',
      '7-day inactive link TTL',
      'Auto-generated codes',
      'Basic click counts',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For creators and growing projects that need more control.',
    accent: '#a3e635',
    features: [
      '500 short URLs',
      '5 API keys',
      '30-day analytics retention',
      'No auto-removal of links',
      'Custom short codes',
      'Full analytics dashboard',
      'Expiring links',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Business',
    price: '$29',
    period: '/month',
    description: 'For teams and businesses that need scale and deep insights.',
    accent: '#86efac',
    features: [
      '5,000 short URLs',
      '20 API keys',
      '90-day analytics retention',
      'No auto-removal of links',
      'Custom short codes',
      'Full analytics dashboard',
      'Expiring links',
      'Priority support',
    ],
    cta: 'Upgrade to Business',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with custom needs and unlimited scale.',
    accent: '#fbbf24',
    features: [
      'Unlimited short URLs',
      '100 API keys',
      '365-day analytics retention',
      'No auto-removal of links',
      'Custom short codes',
      'Full analytics dashboard',
      'Expiring links',
      'Dedicated support',
      'Custom SLA',
    ],
    cta: 'Contact Us',
    popular: false,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function PricingPage() {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-page overflow-hidden flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[10%] right-[20%] w-[500px] h-[500px] rounded-full opacity-[0.035]"
          style={{ background: 'radial-gradient(circle, #a3e635, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] rounded-full opacity-[0.025]"
          style={{ background: 'radial-gradient(circle, #fbbf24, transparent 70%)' }}
        />
      </div>

      <Navbar />

      {/* Header */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-6xl font-display font-bold leading-tight mb-5"
        >
          Simple, transparent{' '}
          <span className="text-gradient">pricing</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg text-text-secondary max-w-xl mx-auto"
        >
          Start free. Scale when you&apos;re ready. No hidden fees, no surprises.
        </motion.p>
      </section>

      {/* Pricing cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-16 flex-1">
        <div className="grid grid-cols-4 gap-5 items-stretch">
          {tiers.map((tier, i) => {
            const isHovered = hoveredTier === tier.name;
            const isPopular = tier.popular;

            return (
              <motion.div
                key={tier.name}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                onMouseEnter={() => setHoveredTier(tier.name)}
                onMouseLeave={() => setHoveredTier(null)}
                className="relative flex flex-col rounded-2xl p-[1px] transition-all duration-500"
                style={{
                  background: isPopular
                    ? 'linear-gradient(135deg, rgba(163,230,53,0.4), rgba(134,239,172,0.2), rgba(251,191,36,0.3))'
                    : isHovered
                      ? `linear-gradient(135deg, ${tier.accent}33, transparent)`
                      : 'rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="flex flex-col flex-1 rounded-2xl p-7 transition-all duration-500"
                  style={{
                    background: isPopular
                      ? 'linear-gradient(135deg, rgba(16,24,12,0.97), rgba(12,15,10,0.98))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                    backdropFilter: 'blur(20px)',
                    boxShadow: isPopular
                      ? '0 0 60px rgba(163,230,53,0.08), 0 8px 32px rgba(0,0,0,0.4)'
                      : isHovered
                        ? '0 20px 40px -10px rgba(0,0,0,0.4)'
                        : '0 8px 32px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="mb-4 self-start px-3 py-1 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider"
                      style={{
                        background: 'rgba(163, 230, 53, 0.12)',
                        border: '1px solid rgba(163, 230, 53, 0.25)',
                        color: '#a3e635',
                      }}
                    >
                      Most Popular
                    </motion.div>
                  )}

                  {/* Tier name */}
                  <h3
                    className="text-lg font-display font-bold mb-1 transition-colors duration-300"
                    style={{ color: isHovered || isPopular ? tier.accent : '#f5f5f4' }}
                  >
                    {tier.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      className="text-4xl font-display font-extrabold tracking-tight transition-colors duration-300"
                      style={{ color: tier.accent }}
                    >
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-text-disabled">{tier.period}</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-text-muted leading-relaxed mb-6">
                    {tier.description}
                  </p>

                  {/* Divider */}
                  <div
                    className="h-px mb-6 transition-all duration-500"
                    style={{
                      background: isHovered || isPopular
                        ? `linear-gradient(90deg, transparent, ${tier.accent}40, transparent)`
                        : 'rgba(255,255,255,0.06)',
                    }}
                  />

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-text-secondary">
                        <span
                          className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[0.6rem] font-bold"
                          style={{
                            background: `${tier.accent}18`,
                            color: tier.accent,
                            border: `1px solid ${tier.accent}30`,
                          }}
                        >
                          &#10003;
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/api/auth/login"
                    className="no-underline text-center py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                    style={{
                      background: isPopular
                        ? 'rgba(163, 230, 53, 0.15)'
                        : isHovered
                          ? `${tier.accent}15`
                          : 'rgba(255,255,255,0.06)',
                      color: isPopular || isHovered ? tier.accent : '#f5f5f4',
                      border: `1px solid ${isPopular ? 'rgba(163,230,53,0.3)' : isHovered ? `${tier.accent}30` : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: isPopular
                        ? '0 0 20px rgba(163,230,53,0.1)'
                        : 'none',
                    }}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FAQ / Bottom CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-8 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-text-muted text-sm mb-2">
            Need something custom?
          </p>
          <p className="text-text-secondary text-sm">
            Contact us at{' '}
            <span className="text-lime-main font-medium">support@elixpo.com</span>{' '}
            for enterprise plans, volume discounts, or custom integrations.
          </p>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
