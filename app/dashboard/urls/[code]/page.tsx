import { getCurrentUser } from '@/lib/auth';
import { getDB, getEnv } from '@/lib/db';
import { TIER_LIMITS, type UrlRecord } from '@/lib/types';
import Link from 'next/link';
import CopyButton from './CopyButton';
import DeleteButton from './DeleteButton';
import QrCard from './QrCard';

export const runtime = 'edge';

export default async function UrlDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const user = (await getCurrentUser())!;
  const { code } = await params;
  const db = getDB();
  const env = getEnv();
  const limits = TIER_LIMITS[user.tier];
  const days = Math.min(parseInt(daysParam || '7'), limits.maxClicksRetention);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const url = await db.prepare('SELECT * FROM urls WHERE short_code = ? AND user_id = ?')
    .bind(code, user.id).first<UrlRecord>();

  if (!url) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-text-disabled">URL not found</p>
      </div>
    );
  }

  let analyticsData = null;
  if (limits.analytics) {
    const [timeline, countries, browsers, devices] = await Promise.all([
      db.prepare('SELECT DATE(clicked_at) as date, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY DATE(clicked_at) ORDER BY date')
        .bind(url.id, since).all<{ date: string; count: number }>(),
      db.prepare('SELECT country, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY country ORDER BY count DESC LIMIT 10')
        .bind(url.id, since).all<{ country: string; count: number }>(),
      db.prepare('SELECT browser, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY browser ORDER BY count DESC')
        .bind(url.id, since).all<{ browser: string; count: number }>(),
      db.prepare('SELECT device, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY device ORDER BY count DESC')
        .bind(url.id, since).all<{ device: string; count: number }>(),
    ]);
    analyticsData = { timeline: timeline.results, countries: countries.results, browsers: browsers.results, devices: devices.results };
  }

  const shortUrl = `${env.BASE_URL}/${code}`;
  const maxC = analyticsData ? Math.max(...(analyticsData.timeline?.map((r) => r.count) || [1]), 1) : 1;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-sans font-bold text-text-primary">/{code}</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-lg truncate">{url.original_url}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <CopyButton value={shortUrl} />
          <DeleteButton code={code} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Total Clicks</div>
          <div className="text-2xl font-bold mt-1">{url.clicks}</div>
        </div>
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Status</div>
          <div className="mt-2">
            <span className={`badge ${url.is_active ? 'bg-[rgba(34,197,94,0.1)] text-[#4ade80] border border-[rgba(34,197,94,0.3)]' : 'bg-[rgba(239,68,68,0.1)] text-[#f87171] border border-[rgba(239,68,68,0.3)]'}`}>
              {url.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Created</div>
          <div className="text-sm font-medium mt-2">{new Date(url.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* QR + per-URL CSV export — visible to all tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-6">
        <div className="glass-card p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/45 mb-3">
              Export click data
            </div>
            <p className="text-sm text-white/65 leading-relaxed">
              Download every click on this link as CSV — one row per click,
              with timestamp, country, browser, device, and referer.
              {!limits.analytics && (
                <span className="block mt-2 text-[#f87171]">
                  Per-click export requires Pro tier or above.
                </span>
              )}
            </p>
          </div>
          <a
            href={`/api/urls/${code}/clicks.csv`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-all self-start ${
              limits.analytics ? 'text-white' : 'pointer-events-none'
            }`}
            style={
              limits.analytics
                ? {
                    background:
                      'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
                    boxShadow: '0 4px 14px rgba(155,123,247,0.35)',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
                  }
            }
            aria-disabled={!limits.analytics}
            tabIndex={limits.analytics ? 0 : -1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </a>
        </div>
        <QrCard shortUrl={shortUrl} canCustomize={limits.analytics} />
      </div>

      {/* Analytics */}
      {analyticsData ? (
        <>
          <div className="glass-card p-6 mb-6">
            <h2 className="text-sm font-semibold mb-4">Clicks ({days}d)</h2>
            {analyticsData.timeline && analyticsData.timeline.length > 0 ? (
              <div className="chart-bar">
                {analyticsData.timeline.map((r) => (
                  <div key={r.date} className="bar" style={{ height: `${Math.max((r.count / maxC) * 100, 4)}%` }}>
                    <span className="tip">{r.date}: {r.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-disabled text-sm italic">No clicks yet</div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">Countries</h2>
              {analyticsData.countries && analyticsData.countries.length > 0 ? (
                <div className="space-y-2">
                  {analyticsData.countries.map((r) => (
                    <div key={r.country} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{r.country || 'Unknown'}</span>
                      <span>{r.count}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-text-disabled text-sm italic">No data</div>}
            </div>
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">Browsers</h2>
              {analyticsData.browsers && analyticsData.browsers.length > 0 ? (
                <div className="space-y-2">
                  {analyticsData.browsers.map((r) => (
                    <div key={r.browser} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{r.browser || 'Unknown'}</span>
                      <span>{r.count}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-text-disabled text-sm italic">No data</div>}
            </div>
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">Devices</h2>
              {analyticsData.devices && analyticsData.devices.length > 0 ? (
                <div className="space-y-2">
                  {analyticsData.devices.map((r) => (
                    <div key={r.device} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{r.device || 'Unknown'}</span>
                      <span>{r.count}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-text-disabled text-sm italic">No data</div>}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-text-disabled mb-3">Detailed analytics require <strong className="text-text-secondary">Pro</strong> tier or above.</p>
          <Link href="/profile" className="btn-accent no-underline text-sm">Upgrade Plan</Link>
        </div>
      )}
    </div>
  );
}
