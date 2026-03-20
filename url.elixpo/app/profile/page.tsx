import { getCurrentUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { TIER_LIMITS } from '@/lib/types';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

export const runtime = 'edge';

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  const db = getDB();
  const limits = TIER_LIMITS[user.tier];

  const [urlCount, keyCount, totalClicks, sessionCount] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM urls WHERE user_id = ?').bind(user.id).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND is_active = 1').bind(user.id).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM clicks c JOIN urls u ON c.url_id = u.id WHERE u.user_id = ?')
      .bind(user.id).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires_at > datetime("now")')
      .bind(user.id).first<{ count: number }>(),
  ]);

  const urlLimit = limits.maxUrls === -1 ? '∞' : limits.maxUrls;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-text-primary mb-6">Profile</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Account */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Account</h2>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-border-medium shrink-0">
              <img
                src={user.avatar_url || `https://accounts.elixpo.com/api/avatar/${user.elixpo_id}`}
                alt={user.display_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{user.display_name}</div>
              <div className="text-sm text-text-secondary">{user.email}</div>
              <div className="flex gap-1.5 mt-1">
                <span className="badge bg-lime-dim text-lime-main border border-lime-border capitalize">{user.tier}</span>
                {user.role === 'admin' && (
                  <span className="badge bg-honey-dim text-honey-main border border-honey-border">Admin</span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Elixpo ID</span>
              <span className="text-text-secondary font-mono text-xs">{user.elixpo_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Provider</span>
              <span className="text-text-secondary">Elixpo Accounts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Member since</span>
              <span className="text-text-secondary">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Usage</h2>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-muted">URLs</span>
                <span>{urlCount?.count || 0} / {urlLimit}</span>
              </div>
              {limits.maxUrls !== -1 && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full bg-lime-main transition-all" style={{ width: `${Math.min(((urlCount?.count || 0) / limits.maxUrls) * 100, 100)}%` }} />
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-muted">API Keys</span>
                <span>{keyCount?.count || 0} / {limits.maxApiKeys}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full bg-sage-main transition-all" style={{ width: `${Math.min(((keyCount?.count || 0) / limits.maxApiKeys) * 100, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Total Clicks</div>
              <div className="text-2xl font-bold">{totalClicks?.count || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4">Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border-light">
            <div>
              <div className="text-sm font-medium">Default redirect type</div>
              <div className="text-xs text-text-muted mt-0.5">HTTP 302 temporary redirect for all short URLs</div>
            </div>
            <span className="text-xs text-text-disabled font-mono px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>302</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border-light">
            <div>
              <div className="text-sm font-medium">API Keys</div>
              <div className="text-xs text-text-muted mt-0.5">Manage your API keys for programmatic access</div>
            </div>
            <Link href="/profile/keys" className="btn-glass text-xs no-underline">Manage</Link>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border-light">
            <div>
              <div className="text-sm font-medium">Active sessions</div>
              <div className="text-xs text-text-muted mt-0.5">Sessions expire after 15 days of inactivity</div>
            </div>
            <span className="text-xs text-text-secondary">{sessionCount?.count || 0} active</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium">Connected account</div>
              <div className="text-xs text-text-muted mt-0.5">Managed by Elixpo Accounts SSO</div>
            </div>
            <a
              href="https://accounts.elixpo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass text-xs no-underline"
            >
              Manage Account
            </a>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass-card p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-[#f87171]">Sign Out</h2>
            <p className="text-xs text-text-muted mt-0.5">End your current session on this device</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
