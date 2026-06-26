import type { Metadata } from 'next';
import Link from 'next/link';
import BackgroundAurora from '../components/BackgroundAurora';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How ElixpoURL handles your data — what we collect, what we do not, and how clicks are tracked privately on the edge.',
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = 'June 2026';
const SUPPORT_EMAIL = 'hello@elixpo.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#f5f5f4] relative">
      <BackgroundAurora variant="default" />

      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 pt-12 md:pt-16 pb-16">
        <header className="mb-10">
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#c8b6ff] mb-2">
            Last updated · {LAST_UPDATED}
          </div>
          <h1
            className="text-[2.2rem] md:text-[3rem] font-extrabold leading-[1.08] tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #c8c4d8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Privacy Policy
          </h1>
          <p className="text-white/65 mt-3 text-base md:text-[1.05rem] leading-relaxed">
            Privacy-first by design. Here&apos;s exactly what we do — and
            don&apos;t — collect when you use ElixpoURL.
          </p>
        </header>

        <article className="prose-purple space-y-7 text-white/75 leading-relaxed">
          <Section title="Our approach">
            <p>
              ElixpoURL is an open URL shortener that runs on Cloudflare&apos;s
              edge. We collect the bare minimum needed to make short links
              work, give you click analytics, and keep the service safe for
              everyone — nothing more.
            </p>
          </Section>

          <Section title="What we collect when someone clicks your link">
            <p>
              When a visitor follows a short link, we record a single click
              event with the following fields:
            </p>
            <ul>
              <li>
                <strong>Timestamp</strong> of the click.
              </li>
              <li>
                <strong>Country, city, region</strong> from Cloudflare&apos;s
                edge geolocation — never a precise location.
              </li>
              <li>
                <strong>Device, browser, OS</strong> inferred from the
                User-Agent header.
              </li>
              <li>
                <strong>Referrer origin</strong> (e.g.{' '}
                <code>https://twitter.com</code>) — we strip query strings
                and paths.
              </li>
              <li>
                <strong>A hashed, masked IP</strong>. We never store the raw
                IP. IPv4 is masked to /16 (e.g.{' '}
                <code>203.0.x.x</code>); IPv6 is masked to /64. This is
                sufficient for coarse geographic aggregation and abuse
                detection, and not sufficient to re-identify a visitor.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> set tracking cookies on visitors who
              follow a short link, fingerprint browsers, or correlate clicks
              across different links you don&apos;t own.
            </p>
          </Section>

          <Section title="What we collect when you sign in">
            <p>
              ElixpoURL uses{' '}
              <a
                href="https://accounts.elixpo.com"
                className="text-[#c8b6ff] underline decoration-white/30 hover:decoration-white/70"
              >
                Elixpo Accounts
              </a>{' '}
              for sign-in. The OAuth round-trip gives us your email and
              display name; we store these plus an
              opaque <code>elixpo_id</code> linking your ElixpoURL account
              to your Elixpo Account. We do not store passwords.
            </p>
          </Section>

          <Section title="What we never do">
            <ul>
              <li>We do not sell or share your data with advertisers.</li>
              <li>We do not track visitors across sites or build profiles.</li>
              <li>
                We do not log the destination URLs you create except to
                store them for redirection — they are not used for any
                other purpose.
              </li>
              <li>
                We do not retain raw IP addresses, ever — only the masked
                hash.
              </li>
            </ul>
          </Section>

          <Section title="Retention">
            <p>
              Click events are retained for the window matching your tier
              (3 days on Free, up to 365 on Enterprise). Older events are
              deleted in regular cleanup passes. You can delete a short link
              at any time, which removes both the link and all its click
              history immediately.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>
              ElixpoURL runs entirely on{' '}
              <strong>Cloudflare Pages</strong>, <strong>D1</strong>, and{' '}
              <strong>KV</strong>. Cloudflare acts as the edge network and
              database provider; their{' '}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                className="text-[#c8b6ff] underline decoration-white/30 hover:decoration-white/70"
              >
                privacy policy
              </a>{' '}
              applies to data processed in their infrastructure. We use{' '}
              <strong>Google Safe Browsing</strong> to check destination
              URLs against known phishing and malware lists at create time;
              the URL is sent to their API for that check and not retained
              by Google for any other use.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You can export every short link you own as CSV from your
              dashboard, request deletion of your entire account by
              emailing{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[#c8b6ff] underline decoration-white/30 hover:decoration-white/70"
              >
                {SUPPORT_EMAIL}
              </a>
              , or revoke any API key from{' '}
              <Link
                href="/profile/keys"
                className="text-[#c8b6ff] underline decoration-white/30 hover:decoration-white/70"
              >
                Profile → API Keys
              </Link>{' '}
              at any time.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update this policy as the service evolves; the
              &ldquo;last updated&rdquo; date above always reflects the
              current version. Material changes will be announced via the
              changelog and our GitHub Discussions.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Privacy questions? Email{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[#c8b6ff] underline decoration-white/30 hover:decoration-white/70"
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
