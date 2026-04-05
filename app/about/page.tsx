'use client';

import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import GitHubIcon from '@mui/icons-material/GitHub';

const features = [
  {
    icon: '🔐',
    title: 'OAuth 2.0 Provider',
    desc: 'Industry-standard authorization code flow with PKCE support. Let users sign in to your app with their Elixpo account.',
  },
  {
    icon: '⚡',
    title: 'Edge-First Architecture',
    desc: 'Runs entirely on Cloudflare Workers and D1 — globally distributed, sub-50ms latency, zero cold starts.',
  },
  {
    icon: '🛡️',
    title: 'Secure by Default',
    desc: 'EdDSA JWT tokens, HMAC-SHA256 webhook signatures, httpOnly cookies, and Web Crypto API — no Node.js crypto dependencies.',
  },
  {
    icon: '🔗',
    title: 'Multi-Provider SSO',
    desc: 'Users can register and sign in with email/password, Google, or GitHub — with automatic account linking.',
  },
  {
    icon: '🧑‍💻',
    title: 'Developer Portal',
    desc: 'Register OAuth apps, manage redirect URIs, view usage stats, and configure webhooks — all from your dashboard.',
  },
  {
    icon: '📡',
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

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
          <Box
            component={Link}
            href="/register"
            sx={{
              px: 3, py: 1.5, borderRadius: '10px',
              background: 'rgba(163, 230, 53, 0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none',
              transition: 'all 0.2s',
              '&:hover': { background: 'rgba(163, 230, 53, 0.25)', borderColor: 'rgba(163, 230, 53, 0.5)' },
            }}
          >
            Create Account
          </Box>
          <Box
            component={Link}
            href="/login"
            sx={{
              px: 3, py: 1.5, borderRadius: '10px',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 500, fontSize: '0.95rem', textDecoration: 'none',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fff' },
            }}
          >
            Sign In
          </Box>
        </Box>
      </Box>

      {/* Features Grid */}
      <Box sx={{ maxWidth: '1000px', mx: 'auto', px: 3, pb: 8 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2,
        }}>
          {features.map((f) => (
            <Box
              key={f.title}
              sx={{
                p: 3,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: 'rgba(163,230,53,0.3)',
                  bgcolor: 'rgba(163,230,53,0.03)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ fontSize: '1.5rem', mb: 1.5 }}>{f.icon}</Box>
              <Typography sx={{ color: '#f5f5f4', fontWeight: 700, fontSize: '0.95rem', mb: 1 }}>
                {f.title}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem', lineHeight: 1.65 }}>
                {f.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Open Source Banner */}
      <Box sx={{ maxWidth: '1000px', mx: 'auto', px: 3, pb: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            p: 4,
            borderRadius: '20px',
            bgcolor: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography sx={{ color: '#f5f5f4', fontWeight: 700, fontSize: '1.1rem', mb: 0.75 }}>
              Fully Open Source
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 480 }}>
              Elixpo Accounts is open source and free to self-host. Inspect the code, contribute, or deploy your own instance.
            </Typography>
          </Box>
          <Box
            component="a"
            href="https://github.com/Circuit-Overtime/elixpo_accounts"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 3, py: 1.5,
              borderRadius: '12px',
              bgcolor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f5f5f4',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              flexShrink: 0,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <GitHubIcon sx={{ fontSize: '1.25rem' }} />
            View on GitHub
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>
          Elixpo Accounts &mdash; Open source &middot; Built on Cloudflare Pages
        </Typography>
      </Box>
    </Box>
  );
}
