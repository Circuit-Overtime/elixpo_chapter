'use client';

import { Box, Typography } from '@mui/material';
import Link from 'next/link';

const features = [
  {
    title: 'OAuth 2.0 Provider',
    desc: 'Industry-standard authorization code flow with PKCE support. Let users sign in to your app with their Elixpo account.',
  },
  {
    title: 'Edge-First Architecture',
    desc: 'Runs entirely on Cloudflare Workers and D1 — globally distributed, sub-50ms latency, zero cold starts.',
  },
  {
    title: 'Secure by Default',
    desc: 'EdDSA JWT tokens, HMAC-SHA256 webhook signatures, httpOnly cookies, and Web Crypto API — no Node.js crypto dependencies.',
  },
  {
    title: 'Multi-Provider SSO',
    desc: 'Users can register and sign in with email/password, Google, or GitHub — with automatic account linking.',
  },
  {
    title: 'Developer Portal',
    desc: 'Register OAuth apps, manage redirect URIs, view usage stats, and configure webhooks — all from your dashboard.',
  },
  {
    title: 'Webhooks',
    desc: 'Receive real-time HTTP notifications for platform events like user signups, OAuth authorizations, and token revocations.',
  },
];

export default function AboutPage() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)' }}>
      {/* Hero */}
      <Box sx={{ maxWidth: '900px', mx: 'auto', px: 3, pt: 10, pb: 8, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
          <Box
            component="img"
            src="/LOGO/logo.png"
            alt="Elixpo"
            sx={{ height: 48, width: 48, borderRadius: '12px' }}
          />
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#f5f5f4', letterSpacing: '-0.02em' }}>
            Elixpo Accounts
          </Typography>
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.15rem', maxWidth: '600px', mx: 'auto', lineHeight: 1.7 }}>
          A modern OAuth 2.0 identity provider built on the edge. Authenticate users across your services with a single, secure account.
        </Typography>
      </Box>

      {/* Features Grid */}
      <Box sx={{ maxWidth: '1000px', mx: 'auto', px: 3, pb: 10 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2.5,
        }}>
          {features.map((f) => (
            <Box
              key={f.title}
              sx={{
                p: 3,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: 'rgba(163,230,53,0.25)' },
              }}
            >
              <Typography sx={{ color: '#f5f5f4', fontWeight: 700, fontSize: '1rem', mb: 1 }}>
                {f.title}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {f.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
          Elixpo Accounts &mdash; Built on Cloudflare Pages
        </Typography>
      </Box>
    </Box>
  );
}
