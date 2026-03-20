'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '../components/Footer';

const sections = [
  {
    title: 'Authentication',
    id: 'auth',
    content: `ElixpoURL uses API keys for programmatic access. Create keys from your dashboard under Profile > API Keys.

Include your key in the Authorization header:`,
    code: `Authorization: Bearer elu_YOUR_API_KEY`,
  },
  {
    title: 'Shorten a URL',
    id: 'shorten',
    content: 'Create a new short URL by sending a POST request.',
    code: `curl -X POST https://url.elixpo.com/api/urls \\
  -H "Authorization: Bearer elu_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/long-url",
    "title": "My Link",
    "custom_code": "my-link"
  }'`,
    response: `{
  "short_url": "https://url.elixpo.com/my-link",
  "short_code": "my-link",
  "original_url": "https://example.com/long-url",
  "title": "My Link",
  "created_at": "2026-03-20T12:00:00Z"
}`,
  },
  {
    title: 'List URLs',
    id: 'list',
    content: 'Retrieve all your short URLs with pagination and search.',
    code: `curl https://url.elixpo.com/api/urls?limit=20&offset=0&search=example \\
  -H "Authorization: Bearer elu_YOUR_KEY"`,
  },
  {
    title: 'Get URL Details',
    id: 'details',
    content: 'Fetch details for a specific short URL.',
    code: `curl https://url.elixpo.com/api/urls/my-link \\
  -H "Authorization: Bearer elu_YOUR_KEY"`,
  },
  {
    title: 'Update a URL',
    id: 'update',
    content: 'Update the destination, title, or status of a short URL.',
    code: `curl -X PATCH https://url.elixpo.com/api/urls/my-link \\
  -H "Authorization: Bearer elu_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://new-destination.com", "is_active": true}'`,
  },
  {
    title: 'Delete a URL',
    id: 'delete',
    content: 'Permanently delete a short URL and its analytics data.',
    code: `curl -X DELETE https://url.elixpo.com/api/urls/my-link \\
  -H "Authorization: Bearer elu_YOUR_KEY"`,
  },
  {
    title: 'Analytics',
    id: 'analytics',
    content: 'Get click analytics for a URL. Requires Pro tier or above.',
    code: `curl https://url.elixpo.com/api/urls/my-link/analytics?days=30 \\
  -H "Authorization: Bearer elu_YOUR_KEY"`,
    response: `{
  "timeline": [{"date": "2026-03-19", "count": 42}],
  "countries": [{"country": "US", "count": 30}],
  "browsers": [{"browser": "Chrome", "count": 25}],
  "devices": [{"device": "desktop", "count": 35}],
  "referers": [{"referer": "twitter.com", "count": 12}]
}`,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-page overflow-hidden flex flex-col">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full"
      >
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Image src="/logo.png" alt="ElixpoURL" width={32} height={32} className="rounded-lg" />
          <span className="text-xl font-display font-bold text-text-primary">
            <span className="text-lime-main">Elixpo</span>URL
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
            Pricing
          </Link>
          <Link href="/docs" className="text-sm text-lime-main no-underline">
            Docs
          </Link>
          <Link href="/profile/keys" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
            API Keys
          </Link>
          <Link href="/api/auth/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
            Sign In
          </Link>
          <Link href="/api/auth/login" className="btn-lime no-underline text-sm">
            Get Started
          </Link>
        </div>
      </motion.nav>

      {/* Header */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pt-16 pb-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl font-display font-bold mb-4"
        >
          API <span className="text-gradient">Documentation</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="text-text-secondary"
        >
          Everything you need to integrate ElixpoURL into your applications.
        </motion.p>

        {/* TOC */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 glass-card p-5"
        >
          <div className="text-xs text-text-disabled uppercase tracking-wider mb-3 font-medium">On this page</div>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-sm text-text-secondary hover:text-lime-main transition-colors no-underline px-3 py-1.5 rounded-lg hover:bg-bg-glass"
              >
                {s.title}
              </a>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Sections */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pb-24 flex-1">
        {sections.map((s, i) => (
          <motion.div
            key={s.id}
            id={s.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-12 scroll-mt-8"
          >
            <h2 className="text-xl font-display font-bold text-text-primary mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full bg-lime-main opacity-60" />
              {s.title}
            </h2>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">{s.content}</p>
            <pre
              className="p-5 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <code className="text-text-secondary">{s.code}</code>
            </pre>
            {s.response && (
              <div className="mt-3">
                <div className="text-[0.65rem] text-text-disabled uppercase tracking-wider mb-2 ml-1">
                  Response
                </div>
                <pre
                  className="p-5 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed"
                  style={{
                    background: 'rgba(163,230,53,0.02)',
                    border: '1px solid rgba(163,230,53,0.08)',
                  }}
                >
                  <code className="text-sage-main">{s.response}</code>
                </pre>
              </div>
            )}
          </motion.div>
        ))}
      </section>

      <Footer />
    </div>
  );
}
