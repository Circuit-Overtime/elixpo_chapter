import styles from './CallToAction.module.css';
import Button from '../shared/Button';

export default function CallToAction() {
  return (
    <section className={styles.section}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <h2 className={styles.title}>Ready to Create?</h2>
        <p className={styles.subtitle}>
          Join thousands of creators using Elixpo Art to bring their ideas to life — completely free.
        </p>
        <div className={styles.buttons}>
          <Button variant="primary" href="/generate">Start Creating Free</Button>
          <Button variant="secondary" href="/learn">View Documentation</Button>
        </div>
      </div>
    </section>
  );
}
