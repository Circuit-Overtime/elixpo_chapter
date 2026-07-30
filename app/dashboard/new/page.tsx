'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Modal from '@/app/components/Modal';

type SlugStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken'; reason: string };

export default function ShortenPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [result, setResult] = useState<{ short_url: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<string>('free');
  const [copied, setCopied] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: 'idle' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPro = tier !== 'free';

  // Load tier once on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if ((d as any).tier) setTier((d as any).tier);
      })
      .catch(() => {});
  }, []);

  // Debounced live slug availability check against /api/urls/check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = customCode.trim();
    if (!trimmed) {
      setSlugStatus({ state: 'idle' });
      return;
    }
    setSlugStatus({ state: 'checking' });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/urls/check?slug=${encodeURIComponent(trimmed)}`,
        );
        const data: any = await res.json();
        if (data.available) {
          setSlugStatus({ state: 'available' });
        } else {
          setSlugStatus({ state: 'taken', reason: data.reason || 'Unavailable' });
        }
      } catch {
        setSlugStatus({ state: 'idle' });
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [customCode]);

  const closeAndGoBack = () => {
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    const body: Record<string, unknown> = { url };
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
        setCustomCode('');
        setExpiresAt('');
        setSlugStatus({ state: 'idle' });
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

  // Slug-helper bottom-line: live availability hint
  const slugHelper = (() => {
    switch (slugStatus.state) {
      case 'checking':
        return { text: 'Checking availability…', color: 'rgba(0,0,0,0.45)' };
      case 'available':
        return { text: '✓ Available', color: '#86efac' };
      case 'taken':
        return { text: `✗ ${slugStatus.reason}`, color: '#f87171' };
      default:
        return {
          text: '3–32 chars. Letters, numbers, dash, underscore.',
          color: 'rgba(0,0,0,0.4)',
        };
    }
  })();

  return (
    <>
      {/* Shorten URL modal — open while on this route, close → /dashboard. */}
      <Modal
        open={!result}
        onClose={closeAndGoBack}
        title="Shorten a URL"
        description={
          isPro
            ? 'Pick a custom slug or let us generate one.'
            : 'We\'ll generate a short code for you. Upgrade for custom slugs and expirations.'
        }
        size="md"
        disableBackdropClose={loading}
      >
        <form onSubmit={handleSubmit}>
          {/* Destination URL */}
          <div className="mb-4">
            <label
              htmlFor="dest-url"
              className="block text-[0.7rem] text-white/65 mb-1.5 uppercase tracking-wider font-medium"
            >
              Destination URL
            </label>
            <input
              id="dest-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-long-url"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-white placeholder-white/40 transition-colors"
              style={{
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#e53935')}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor =
                  'rgba(255,255,255,0.1)')
              }
            />
          </div>

          {/* Slug + live availability — Pro only */}
          {isPro && (
            <div className="mb-4">
              <label
                htmlFor="slug"
                className="block text-[0.7rem] text-white/65 mb-1.5 uppercase tracking-wider font-medium"
              >
                Custom slug{' '}
                <span className="text-white/40 normal-case font-normal">
                  (optional)
                </span>
              </label>
              <div className="relative">
                <input
                  id="slug"
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="e.g. launch, blog-q1"
                  className="w-full px-3 py-2.5 pr-9 rounded-lg text-sm outline-none text-white placeholder-white/40 transition-colors font-mono"
                  style={{
                    background: 'rgba(0,0,0,0.04)',
                    border: `1px solid ${
                      slugStatus.state === 'taken'
                        ? 'rgba(239,68,68,0.45)'
                        : slugStatus.state === 'available'
                        ? 'rgba(134,239,172,0.45)'
                        : 'rgba(255,255,255,0.1)'
                    }`,
                  }}
                  onFocus={(e) => {
                    if (slugStatus.state === 'idle' || slugStatus.state === 'checking') {
                      e.currentTarget.style.borderColor = '#e53935';
                    }
                  }}
                  onBlur={(e) => {
                    if (slugStatus.state === 'idle' || slugStatus.state === 'checking') {
                      e.currentTarget.style.borderColor =
                        'rgba(255,255,255,0.1)';
                    }
                  }}
                />
                {slugStatus.state === 'checking' && (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2"
                    style={{
                      borderColor: 'rgba(229,57,53,0.6)',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                )}
              </div>
              <div
                className="text-[0.72rem] mt-1.5"
                style={{ color: slugHelper.color }}
              >
                {slugHelper.text}
              </div>
            </div>
          )}

          {/* Expiration — Pro only */}
          {isPro && (
            <div className="mb-5">
              <label
                htmlFor="expires"
                className="block text-[0.7rem] text-white/65 mb-1.5 uppercase tracking-wider font-medium"
              >
                Expires{' '}
                <span className="text-white/40 normal-case font-normal">
                  (optional)
                </span>
              </label>
              <input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-white transition-colors"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = '#e53935')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.1)')
                }
              />
            </div>
          )}

          {/* Free-tier callout */}
          {!isPro && (
            <div
              className="mb-5 p-3 rounded-lg text-[0.78rem] leading-relaxed"
              style={{
                background: 'rgba(229,57,53,0.06)',
                border: '1px solid rgba(229,57,53,0.18)',
                color: 'rgba(0,0,0,0.65)',
              }}
            >
              <span className="font-semibold text-[#e85a57]">Free plan</span> —
              auto-generated codes, no expiration. Upgrade for custom slugs and
              expirations.
            </div>
          )}

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={closeAndGoBack}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/85 transition-colors"
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.12)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !url ||
                (isPro && slugStatus.state === 'taken')
              }
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{
                background:
                  'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                boxShadow: '0 4px 14px rgba(229,57,53,0.4)',
                opacity:
                  loading || !url || (isPro && slugStatus.state === 'taken')
                    ? 0.6
                    : 1,
              }}
            >
              {loading ? 'Shortening…' : 'Shorten URL'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Result modal — appears after successful shorten. Close → /dashboard. */}
      <Modal
        open={!!result}
        onClose={closeAndGoBack}
        title="Your short link"
        description="Ready to share. Copy it now or jump to its analytics page."
        size="md"
      >
        <div
          className="p-4 rounded-xl mb-4 font-mono text-sm break-all"
          style={{
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(229,57,53,0.25)',
            color: '#e8e8ed',
          }}
        >
          {result?.short_url}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/85 transition-colors inline-flex items-center gap-2"
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.12)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/85 transition-colors"
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.12)',
            }}
          >
            Shorten another
          </button>
          <button
            type="button"
            onClick={closeAndGoBack}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{
              background:
                'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
              boxShadow: '0 4px 14px rgba(229,57,53,0.4)',
            }}
          >
            Done
          </button>
        </div>
      </Modal>
    </>
  );
}
