import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Giant perspective text background */}
      <div className={styles.perspectiveContainer} aria-hidden="true">
        <div className={styles.perspectiveText}>
          <span className={`${styles.pLine} ${styles.c1}`}>YOUR</span>
          <span className={`${styles.pLine} ${styles.c2}`}>IDEAS</span>
          <span className={`${styles.pLine} ${styles.c3}`}>YOUR</span>
          <span className={`${styles.pLine} ${styles.c4}`}>TOOLS</span>
          <span className={`${styles.pLine} ${styles.c5}`}>YOURS</span>
          <span className={`${styles.pLine} ${styles.c6}`}>TO CREATE</span>
        </div>
      </div>

      {/* Brush strokes */}
      <div className={styles.brushTop} aria-hidden="true" />
      <div className={styles.brushBottom} aria-hidden="true" />

      {/* Center content overlay */}
      <div className={styles.content}>
        <div className={styles.badge}>
          <span className={styles.dot} />
          Introducing Elixpo Art
        </div>

        <h1 className={styles.headline}>
          THE CREATOR-FIRST<br />
          <span className={styles.gradientText}>GENERATIVE AI</span> PLATFORM
        </h1>

        <p className={styles.subtitle}>
          Transform text into stunning images and video. 15+ styles. 8+ AI models. Completely free.
        </p>

        <div className={styles.ctas}>
          <a href="/generate" className={styles.heroBtn}>Start now</a>
        </div>
      </div>
    </section>
  );
}
