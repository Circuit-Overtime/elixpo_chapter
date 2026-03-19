'use client';

import { motion } from 'framer-motion';
import styles from './Features.module.css';

const features = [
  {
    icon: '🖼️',
    title: 'Text to Image',
    description: 'Type a prompt, get stunning art. Powered by multiple AI models.',
    color: '#8d49fd',
  },
  {
    icon: '🎬',
    title: 'Text to Video',
    description: 'Generate short AI videos from text descriptions.',
    color: '#ec4899',
  },
  {
    icon: '🎨',
    title: '15+ Art Styles',
    description: 'Cyberpunk, Ghibli, Synthwave, Baroque, Impressionism and more.',
    color: '#06d6a0',
  },
  {
    icon: '🧠',
    title: 'Smart Prompts',
    description: 'AI refines your ideas into detailed, optimized prompts.',
    color: '#22d3ee',
  },
  {
    icon: '⚡',
    title: '8 AI Models',
    description: 'Flux, Turbo, Kontext, NanoBanana — pick the right engine.',
    color: '#5691f3',
  },
  {
    icon: '🔒',
    title: 'Private Mode',
    description: 'Generate without storing data. Your creations, your rules.',
    color: '#a968ff',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, rotateX: 10 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Features() {
  return (
    <section className={styles.section}>
      {/* Brush stroke divider top */}
      <div className={styles.brushDivider} aria-hidden="true">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className={styles.brushSvg}>
          <path d="M0,30 Q150,5 300,28 T600,20 T900,32 T1200,25 L1200,60 L0,60 Z" fill="var(--color-bg-primary)" />
        </svg>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {/* Section header */}
        <motion.div className={styles.header} variants={cardVariants}>
          <span className={styles.badge}>Features</span>
          <h2 className={styles.title}>Everything you need to create</h2>
          <p className={styles.subtitle}>Free, open source, and built for artists</p>
        </motion.div>

        <motion.div className={styles.grid} variants={containerVariants}>
          {features.map((f) => (
            <motion.div
              key={f.title}
              className={styles.card}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
            >
              {/* Brush stroke background accent */}
              <div
                className={styles.brushAccent}
                style={{
                  background: `linear-gradient(135deg, ${f.color}12 0%, transparent 60%)`,
                }}
                aria-hidden="true"
              />

              {/* Decorative paint splatter */}
              <div
                className={styles.splatter}
                style={{ background: f.color }}
                aria-hidden="true"
              />

              <div
                className={styles.iconWrap}
                style={{
                  background: `${f.color}15`,
                  borderColor: `${f.color}30`,
                  boxShadow: `0 0 20px ${f.color}15`,
                }}
              >
                <span className={styles.icon}>{f.icon}</span>
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.description}</p>

              {/* Animated accent bar */}
              <motion.div
                className={styles.accentBar}
                style={{ background: f.color }}
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
