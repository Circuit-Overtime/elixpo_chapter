'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ShortenPage() {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [result, setResult] = useState<{ short_url: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<string>('free');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if ((d as any).tier) setTier((d as any).tier);
    }).catch(() => {});
  }, []);

  const isPro = tier !== 'free';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    const body: any = { url };
    if (slug) body.title = slug;
    if (isPro && customCode) body.custom_code = customCode;
    if (isPro && expiresAt) body.expires_at = new Date(expiresAt).toISOString();

    try {
      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: any = await res.json();
      if (data.short_url) {
        setResult(data);
        setUrl('');
        setSlug('');
        setCustomCode('');
        setExpiresAt('');
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] relative">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[20%] left-[40%] w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(163,230,53,0.06), transparent 70%)',
            animation: 'pulse-glow 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(134,239,172,0.04), transparent 70%)',
            animation: 'pulse-glow 8s ease-in-out infinite 2s',
          }}
        />
      </div>

      <div
        className="w-full max-w-lg relative z-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-display font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #f5f5f4 0%, #a3e635 60%, #86efac 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Shorten a URL
          </h1>
          <p className="text-sm text-text-muted">
            Create short links instantly{' '}
            {!isPro && (
              <>
                &middot;{' '}
                <Link href="/pricing" className="text-lime-main no-underline hover:underline">
                  Upgrade for more features
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-[1px]"
          style={{
            background: 'linear-gradient(135deg, rgba(163,230,53,0.2), rgba(134,239,172,0.08), rgba(255,255,255,0.05))',
          }}
        >
          <div
            className="rounded-2xl p-7"
            style={{
              background: 'linear-gradient(135deg, rgba(16,24,12,0.85), rgba(12,15,10,0.95))',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5), 0 0 80px rgba(163,230,53,0.04)',
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* URL input */}
              <div className="mb-5">
                <label className="block text-[0.7rem] text-text-secondary mb-1.5 uppercase tracking-wider font-medium">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/your-long-url"
                  required
                  className="input-field"
                />
              </div>

              {/* Slug */}
              <div className="mb-5">
                <label className="block text-[0.7rem] text-text-secondary mb-1.5 uppercase tracking-wider font-medium">
                  Slug <span className="text-text-disabled normal-case tracking-normal">(optional label)</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. portfolio, campaign-q1"
                  className="input-field"
                />
              </div>

              {/* Pro features */}
              {isPro ? (
                <div
                  className="space-y-5 mb-6 pt-5"
                  style={{ borderTop: '1px solid rgba(163,230,53,0.1)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#a3e635', boxShadow: '0 0 6px rgba(163,230,53,0.5)' }}
                    />
                    <span className="text-[0.65rem] text-lime-main font-semibold uppercase tracking-wider">
                      Pro Features
                    </span>
                  </div>
                  <div>
                    <label className="block text-[0.7rem] text-text-secondary mb-1.5 uppercase tracking-wider font-medium">
                      Custom Short Code
                    </label>
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      placeholder="my-link"
                      pattern="[a-zA-Z0-9_-]+"
                      minLength={3}
                      maxLength={32}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] text-text-secondary mb-1.5 uppercase tracking-wider font-medium">
                      Expires At
                    </label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="mb-6 p-4 rounded-xl text-xs leading-relaxed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.04), rgba(163,230,53,0.02))',
                    border: '1px solid rgba(251,191,36,0.12)',
                    color: 'rgba(245,245,244,0.65)',
                  }}
                >
                  <span className="text-honey-main font-semibold">Free plan</span>{' '}
                  &middot; Links with no clicks for 7 days are auto-removed.{' '}
                  <Link
                    href="/pricing"
                    className="text-lime-main no-underline hover:underline font-medium"
                  >
                    Upgrade to Pro
                  </Link>{' '}
                  for custom codes, expiring links &amp; extended retention.
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="mb-5 p-3.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    animation: 'shake 0.4s ease-in-out',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer relative overflow-hidden"
                style={{
                  background: loading
                    ? 'rgba(163, 230, 53, 0.08)'
                    : 'linear-gradient(135deg, rgba(163,230,53,0.18), rgba(134,239,172,0.12))',
                  color: '#a3e635',
                  border: '1px solid rgba(163, 230, 53, 0.3)',
                  boxShadow: loading ? 'none' : '0 0 30px rgba(163,230,53,0.08)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border-2 border-current"
                      style={{
                        borderTopColor: 'transparent',
                        animation: 'spin 0.6s linear infinite',
                      }}
                    />
                    Creating...
                  </span>
                ) : (
                  'Shorten URL'
                )}
              </button>
            </form>

            {/* Result */}
            {result && (
              <div
                className="mt-6 p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(163,230,53,0.06), rgba(134,239,172,0.03))',
                  border: '1px solid rgba(163, 230, 53, 0.2)',
                  animation: 'fade-in-up 0.4s ease-out',
                }}
              >
                <div className="text-[0.65rem] text-text-muted mb-1.5 uppercase tracking-wider font-medium">
                  Your short URL
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={result.short_url}
                    target="_blank"
                    rel="noopener"
                    className="text-lg font-semibold font-mono no-underline truncate transition-colors duration-200"
                    style={{
                      background: 'linear-gradient(90deg, #a3e635, #86efac)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {result.short_url}
                  </a>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                    style={{
                      background: copied
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(255,255,255,0.08)',
                      color: copied ? '#22c55e' : '#f5f5f4',
                      border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
