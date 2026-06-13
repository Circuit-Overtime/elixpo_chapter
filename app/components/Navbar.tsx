'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const REPO_URL = 'https://github.com/elixpo/elixpourl';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        background: 'rgba(15, 17, 23, 0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-[64px] flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 no-underline text-white"
        >
          <img
            src="/base_logo.png"
            alt="ElixpoURL"
            width={30}
            height={30}
            className="rounded-lg"
          />
          <span className="font-bold text-[1.05rem] tracking-tight">
            Elixpo<span style={{ color: '#9b7bf7' }}>URL</span>
          </span>
          <span
            className="hidden sm:inline-flex items-center text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(155, 123, 247, 0.12)',
              color: '#9b7bf7',
              border: '1px solid rgba(155, 123, 247, 0.3)',
            }}
          >
            EDGE
          </span>
        </Link>

        <div className="flex-1" />

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link
            href="/pricing"
            className="px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors no-underline"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors no-underline"
          >
            Docs
          </Link>
          {isLoggedIn && (
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors no-underline"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 ml-1">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            title="View source on GitHub"
            className="w-[38px] h-[38px] flex items-center justify-center rounded-[10px] text-white/85 hover:text-white transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(155,123,247,0.45)';
              e.currentTarget.style.background = 'rgba(155,123,247,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          <Link
            href={isLoggedIn ? '/dashboard' : '/api/auth/login'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold text-sm text-white no-underline transition-all"
            style={{
              background: 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
              boxShadow: '0 4px 14px rgba(155,123,247,0.32)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)';
              e.currentTarget.style.boxShadow =
                '0 6px 20px rgba(155,123,247,0.45)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)';
              e.currentTarget.style.boxShadow =
                '0 4px 14px rgba(155,123,247,0.32)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={
              isLoggedIn
                ? 'Open dashboard'
                : 'Sign in with your Elixpo account'
            }
          >
            {isLoggedIn ? 'Dashboard' : 'Sign in with Elixpo'}
          </Link>
        </div>
      </div>
    </header>
  );
}
