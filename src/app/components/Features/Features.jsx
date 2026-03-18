import styles from './Features.module.css';
import SectionHeader from '../shared/SectionHeader';

const features = [
  {
    icon: '🖼️',
    title: 'Text to Image Generation',
    description: 'Write your idea as a simple text prompt and get a beautiful image in seconds.',
    color: 'purple',
  },
  {
    icon: '🎨',
    title: '15+ Art Themes',
    description: 'Choose from a variety of themes — Cyberpunk, Ghibli, Synthwave, Baroque and more.',
    color: 'blue',
  },
  {
    icon: '🧠',
    title: '8 AI Models',
    description: 'Select from Flux, Turbo, Kontext, NanoBanana and other specialized models.',
    color: 'teal',
  },
  {
    icon: '✨',
    title: 'LLM Prompt Enhancement',
    description: 'Let AI refine your prompts for more accurate, detailed, and stunning results.',
    color: 'gold',
  },
  {
    icon: '🔒',
    title: 'Private Mode',
    description: 'Generate images without saving your data — your privacy and security guaranteed.',
    color: 'green',
  },
  {
    icon: '🧩',
    title: 'Ecosystem Extensions',
    description: 'Discord bot, Chrome extension, and API integrations for your projects.',
    color: 'pink',
  },
];

const colorMap = {
  purple: 'var(--color-primary)',
  blue: 'var(--color-secondary)',
  teal: '#06b6d4',
  gold: 'var(--color-gold)',
  green: '#10b981',
  pink: '#ec4899',
};

export default function Features() {
  return (
    <section className={styles.section}>
      <SectionHeader
        badge="Features"
        title="Open Source & Free AI Art Generator"
        subtitle="Powerful creative tools at your fingertips — no cost, no limits"
      />

      <div className={styles.grid}>
        {features.map((f) => (
          <div key={f.title} className={styles.card}>
            <div
              className={styles.iconWrap}
              style={{ background: `${colorMap[f.color]}20`, borderColor: `${colorMap[f.color]}30` }}
            >
              <span className={styles.icon}>{f.icon}</span>
            </div>
            <h3 className={styles.cardTitle}>{f.title}</h3>
            <p className={styles.cardDesc}>{f.description}</p>
            <div className={styles.accentBar} style={{ background: colorMap[f.color] }} />
          </div>
        ))}
      </div>
    </section>
  );
}
