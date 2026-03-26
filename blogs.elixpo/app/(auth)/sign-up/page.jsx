'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignUpContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  function handleSignUp() {
    const state = crypto.randomUUID();
    document.cookie = `oauth_state=${state}; path=/; max-age=600; samesite=lax`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID,
      redirect_uri: (process.env.NEXT_PUBLIC_URL || window.location.origin) + '/api/auth/callback',
      state,
      scope: 'openid profile email',
    });

    window.location.href = `https://accounts.elixpo.com/oauth/authorize?${params}`;
  }

  const errorMessages = {
    access_denied: 'You denied the authorization request.',
    token_exchange_failed: 'Authentication failed. Please try again.',
    invalid_state: 'Session expired. Please try again.',
    missing_code: 'Something went wrong. Please try again.',
    user_info_failed: 'Could not fetch your profile. Please try again.',
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="h-14 w-14 mx-auto rounded-full bg-[url('/logo.png')] bg-cover mb-4" />
          <h1 className="text-2xl font-bold text-white font-kanit">Create your account</h1>
          <p className="text-[#777] text-sm mt-1.5">Join the LixBlogs community</p>
        </div>

        <div className="bg-[#0d1117] border border-[#1a1d27] rounded-2xl p-6">
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px] text-center">
              {errorMessages[error] || 'An error occurred. Please try again.'}
            </div>
          )}

          <button
            onClick={handleSignUp}
            className="w-full py-2.5 bg-[#e8e8e8] text-[#030712] font-semibold rounded-xl text-[14px] hover:bg-white transition-colors flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Sign up with Elixpo Accounts
          </button>

          <p className="text-[#555] text-[11px] text-center mt-5 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center mt-6 text-[14px] text-[#777]">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-[#e8e8e8] hover:text-white transition-colors font-medium">Sign in</Link>
        </p>

        <p className="text-center text-[#444] text-[11px] mt-6">
          Secured by Elixpo Accounts
        </p>
      </div>
    </div>
  );
}

export default function SignUp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <SignUpContent />
    </Suspense>
  );
}
