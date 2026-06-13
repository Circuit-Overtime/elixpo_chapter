import AppShell from '../../src/components/AppShell';

export const metadata = {
  title: 'Terms of Service — LixBlogs',
  description: 'The terms governing your use of LixBlogs.',
};

export default function TermsPage() {
  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto px-6 py-12 block" style={{ color: 'var(--text-secondary)' }}>
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>Terms of Service</h1>
        <p className="text-[13px] mb-8" style={{ color: 'var(--text-faint)' }}>Last updated: June 2026</p>

        {[
          ['Acceptance', 'By using LixBlogs you agree to these terms. If you do not agree, please do not use the service.'],
          ['Your account', 'You are responsible for activity under your account. Sign in is provided through Elixpo Accounts; keep your credentials secure.'],
          ['Your content', 'You retain ownership of what you publish. By posting, you grant LixBlogs a non-exclusive license to host, display, and distribute your content on the platform. You are responsible for having the rights to what you post.'],
          ['Acceptable use', 'No spam, harassment, hate speech, NSFW or illegal content, copyright infringement, or attempts to disrupt the service. We may remove content or suspend accounts that violate these rules.'],
          ['Reposts & attribution', 'Resharing keeps the original author’s attribution. Do not misrepresent authorship or imply endorsement you do not have.'],
          ['Trademarks', '“Elixpo”, “LixBlogs”, “LixEditor”, and “LixSketch” are trademarks of Elixpo. See the project LICENSE for the MIT-with-trademark-exception terms.'],
          ['Disclaimer', 'The service is provided “as is”, without warranties. To the extent permitted by law, Elixpo is not liable for damages arising from its use.'],
          ['Changes', 'We may update these terms; continued use after changes means you accept them.'],
          ['Contact', 'Questions? Email hello@elixpo.com.'],
        ].map(([h, b]) => (
          <section key={h} className="mb-6">
            <h2 className="text-[16px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{h}</h2>
            <p className="text-[14px] leading-relaxed">{b}</p>
          </section>
        ))}

        <section className="mb-6">
          <h2 className="text-[16px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>License</h2>
          <p className="text-[14px] leading-relaxed">
            LixBlogs is open source under MIT with an Elixpo trademark exception. Read the full license at{' '}
            <a href="https://github.com/elixpo/blogs.elixpo/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
              github.com/elixpo/blogs.elixpo/blob/main/LICENSE
            </a>.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
