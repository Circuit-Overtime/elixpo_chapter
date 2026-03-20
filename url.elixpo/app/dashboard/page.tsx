import { getCurrentUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { TIER_LIMITS, type UrlRecord } from '@/lib/types';
import Link from 'next/link';

export const runtime = 'edge';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const user = (await getCurrentUser())!;
  const db = getDB();
  const limits = TIER_LIMITS[user.tier];
  const days = parseInt(daysParam || '7');
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [urlCount, totalClicks, recentClicks, timeline, topUrls] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM urls WHERE user_id = ?').bind(user.id).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM clicks c JOIN urls u ON c.url_id = u.id WHERE u.user_id = ?')
      .bind(user.id).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM clicks c JOIN urls u ON c.url_id = u.id WHERE u.user_id = ? AND c.clicked_at >= ?')
      .bind(user.id, since).first<{ count: number }>(),
    db.prepare('SELECT DATE(c.clicked_at) as date, COUNT(*) as count FROM clicks c JOIN urls u ON c.url_id = u.id WHERE u.user_id = ? AND c.clicked_at >= ? GROUP BY DATE(c.clicked_at) ORDER BY date')
      .bind(user.id, since).all<{ date: string; count: number }>(),
    db.prepare('SELECT * FROM urls WHERE user_id = ? ORDER BY clicks DESC LIMIT 5')
      .bind(user.id).all<UrlRecord>(),
  ]);

  const maxC = Math.max(...(timeline.results?.map((r) => r.count) || [1]), 1);
  const urlLimit = limits.maxUrls === -1 ? '∞' : limits.maxUrls;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-text-primary mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">My URLs</div>
          <div className="text-2xl font-bold mt-1">
            {urlCount?.count || 0}
            <span className="text-sm text-text-disabled font-normal"> / {urlLimit}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Total Clicks</div>
          <div className="text-2xl font-bold mt-1">{totalClicks?.count || 0}</div>
        </div>
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Clicks ({days}d)</div>
          <div className="text-2xl font-bold mt-1">{recentClicks?.count || 0}</div>
        </div>
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Plan</div>
          <div className="text-lg font-bold mt-1 capitalize">{user.tier}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold">Click Timeline</h2>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`/dashboard?days=${d}`}
                className={`text-xs px-2 py-1 rounded-lg no-underline transition-all ${days === d ? 'text-lime-main bg-lime-dim' : 'text-text-disabled hover:text-text-secondary'}`}>
                {d}d
              </Link>
            ))}
          </div>
        </div>
        {timeline.results && timeline.results.length > 0 ? (
          <div className="chart-bar">
            {timeline.results.map((r) => (
              <div key={r.date} className="bar" style={{ height: `${Math.max((r.count / maxC) * 100, 4)}%` }}>
                <span className="tip">{r.date}: {r.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-text-disabled text-sm italic">No click data yet</div>
        )}
      </div>

      {/* Top URLs */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold">Top URLs</h2>
          <Link href="/dashboard/urls" className="btn-glass text-xs no-underline">View All</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Code</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Destination</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Clicks</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {topUrls.results && topUrls.results.length > 0 ? (
              topUrls.results.map((u) => (
                <tr key={u.short_code} className="border-t border-border-light">
                  <td className="py-3">
                    <Link href={`/dashboard/urls/${u.short_code}`} className="text-lime-main text-sm no-underline hover:underline">
                      {u.short_code}
                    </Link>
                  </td>
                  <td className="py-3 text-sm text-text-secondary max-w-[280px] truncate">{u.original_url}</td>
                  <td className="py-3 text-sm">{u.clicks}</td>
                  <td className="py-3 text-sm text-text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-text-disabled text-sm italic">
                  No URLs yet. <Link href="/dashboard/new" className="text-lime-main no-underline">Create your first short URL!</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
