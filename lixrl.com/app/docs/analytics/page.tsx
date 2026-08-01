'use client';

const H1 = 'text-[2.1rem] md:text-[2.4rem] font-extrabold tracking-tight text-white mb-4 leading-tight';
const LEDE = 'text-white/70 text-base md:text-[1.05rem] leading-relaxed mb-8';
const H2 = 'text-[1.4rem] font-bold text-white tracking-tight mt-12 mb-3';
const P = 'text-white/70 text-[0.96rem] leading-relaxed mb-4';
const PRE = 'p-4 rounded-xl text-[0.85rem] leading-relaxed overflow-x-auto mb-6 font-mono';
const PRE_STYLE = {
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(0,0,0,0.08)',
  color: '#e8e8ed',
};

export default function AnalyticsPage() {
  return (
    <article>
      <h1 className={H1}>Click Analytics</h1>
      <p className={LEDE}>
        Every redirect is tracked on Cloudflare&apos;s edge in real time.
        Pull breakdowns over any window with one endpoint.
      </p>

      <h2 id="endpoint" className={H2}>Endpoint</h2>
      <p className={P}>
        <code className="font-mono text-white">
          GET /api/urls/{'{code}'}/analytics?days=30
        </code>
      </p>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`curl https://lixrl.com/api/urls/my-link/analytics?days=30 \\
  -H "Authorization: Bearer elu_YOUR_KEY"`}</code>
      </pre>

      <h2 id="response" className={H2}>Response</h2>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`{
  "timeline":  [{"date": "2026-03-19", "count": 42}],
  "countries": [{"country": "US",       "count": 30}],
  "browsers":  [{"browser": "Chrome",   "count": 25}],
  "devices":   [{"device":  "desktop",  "count": 35}],
  "referers":  [{"referer": "twitter.com", "count": 12}]
}`}</code>
      </pre>

      <h2 id="windows" className={H2}>Time windows</h2>
      <ul className="space-y-2 list-none p-0 mb-6">
        {[
          ['days=1', 'Last 24h, bucketed by hour'],
          ['days=7', 'Last 7d, bucketed by day'],
          ['days=30', 'Last 30d, bucketed by day (default)'],
          ['days=90', 'Last 90d, bucketed by day'],
        ].map(([k, v]) => (
          <li key={k} className="text-white/70 text-[0.96rem] flex gap-2.5">
            <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#e53935]" />
            <code className="font-mono text-white">{k}</code> — {v}
          </li>
        ))}
      </ul>

      <h2 id="retention" className={H2}>Retention</h2>
      <p className={P}>
        Free tier keeps the last 30 days of per-click events. Core and
        Growth tiers extend retention — see Pricing once those tiers ship.
      </p>

      <h2 id="privacy" className={H2}>Privacy</h2>
      <p className={P}>
        We do not record visitor IPs in cleartext, fingerprint visitors, or
        sell click data. Country / device / browser are inferred from the
        request headers at redirect time and stored aggregated.
      </p>
    </article>
  );
}
