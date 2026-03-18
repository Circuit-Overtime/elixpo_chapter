import styles from './ShowcaseStrip.module.css';

export default function ShowcaseStrip() {
  return (
    <section className={styles.showcase}>
      <div className={styles.blobPurple} aria-hidden="true" />
      <div className={styles.blobGold} aria-hidden="true" />
      <div className={styles.imageWrap}>
        <img
          src="https://github.com/user-attachments/assets/20264cef-2833-4b42-8615-8e4280dd3a5e"
          alt="Elixpo Art interface preview"
          className={styles.image}
        />
      </div>
    </section>
  );
}
