'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generatePixelAvatar } from '@/lib/pixel-avatar';

interface AuthorizationRequest {
  clientId: string;
  clientName: string;
  clientDescription?: string;
  homepageUrl?: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}

const SCOPE_LABELS: Record<string, { label: string; desc: string }> = {
  openid: { label: 'OpenID', desc: 'Verify your identity' },
  profile: { label: 'Profile', desc: 'Name and account info' },
  email: { label: 'Email', desc: 'Your email address' },
  phone: { label: 'Phone', desc: 'Your phone number' },
  address: { label: 'Address', desc: 'Your address info' },
};

function ClientIcon({ name, homepageUrl, clientId, size = 44 }: { name: string; homepageUrl?: string; clientId: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const hostname = homepageUrl ? (() => { try { return new URL(homepageUrl).hostname; } catch { return ''; } })() : '';

  if (homepageUrl && hostname && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: 10, flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={generatePixelAvatar(clientId + name, size)}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 10, flexShrink: 0 }}
    />
  );
}

function AuthorizeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authRequest, setAuthRequest] = useState<AuthorizationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(600);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      const state = searchParams.get('state');
      const clientId = searchParams.get('client_id');
      const redirectUri = searchParams.get('redirect_uri');
      const scope = searchParams.get('scope') || 'openid profile email';
      const scopes = scope.split(' ').filter(Boolean);

      if (!state || !clientId || !redirectUri) {
        setError('Invalid authorization request');
        return;
      }

      // 1. Check if user is logged in
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) {
        // Not logged in — redirect to login with ?next= pointing back here
        const currentUrl = `/authorize?${searchParams.toString()}`;
        window.location.href = `/login?next=${encodeURIComponent(currentUrl)}`;
        return;
      }

      try {
        // 2. Fetch client info (public endpoint, no auth needed)
        const [configRes, clientRes] = await Promise.all([
          fetch('/api/auth/config'),
          fetch(`/api/auth/oauth-clients?client_id=${encodeURIComponent(clientId)}`),
        ]);

        if (configRes.ok) {
          const config = await configRes.json();
          setTimeRemaining(config.authorizationTimeoutSeconds || 600);
        }

        if (!clientRes.ok) {
          const err: any = await clientRes.json();
          setError(err.error || 'Application not found');
          return;
        }

        const client: any = await clientRes.json();

        // 3. Validate redirect URI is registered
        const registeredUris: string[] = client.redirect_uris || [];
        if (!registeredUris.includes(redirectUri)) {
          setError('Redirect URI is not registered for this application');
          return;
        }

        setAuthRequest({
          clientId,
          clientName: client.name || 'Unknown App',
          clientDescription: client.description || null,
          homepageUrl: client.homepage_url || null,
          redirectUri,
          scopes: scopes.length > 0 ? scopes : client.scopes || [],
          state,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load authorization request');
      }
    };
    load();
  }, [searchParams]);

  useEffect(() => {
    if (!authRequest || hasTimedOut) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) { clearInterval(timer); setHasTimedOut(true); setError('Authorization request expired.'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authRequest, hasTimedOut]);

  const handleAuthorize = async () => {
    if (!authRequest || hasTimedOut) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: authRequest.state,
          clientId: authRequest.clientId,
          redirectUri: authRequest.redirectUri,
          scopes: authRequest.scopes,
          approved: true,
        }),
      });
      if (!res.ok) throw new Error('Authorization failed');
      const data: any = await res.json();
      window.location.href = data.redirect_uri;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    if (!authRequest || hasTimedOut) return;
    const url = new URL(authRequest.redirectUri);
    url.searchParams.set('error', 'access_denied');
    url.searchParams.set('state', authRequest.state);
    window.location.href = url.toString();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const hostname = authRequest?.homepageUrl
    ? (() => { try { return new URL(authRequest.homepageUrl).hostname; } catch { return ''; } })()
    : '';

  // --- Error state ---
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)', padding: 16 }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>!</div>
          <p style={{ color: '#f87171', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Authorization Error</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>{error}</p>
          <button
            onClick={() => router.push('/login')}
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (!authRequest) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(163,230,53,0.2)', borderTopColor: '#a3e635', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // --- Consent screen ---
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)', padding: 16,
    }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        {/* Main Card */}
        <div style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          {/* Header — App handshake */}
          <div style={{ padding: '24px 24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Elixpo logo */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(163,230,53,0.25)',
            }}>
              <img src="/LOGO/logo.png" alt="Elixpo" width={44} height={44} style={{ display: 'block' }} />
            </div>

            {/* Connector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635', opacity: 0.6 }} />
              <div style={{ width: 24, height: 2, background: 'linear-gradient(90deg, rgba(163,230,53,0.5), rgba(163,230,53,0.15))' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635', opacity: 0.6 }} />
            </div>

            {/* Client icon */}
            <div style={{ flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <ClientIcon name={authRequest.clientName} homepageUrl={authRequest.homepageUrl} clientId={authRequest.clientId} size={44} />
            </div>

            {/* Text */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: '#f5f5f4', fontWeight: 700, fontSize: 15, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {authRequest.clientName}
              </p>
              {hostname && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '2px 0 0', fontFamily: 'monospace' }}>
                  {hostname}
                </p>
              )}
            </div>
          </div>

          {/* Bento grid */}
          <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Scopes card — spans full width */}
            <div style={{
              gridColumn: '1 / -1',
              background: 'rgba(163,230,53,0.04)',
              border: '1px solid rgba(163,230,53,0.1)',
              borderRadius: 12,
              padding: 16,
            }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                Requesting access to
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {authRequest.scopes.map((scope) => {
                  const info = SCOPE_LABELS[scope] || { label: scope, desc: scope };
                  return (
                    <div key={scope} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="#a3e635" style={{ flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{info.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info card */}
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 14,
            }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, margin: '0 0 6px' }}>Security</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                Only verified apps can request access. Revoke anytime from settings.
              </p>
            </div>

            {/* Timer card */}
            <div style={{
              background: timeRemaining < 60 ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.025)',
              border: `1px solid ${timeRemaining < 60 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, margin: '0 0 4px' }}>Expires in</p>
              <p style={{
                fontFamily: 'monospace',
                fontSize: 22,
                fontWeight: 700,
                color: timeRemaining < 60 ? '#ef4444' : '#a3e635',
                margin: 0,
              }}>
                {formatTime(timeRemaining)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            padding: '12px 16px 16px',
            display: 'flex',
            gap: 10,
          }}>
            <button
              onClick={handleDeny}
              disabled={isLoading || hasTimedOut}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading || hasTimedOut ? 'not-allowed' : 'pointer',
                opacity: isLoading || hasTimedOut ? 0.5 : 1,
              }}
            >
              Deny
            </button>
            <button
              onClick={handleAuthorize}
              disabled={isLoading || hasTimedOut}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid rgba(163,230,53,0.3)',
                background: 'rgba(163,230,53,0.12)',
                color: '#a3e635',
                fontSize: 14,
                fontWeight: 700,
                cursor: isLoading || hasTimedOut ? 'not-allowed' : 'pointer',
                opacity: isLoading || hasTimedOut ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isLoading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(163,230,53,0.3)', borderTopColor: '#a3e635', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Authorizing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Authorize
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
          Don&apos;t recognize this app?{' '}
          <button
            onClick={() => router.push('/login')}
            style={{ color: '#a3e635', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >
            Go back to safety
          </button>
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense>
      <AuthorizeContent />
    </Suspense>
  );
}
