import styles from './CallToAction.module.css';
import Button from '../shared/Button';
import ScrollReveal from '../shared/ScrollReveal';

export default function CallToAction() {
  return (
    <section className={styles.section}>
      <div className={styles.brushTop} aria-hidden="true" />
      <div className={styles.inner}>
        <ScrollReveal>
          <h2 className={styles.title}>
            Ready to <span className={styles.accent}>Create?</span>
          </h2>
          <p className={styles.subtitle}>
            Join thousands of creators using Elixpo Art to bring their ideas to life.
            No sign-up needed — start generating for free, right now.
          </p>
          <div className={styles.buttons}>
            <Button variant="primary" href="/generate">Start Creating Free</Button>
            <Button variant="secondary" href="/learn">View Documentation</Button>
          </div>
        </ScrollReveal>
      </div>
      <div className={styles.brushBottom} aria-hidden="true" />
    </section>
  );
}
