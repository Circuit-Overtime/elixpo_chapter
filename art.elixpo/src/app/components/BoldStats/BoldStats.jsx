'use client';

import styles from './BoldStats.module.css';

const stats = [
  { number: '6', label: 'INDUSTRIES', color: '#f4c801' },
  { number: '235', label: 'COUNTRIES AND TERRITORIES', color: '#10b981' },
  { number: '80+', label: 'GEN AI MODELS INTEGRATED', color: '#ec4899' },
  { number: '4K', label: 'MEDIA ASSETS GENERATED', color: '#5691f3' },
];

export default function BoldStats() {
  return (
    <section className={styles.section}>
      {/* Brush stroke decoration */}
      <div className={styles.brushStroke} aria-hidden="true" />
      <div className={styles.brushStroke2} aria-hidden="true" />

      <div className={styles.marqueeWrap}>
        <div className={styles.marquee}>
          {[...stats, ...stats].map((s, i) => (
            <div key={i} className={styles.statBlock}>
              <span className={styles.number} style={{ color: s.color }}>
                {s.number}
              </span>
              <span className={styles.label} style={{ color: s.color }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
