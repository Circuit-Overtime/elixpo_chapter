import { getCurrentUser } from '@/lib/auth';
import { getDB, getEnv } from '@/lib/db';
import { TIER_LIMITS, type UrlRecord } from '@/lib/types';
import Link from 'next/link';
import DeleteButton from './DeleteButton';

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
          <h1 className="text-2xl font-display font-bold text-text-primary">/{code}</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-lg truncate">{url.original_url}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {}}
            className="btn-glass text-sm"
            data-copy={shortUrl}
          >
            Copy Link
          </button>
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
          <Link href="/profile" className="btn-lime no-underline text-sm">Upgrade Plan</Link>
        </div>
      )}
    </div>
  );
}
