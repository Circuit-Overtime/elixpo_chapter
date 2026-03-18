import styles from './InfoSections.module.css';
import ScrollReveal from '../shared/ScrollReveal';

const sections = [
  {
    tag: 'Image Generation',
    title: 'From text to masterpiece in seconds',
    description: 'Type a prompt. Pick a style. Get stunning AI-generated art instantly — powered by Flux, Turbo, Kontext and more. No sign-up required.',
    image: '/images/styles/cyberpunk-art.jpg',
    align: 'left',
  },
  {
    tag: 'Creative Styles',
    title: '15+ artistic themes at your fingertips',
    description: 'Cyberpunk, Ghibli, Baroque, Synthwave, Impressionism — choose from a curated library of art styles or let AI surprise you.',
    image: '/images/styles/baroque-art.jpg',
    align: 'right',
  },
  {
    tag: 'Prompt Enhancement',
    title: 'AI-powered prompt engineering',
    description: 'Our LLM refines your rough ideas into detailed, optimized prompts — getting better results without the guesswork.',
    image: '/images/styles/digital-painting.jpg',
    align: 'left',
  },
  {
    tag: 'Privacy First',
    title: 'Your creations, your rules',
    description: 'Private mode generates without storing data. Guest access gives you 10 free images per day. Sign in for 50. No strings attached.',
    image: '/images/styles/surrealism-art.jpg',
    align: 'right',
  },
];

export default function InfoSections() {
  return (
    <div className={styles.wrapper}>
      {sections.map((s, i) => (
        <section key={i} className={`${styles.block} ${s.align === 'right' ? styles.reverse : ''}`}>
          {/* Brush accent */}
          <div className={styles.brushAccent} aria-hidden="true" />

          <ScrollReveal direction={s.align === 'left' ? 'left' : 'right'} delay={0} className={styles.textCol}>
            <span className={styles.tag}>{s.tag}</span>
            <h2 className={styles.title}>{s.title}</h2>
            <p className={styles.desc}>{s.description}</p>
          </ScrollReveal>

          <ScrollReveal direction={s.align === 'left' ? 'right' : 'left'} delay={0.15} className={styles.imageCol}>
            <div className={styles.imageFrame}>
              <img src={s.image} alt={s.tag} className={styles.image} />
              <div className={styles.imageGlow} />
            </div>
          </ScrollReveal>
        </section>
      ))}
    </div>
  );
}
