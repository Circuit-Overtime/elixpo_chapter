'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCode, fetchUser, saveAuth } from '../../lib/auth';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('Sign in was cancelled.');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    const savedState = sessionStorage.getItem('oauth_state');
    if (!code || state !== savedState) {
      setStatus('Invalid callback. Redirecting...');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    (async () => {
      try {
        const tokens = await exchangeCode(code);
        const user = await fetchUser(tokens.access_token);
        saveAuth(tokens, user);
        setStatus(`Welcome, ${user.displayName}!`);
        setTimeout(() => router.push('/generate'), 1500);
      } catch {
        setStatus('Sign in failed. Redirecting...');
        setTimeout(() => router.push('/'), 2000);
      }
    })();
  }, [searchParams, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 'var(--font-size-lg)',
    }}>
      {status}
    </div>
  );
}
