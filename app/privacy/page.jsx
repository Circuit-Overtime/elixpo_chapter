import AppShell from '../../src/components/AppShell';

export const metadata = {
  title: 'Privacy Policy — LixBlogs',
  description: 'How LixBlogs collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-12 prose-legal" style={{ color: 'var(--text-secondary)' }}>
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
        <p className="text-[13px] mb-8" style={{ color: 'var(--text-faint)' }}>Last updated: June 2026</p>

        {[
          ['Who we are', 'LixBlogs is a blogging platform operated by Elixpo (Ayushman Bhattacharya). You can reach us at hello@elixpo.com.'],
          ['What we collect', 'Account details from Elixpo Accounts (your username, display name, email, and avatar), the content you publish, and usage signals (views, reads, likes, claps, bookmarks, follows) used to power your feed and stats.'],
          ['How we use it', 'To operate the service: authenticate you, render your profile and posts, personalize your feed, compute author stats, and send transactional emails (login alerts, account actions, and an optional weekly digest).'],
          ['What we do NOT do', 'We do not sell your personal data, and we do not run third-party advertising trackers on your content.'],
          ['Storage & processing', 'Data is stored on Cloudflare infrastructure (D1, KV, R2) and media on Cloudinary. Authentication is handled by Elixpo Accounts via OAuth 2.0.'],
          ['Your choices', 'You can edit or delete your content and manage your profile at any time. Account deletion and revocation are handled at accounts.elixpo.com → Connected apps.'],
          ['Contact', 'Questions about your data? Email hello@elixpo.com.'],
        ].map(([h, b]) => (
          <section key={h} className="mb-6">
            <h2 className="text-[16px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{h}</h2>
            <p className="text-[14px] leading-relaxed">{b}</p>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
