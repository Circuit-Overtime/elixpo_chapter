import styles from './Features.module.css';
import SectionHeader from '../shared/SectionHeader';
import ScrollReveal from '../shared/ScrollReveal';

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
    color: '#10b981',
  },
  {
    icon: '🧠',
    title: 'Smart Prompts',
    description: 'AI refines your ideas into detailed, optimized prompts.',
    color: '#f4c801',
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
    color: '#f97316',
  },
];

export default function Features() {
  return (
    <section className={styles.section}>
      <ScrollReveal>
        <SectionHeader
          badge="Features"
          title="Everything you need to create"
          subtitle="Free, open source, and built for artists"
        />
      </ScrollReveal>

      <div className={styles.grid}>
        {features.map((f, i) => (
          <ScrollReveal key={f.title} delay={i * 0.08}>
            <div className={styles.card}>
              <div
                className={styles.iconWrap}
                style={{ background: `${f.color}15`, borderColor: `${f.color}30` }}
              >
                <span className={styles.icon}>{f.icon}</span>
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.description}</p>
              <div className={styles.accentBar} style={{ background: f.color }} />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
