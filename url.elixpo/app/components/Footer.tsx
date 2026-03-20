'use client';

import Image from 'next/image';
import Link from 'next/link';

const productLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'API Docs', href: '/docs' },
  { label: 'Status', href: 'https://status.elixpo.com' },
];

const companyLinks = [
  { label: 'About Elixpo', href: 'https://elixpo.com' },
  { label: 'Blog', href: 'https://blog.elixpo.com' },
  { label: 'Careers', href: 'https://elixpo.com/careers' },
  { label: 'Contact', href: 'mailto:support@elixpo.com' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

const socialLinks = [
  {
    label: 'GitHub',
    href: 'https://github.com/elixpo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    label: 'Discord',
    href: 'https://discord.gg/elixpo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    label: 'X / Twitter',
    href: 'https://x.com/elixpo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border-light">
      <div className="max-w-7xl mx-auto px-8 pt-14 pb-8">
        {/* Main grid */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          {/* Brand col */}
          <div className="col-span-4">
            <Link href="/" className="flex items-center gap-2.5 no-underline mb-4">
              <Image src="/logo.png" alt="ElixpoURL" width={28} height={28} className="rounded-lg" />
              <span className="text-lg font-display font-bold text-text-primary">
                <span className="text-lime-main">Elixpo</span>URL
              </span>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed max-w-xs mb-6">
              Fast, reliable URL shortening for the Elixpo ecosystem.
              Built on Cloudflare&apos;s edge network for sub-10ms redirects worldwide.
            </p>
            {/* Socials */}
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-disabled transition-all duration-200 hover:text-text-primary no-underline"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product col */}
          <div className="col-span-2 col-start-6">
            <h4 className="text-[0.65rem] text-text-disabled uppercase tracking-widest font-semibold mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors no-underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company col */}
          <div className="col-span-2">
            <h4 className="text-[0.65rem] text-text-disabled uppercase tracking-widest font-semibold mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.href.startsWith('http') ? '_blank' : undefined}
                    rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors no-underline"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal col */}
          <div className="col-span-2">
            <h4 className="text-[0.65rem] text-text-disabled uppercase tracking-widest font-semibold mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors no-underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs text-text-disabled">
            &copy; {new Date().getFullYear()} Elixpo. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-text-disabled">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#4ade80' }}
            />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
