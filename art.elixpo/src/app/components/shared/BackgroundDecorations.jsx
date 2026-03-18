import styles from './BackgroundDecorations.module.css';

export default function BackgroundDecorations() {
  return (
    <div className={styles.decorations} aria-hidden="true">
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />
      <div className={styles.mesh} />
    </div>
  );
}
