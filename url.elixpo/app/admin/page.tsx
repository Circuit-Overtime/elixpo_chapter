import { getCurrentUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import Link from 'next/link';

export const runtime = 'edge';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const user = (await getCurrentUser())!;
  const db = getDB();
  const days = parseInt(daysParam || '7');
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [totalUsers, totalUrls, totalClicks, recentClicks, adminCount, timeline, topUrls, topCountries] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM urls').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM clicks').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM clicks WHERE clicked_at >= ?').bind(since).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").first<{ count: number }>(),
    db.prepare('SELECT DATE(clicked_at) as date, COUNT(*) as count FROM clicks WHERE clicked_at >= ? GROUP BY DATE(clicked_at) ORDER BY date')
      .bind(since).all<{ date: string; count: number }>(),
    db.prepare('SELECT u.short_code, u.original_url, u.clicks, usr.display_name as owner FROM urls u JOIN users usr ON u.user_id = usr.id ORDER BY u.clicks DESC LIMIT 10')
      .all<any>(),
    db.prepare('SELECT country, COUNT(*) as count FROM clicks WHERE clicked_at >= ? GROUP BY country ORDER BY count DESC LIMIT 10')
      .bind(since).all<{ country: string; count: number }>(),
  ]);

  const maxC = Math.max(...(timeline.results?.map((r) => r.count) || [1]), 1);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-text-primary mb-6">Admin Monitoring</h1>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Users</div>
          <div className="text-2xl font-bold mt-1">{totalUsers?.count || 0}</div>
        </div>
        <div className="stat-card">
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">URLs</div>
          <div className="text-2xl font-bold mt-1">{totalUrls?.count || 0}</div>
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
          <div className="text-[0.7rem] text-text-disabled uppercase tracking-wider">Admins</div>
          <div className="text-2xl font-bold mt-1">{adminCount?.count || 0} <span className="text-sm text-text-disabled font-normal">/ 15</span></div>
        </div>
      </div>

      <div className="glass-card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold">System Click Timeline</h2>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`/admin?days=${d}`}
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
          <div className="text-center py-8 text-text-disabled text-sm italic">No data</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Top URLs (all time)</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Code</th>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Destination</th>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Clicks</th>
                <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {topUrls.results?.map((u: any) => (
                <tr key={u.short_code} className="border-t border-border-light">
                  <td className="py-2.5 text-sm font-mono text-lime-main">{u.short_code}</td>
                  <td className="py-2.5 text-sm text-text-secondary max-w-[200px] truncate">{u.original_url}</td>
                  <td className="py-2.5 text-sm">{u.clicks}</td>
                  <td className="py-2.5 text-sm text-text-muted">{u.owner}</td>
                </tr>
              )) || <tr><td colSpan={4} className="py-4 text-center text-text-disabled text-sm">No data</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4">Top Countries ({days}d)</h2>
          <div className="space-y-2">
            {topCountries.results?.map((r: any) => (
              <div key={r.country} className="flex justify-between text-sm">
                <span className="text-text-secondary">{r.country || 'Unknown'}</span>
                <span>{r.count}</span>
              </div>
            )) || <div className="text-text-disabled text-sm">No data</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
