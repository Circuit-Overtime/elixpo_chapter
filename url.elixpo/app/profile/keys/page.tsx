'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ApiKey {
  id: number;
  key_prefix: string;
  name: string;
  scopes: string;
  last_used_at: string | null;
  is_active: number;
  created_at: string;
}

const scopeOptions = [
  { value: 'read,write', label: 'Read & Write', desc: 'Full access to create, read, update, and delete URLs' },
  { value: 'read', label: 'Read only', desc: 'Can only list and view URLs and analytics' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('read,write');
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fetchKeys = async () => {
    const res = await fetch('/api/keys');
    const data: any = await res.json();
    setKeys(data.keys || []);
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNewKey('');
    setCreating(true);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes }),
      });
      const data: any = await res.json();
      if (data.key) {
        setNewKey(data.key);
        setName('');
        fetchKeys();
      } else {
        setError(data.error || 'Failed to create key');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    if (res.ok) fetchKeys();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] relative">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[15%] right-[30%] w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(163,230,53,0.06), transparent 70%)',
            animation: 'pulse-glow 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[20%] left-[25%] w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(134,239,172,0.04), transparent 70%)',
            animation: 'pulse-glow 8s ease-in-out infinite 2s',
          }}
        />
      </div>

      <div
        className="w-full max-w-xl relative z-10 py-8"
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
            API Keys
          </h1>
          <p className="text-sm text-text-muted">
            Manage keys for programmatic access &middot;{' '}
            <Link href="/docs#auth" className="text-lime-main no-underline hover:underline">
              Read the docs
            </Link>
          </p>
        </div>

        {/* Create key card */}
        <div
          className="rounded-2xl p-[1px] mb-6"
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
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#a3e635', boxShadow: '0 0 6px rgba(163,230,53,0.5)' }}
              />
              <span className="text-[0.65rem] text-lime-main font-semibold uppercase tracking-wider">
                Create New Key
              </span>
            </div>

            <form onSubmit={handleCreate}>
              <div className="mb-5">
                <label className="block text-[0.7rem] text-text-secondary mb-1.5 uppercase tracking-wider font-medium">
                  Key Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Server, CI Pipeline"
                  required
                  className="input-field"
                />
              </div>

              {/* Scope selector */}
              <div className="mb-6">
                <label className="block text-[0.7rem] text-text-secondary mb-2 uppercase tracking-wider font-medium">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {scopeOptions.map((opt) => {
                    const selected = scopes === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setScopes(opt.value)}
                        className="text-left p-3.5 rounded-xl transition-all duration-200 cursor-pointer"
                        style={{
                          background: selected
                            ? 'linear-gradient(135deg, rgba(163,230,53,0.06), rgba(134,239,172,0.03))'
                            : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${selected ? 'rgba(163,230,53,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          boxShadow: selected ? '0 0 16px rgba(163,230,53,0.06)' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all"
                            style={{ border: `2px solid ${selected ? '#a3e635' : 'rgba(255,255,255,0.2)'}` }}
                          >
                            {selected && <span className="w-2 h-2 rounded-full bg-lime-main" />}
                          </span>
                          <span
                            className="text-sm font-medium transition-colors"
                            style={{ color: selected ? '#a3e635' : '#f5f5f4' }}
                          >
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-[0.7rem] text-text-disabled ml-6 leading-relaxed">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

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
                disabled={creating}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer"
                style={{
                  background: creating
                    ? 'rgba(163, 230, 53, 0.08)'
                    : 'linear-gradient(135deg, rgba(163,230,53,0.18), rgba(134,239,172,0.12))',
                  color: '#a3e635',
                  border: '1px solid rgba(163, 230, 53, 0.3)',
                  boxShadow: creating ? 'none' : '0 0 30px rgba(163,230,53,0.08)',
                }}
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border-2 border-current"
                      style={{ borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }}
                    />
                    Creating...
                  </span>
                ) : (
                  'Create Key'
                )}
              </button>
            </form>

          </div>
        </div>

        {/* Keys list card */}
        <div
          className="rounded-2xl p-[1px]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          }}
        >
          <div
            className="rounded-2xl p-7"
            style={{
              background: 'linear-gradient(135deg, rgba(16,24,12,0.8), rgba(12,15,10,0.9))',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 15px 40px -10px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.4)' }}
              />
              <span className="text-[0.65rem] text-text-secondary font-semibold uppercase tracking-wider">
                Your Keys
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-text-disabled text-sm">
                <span
                  className="w-4 h-4 rounded-full border-2 border-current"
                  style={{ borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }}
                />
                Loading...
              </div>
            ) : keys.length > 0 ? (
              <div className="space-y-3">
                {keys.map((k, i) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                    style={{
                      background: k.is_active ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
                      border: `1px solid ${k.is_active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                      opacity: k.is_active ? 1 : 0.5,
                      animation: `fade-in-up 0.3s ease-out ${i * 0.05}s both`,
                    }}
                  >
                    {/* Key icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: k.is_active ? 'rgba(163,230,53,0.08)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${k.is_active ? 'rgba(163,230,53,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke={k.is_active ? '#a3e635' : '#71717a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <circle cx="7.5" cy="12.5" r="3.5" />
                        <path d="M10.2 9.8L16 4M14 4l2 2M12.5 6.5l2 2" />
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{k.name}</span>
                        <span
                          className="text-[0.6rem] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: k.scopes.includes('write') ? 'rgba(163,230,53,0.1)' : 'rgba(134,239,172,0.1)',
                            color: k.scopes.includes('write') ? '#a3e635' : '#86efac',
                            border: `1px solid ${k.scopes.includes('write') ? 'rgba(163,230,53,0.2)' : 'rgba(134,239,172,0.2)'}`,
                          }}
                        >
                          {k.scopes.includes('write') ? 'R/W' : 'Read'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-text-disabled font-mono">{k.key_prefix}...</span>
                        <span className="text-xs text-text-disabled">
                          {k.last_used_at ? `Used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}
                        </span>
                      </div>
                    </div>

                    {/* Status + Action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-[0.6rem] font-medium uppercase tracking-wider px-2 py-1 rounded-lg"
                        style={{
                          background: k.is_active ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                          color: k.is_active ? '#4ade80' : '#f87171',
                          border: `1px solid ${k.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}
                      >
                        {k.is_active ? 'Active' : 'Revoked'}
                      </span>
                      {k.is_active ? (
                        <button
                          onClick={() => handleRevoke(k.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                          style={{
                            background: 'rgba(239,68,68,0.08)',
                            color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }}
                        >
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-text-disabled text-sm italic">
                No API keys yet — create one above
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {newKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ animation: 'modal-in 0.3s ease-out' }}
        >
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
          />

          {/* Modal card */}
          <div
            className="relative w-full max-w-md rounded-2xl p-[1px]"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(163,230,53,0.15), rgba(255,255,255,0.05))',
              animation: 'fade-in-up 0.4s ease-out',
            }}
          >
            <div
              className="rounded-2xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(16,24,12,0.97), rgba(12,15,10,0.98))',
                boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), 0 0 60px rgba(251,191,36,0.06)',
              }}
            >
              {/* Warning icon */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    boxShadow: '0 0 20px rgba(251,191,36,0.08)',
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <circle cx="7.5" cy="12.5" r="3.5" />
                    <path d="M10.2 9.8L16 4M14 4l2 2M12.5 6.5l2 2" />
                  </svg>
                </div>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-lg font-display font-bold text-text-primary mb-1">Your API Key</h3>
                <p className="text-xs text-text-muted">
                  This key will only be shown once. Copy it now and store it somewhere safe.
                </p>
              </div>

              {/* Key field with inline copy */}
              <div
                className="relative flex items-center rounded-xl mb-6"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                <code className="text-sm text-text-primary break-all flex-1 font-mono px-4 py-3.5 pr-20">
                  {newKey}
                </code>
                <button
                  onClick={() => handleCopy(newKey)}
                  className="absolute right-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                  style={{
                    background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                    color: copied ? '#22c55e' : '#f5f5f4',
                    border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.15)'}`,
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => setNewKey('')}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(163,230,53,0.18), rgba(134,239,172,0.12))',
                  color: '#a3e635',
                  border: '1px solid rgba(163, 230, 53, 0.3)',
                  boxShadow: '0 0 30px rgba(163,230,53,0.08)',
                }}
              >
                I have saved my credentials
              </button>
            </div>
          </div>
        </div>
      )}

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
        @keyframes modal-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
