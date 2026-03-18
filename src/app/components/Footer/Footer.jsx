import styles from './Footer.module.css';

const linkGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Create', href: '/generate' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Blueprints', href: '/blueprints' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/learn' },
      { label: 'API', href: '/api' },
      { label: 'GitHub', href: 'https://github.com/Circuit-Overtime/elixpo-art' },
      { label: 'Discord', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandRow}>
            <img
              src="https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/bigstar.png?alt=media&token=53c5945b-2b37-4c3e-972c-7bd1b0b9e4f1"
              alt="Elixpo"
              className={styles.logo}
            />
            <span className={styles.brandName}>Elixpo Art</span>
          </div>
          <p className={styles.tagline}>The creator-first generative AI platform.</p>
        </div>

        {/* Link groups */}
        {linkGroups.map((group) => (
          <div key={group.title} className={styles.group}>
            <h4 className={styles.groupTitle}>{group.title}</h4>
            <ul className={styles.list}>
              {group.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={styles.link}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <span>&copy; {new Date().getFullYear()} Elixpo. All rights reserved.</span>
      </div>
    </footer>
  );
}
