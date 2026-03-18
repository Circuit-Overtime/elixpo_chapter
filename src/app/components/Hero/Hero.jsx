import styles from './Hero.module.css';
import Button from '../shared/Button';

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background perspective text */}
      <div className={styles.perspectiveContainer} aria-hidden="true">
        <div className={styles.perspectiveText}>
          <span className={styles.pLine}>YOUR</span>
          <span className={styles.pLine}>IDEAS</span>
          <span className={styles.pLine}>YOUR</span>
          <span className={styles.pLine}>TOOLS</span>
          <span className={styles.pLine}>YOURS</span>
          <span className={styles.pLine}>TO CREATE</span>
        </div>
      </div>

      {/* Center content overlay */}
      <div className={styles.content}>
        <div className={styles.badge}>
          <span className={styles.dot} />
          Introducing Elixpo Art v5.0
        </div>

        <h1 className={styles.headline}>
          THE CREATOR-FIRST<br />
          <span className={styles.gradientText}>GENERATIVE AI</span> PLATFORM
        </h1>

        <p className={styles.subtitle}>
          Transform your ideas into stunning art with 15+ themes, 8+ AI models, and a growing creative ecosystem.
        </p>

        <div className={styles.ctas}>
          <Button variant="primary" href="/generate">Start now</Button>
          <Button variant="secondary" href="/api">Developer API</Button>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>25K+</span>
            <span className={styles.statLabel}>Images Created</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.stat}>
            <span className={styles.statNumber}>15+</span>
            <span className={styles.statLabel}>Art Themes</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.stat}>
            <span className={styles.statNumber}>4</span>
            <span className={styles.statLabel}>AI Models</span>
          </div>
        </div>
      </div>
    </section>
  );
}
