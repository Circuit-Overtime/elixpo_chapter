import type { Metadata } from 'next';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of ElixpoURL — the open URL shortener built on Cloudflare\'s edge.',
  alternates: { canonical: '/terms' },
};

const LAST_UPDATED = 'June 2026';
const SUPPORT_EMAIL = 'hello@elixpo.com';
const REPO_URL = 'https://github.com/elixpo/elixpourl';

export default function TermsPage() {
  return (
    <div className="theme-light min-h-screen flex flex-col text-[#111] bg-white">

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 pt-12 md:pt-16 pb-16">
        <header className="mb-10">
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#c62828] mb-2">
            Last updated · {LAST_UPDATED}
          </div>
          <h1
            className="text-[2.2rem] md:text-[3rem] font-extrabold leading-[1.08] tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #111111 0%, #555555 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Terms of Service
          </h1>
          <p className="text-white/65 mt-3 text-base md:text-[1.05rem] leading-relaxed">
            The terms that govern your use of ElixpoURL.
          </p>
        </header>

        <article className="space-y-7 text-white/75 leading-relaxed">
          <Section title="1. Acceptance">
            <p>
              By accessing or using ElixpoURL (the &ldquo;Service&rdquo;) —
              including the dashboard, the public redirect path, and the
              API — you agree to these Terms. If you do not agree, please
              do not use the Service.
            </p>
          </Section>

          <Section title="2. Open source &amp; licensing">
            <p>
              ElixpoURL is open source. Source code is provided under the{' '}
              <strong>MIT License (with Oreo-trademark exception)</strong>{' '}
              and visual assets under <strong>CC-BY-4.0</strong>, as set out
              in our{' '}
              <a
                href={`${REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c62828] underline decoration-white/30 hover:decoration-white/70"
              >
                LICENSE
              </a>
              . The Oreo mascot, the chest E-badge, and the
              &ldquo;Elixpo&rdquo; and &ldquo;ElixpoURL&rdquo; names and
              brand palette are reserved and not granted for use outside
              Elixpo-aligned projects.
            </p>
          </Section>

          <Section title="3. Acceptable use">
            <p>
              You agree not to use ElixpoURL to shorten URLs that:
            </p>
            <ul>
              <li>
                Distribute malware, phishing payloads, or any content
                flagged by Google Safe Browsing.
              </li>
              <li>
                Host or link to content depicting child sexual abuse, or
                that violates applicable law in your jurisdiction or ours.
              </li>
              <li>
                Redirect to scam, spam, fraud, or impersonation pages.
              </li>
              <li>
                Disrupt the Service through abuse — including but not
                limited to scraping the redirect endpoint, attempting to
                bypass rate limits, or pointing short links at internal
                networks.
              </li>
            </ul>
            <p>
              We may remove links, suspend accounts, and rate-limit
              traffic to keep the Service safe and available for everyone.
              Safe Browsing checks run on every link creation; flagged URLs
              are rejected at create time.
            </p>
          </Section>

          <Section title="4. Account &amp; sign-in">
            <p>
              ElixpoURL uses Elixpo Accounts (single sign-on) for
              authentication. The terms of your Elixpo Account apply
              alongside these. You are responsible for keeping your account
              credentials secure and for any activity performed through
              your account or API keys.
            </p>
          </Section>

          <Section title="5. Your content">
            <p>
              You retain ownership of the destination URLs you shorten and
              any title or metadata you attach. By using the Service you
              grant us a limited license to store, redirect to, and serve
              your short links for the purpose of operating the Service.
            </p>
            <p>
              You are responsible for ensuring you have the right to link
              to whatever destination you choose, and for how that link is
              shared.
            </p>
          </Section>

          <Section title="6. Tiers &amp; limits">
            <p>
              Free and paid tiers carry different per-account quotas —
              monthly link limits, retention windows, analytics depth, and
              feature access. Current tier definitions are described on
              the <a
                href="/pricing"
                className="text-[#c62828] underline decoration-white/30 hover:decoration-white/70"
              >
                Pricing page
              </a>{' '}
              and enforced server-side. Quotas may change with notice.
            </p>
          </Section>

          <Section title="7. No warranty">
            <p>
              The Service is provided <strong>&ldquo;as is&rdquo;</strong>,
              without warranties of any kind. As a community-run,
              open-source project we do not guarantee uptime, durability,
              or fitness for any particular purpose. See our{' '}
              <a
                href="/api/health"
                className="text-[#c62828] underline decoration-white/30 hover:decoration-white/70"
              >
                health endpoint
              </a>{' '}
              for current operational status.
            </p>
          </Section>

          <Section title="8. Limitation of liability">
            <p>
              To the fullest extent permitted by law, the ElixpoURL
              maintainers and contributors are not liable for any
              indirect, incidental, or consequential damages arising from
              your use of the Service.
            </p>
          </Section>

          <Section title="9. Termination">
            <p>
              You may delete your account and all associated links at any
              time. We may suspend or terminate accounts that violate
              these Terms, with notice where practical.
            </p>
          </Section>

          <Section title="10. Changes">
            <p>
              We may update these Terms over time. Material changes will be
              reflected by the &ldquo;last updated&rdquo; date above.
              Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions about these Terms? Email{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[#c62828] underline decoration-white/30 hover:decoration-white/70"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </article>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <section>
      <h2
        id={id}
        className="text-[1.35rem] font-bold text-white tracking-tight mb-3 scroll-mt-20"
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
