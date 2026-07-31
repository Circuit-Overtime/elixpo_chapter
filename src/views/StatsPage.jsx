'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

const TABS = ['Overview', 'Posts', 'Audience', 'Acquisition'];
const RANGES = [
  ['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['12m', '12 months'], ['custom', 'Custom'],
];

const fmt = (value) => new Intl.NumberFormat('en', { notation: Number(value) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value) || 0);

function Delta({ value }) {
  const number = Number(value) || 0;
  return (
    <span className="text-[11px] font-semibold" style={{ color: number > 0 ? '#22c55e' : number < 0 ? '#f87171' : 'var(--text-faint)' }}>
      {number > 0 ? '↑' : number < 0 ? '↓' : '—'} {Math.abs(number)}% vs previous
    </span>
  );
}

function MetricCard({ label, value, change, suffix = '', definition, accent = '#9b7bf7' }) {
  return (
    <div className="rounded-2xl border p-5 min-w-0" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }} title={definition}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}66` }} />
      </div>
      <p className="text-[26px] leading-none font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{fmt(value)}{suffix}</p>
      <Delta value={change} />
    </div>
  );
}

function TrendChart({ labels = [], values = [], color = '#9b7bf7', chartRef }) {
  const width = 900;
  const height = 260;
  const pad = 42;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1),
    y: height - pad - (Number(value) / max) * (height - pad * 2),
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = points.length ? `${line} L ${points.at(-1).x} ${height - pad} L ${points[0].x} ${height - pad} Z` : '';
  const labelIndexes = labels.map((_, index) => index).filter(index => index === 0 || index === labels.length - 1 || index % Math.ceil(labels.length / 6) === 0);

  return (
    <div className="overflow-x-auto">
      <svg ref={chartRef} viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px]" role="img" aria-label="Analytics trend chart">
        {[0, .25, .5, .75, 1].map(fraction => {
          const y = height - pad - fraction * (height - pad * 2);
          return <g key={fraction}><line x1={pad} y1={y} x2={width - pad} y2={y} stroke="var(--border-default)" /><text x={pad - 8} y={y + 4} textAnchor="end" fill="var(--text-faint)" fontSize="10">{fmt(max * fraction)}</text></g>;
        })}
        {area && <path d={area} fill={color} opacity=".1" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point, index) => <circle key={labels[index]} cx={point.x} cy={point.y} r="3" fill={color}><title>{labels[index]}: {values[index]}</title></circle>)}
        {labelIndexes.map(index => <text key={labels[index]} x={points[index]?.x || pad} y={height - 12} textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'} fill="var(--text-faint)" fontSize="10">{new Date(`${labels[index]}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>)}
      </svg>
    </div>
  );
}

function Breakdown({ title, rows = [], empty = 'No data yet' }) {
  const max = Math.max(...rows.map(row => Number(row.value)), 1);
  return (
    <section className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
      <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {rows.length ? <div className="space-y-4">{rows.map(row => (
        <div key={row.label || 'Unknown'}>
          <div className="flex justify-between text-[12px] mb-1.5"><span style={{ color: 'var(--text-body)' }}>{row.label || 'Unknown'}</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(row.value)}</span></div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}><div className="h-full rounded-full bg-[#9b7bf7]" style={{ width: `${Math.max(3, (Number(row.value) / max) * 100)}%` }} /></div>
        </div>
      ))}</div> : <p className="text-[13px] py-10 text-center" style={{ color: 'var(--text-faint)' }}>{empty}</p>}
    </section>
  );
}

function CollectingNotice() {
  return (
    <div className="rounded-xl border px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(155,123,247,.07)', borderColor: 'rgba(155,123,247,.22)' }}>
      <ion-icon name="hourglass-outline" style={{ color: '#9b7bf7', fontSize: '18px', marginTop: 1 }} />
      <div><p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Dimensional analytics are collecting</p><p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Historical totals remain available. Audience, device, country, source, completion, and share insights fill in from this deployment onward.</p></div>
    </div>
  );
}

export default function StatsPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('Overview');
  const [range, setRange] = useState('30d');
  const [scope, setScope] = useState('personal');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [orgs, setOrgs] = useState([]);
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('views');
  const [postQuery, setPostQuery] = useState('');
  const [postSort, setPostSort] = useState('views');
  const chartRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/orgs').then(response => response.ok ? response.json() : null).then(result => setOrgs(result?.orgs || [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || (range === 'custom' && (!customFrom || !customTo))) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ range, scope });
    if (range === 'custom') { params.set('from', customFrom); params.set('to', customTo); }
    setFetching(true);
    setError('');
    fetch(`/api/stats/overview?${params}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not load analytics');
        return result;
      })
      .then(setData)
      .catch(fetchError => { if (fetchError.name !== 'AbortError') setError(fetchError.message); })
      .finally(() => setFetching(false));
    return () => controller.abort();
  }, [user, range, scope, customFrom, customTo]);

  const posts = useMemo(() => (data?.posts || [])
    .filter(post => post.title.toLowerCase().includes(postQuery.toLowerCase()))
    .sort((a, b) => Number(b[postSort]) - Number(a[postSort])), [data, postQuery, postSort]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Current', 'Previous', 'Change %'],
      ...Object.keys(data.totals).map(key => [key, data.totals[key], data.previous[key] ?? '', data.changes[key] ?? '']),
      [], ['Post', 'Views', 'Unique visitors', 'Reads', 'Average progress %', 'Engagement rate %'],
      ...posts.map(post => [post.title, post.views, post.uniqueVisitors, post.reads, post.avgReadProgress, post.engagementRate]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `lixblogs-analytics-${range}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPNG = () => {
    const svg = chartRef.current;
    if (!svg) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 520;
      const context = canvas.getContext('2d'); context.fillStyle = '#0b0b0f'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = `lixblogs-${metric}-${range}.png`; link.click();
    };
    image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))))}`;
  };

  if (loading || !user) return <AppShell><div className="max-w-6xl mx-auto px-5 py-10"><div className="h-10 w-40 rounded-lg animate-pulse bg-[var(--bg-elevated)]" /></div></AppShell>;

  const totals = data?.totals || {};
  const definitions = data?.definitions || {};

  return (
    <AppShell>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7">
          <div><p className="text-[11px] uppercase tracking-[.18em] font-semibold text-[#9b7bf7] mb-2">Creator dashboard</p><h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1><p className="text-[13px] mt-2" style={{ color: 'var(--text-muted)' }}>Understand reach, reading quality, audience, and growth.</p></div>
          <div className="flex flex-wrap gap-2">
            <select value={scope} onChange={event => setScope(event.target.value)} className="rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--bg-surface)', color: 'var(--text-body)', border: '1px solid var(--border-default)' }} aria-label="Analytics scope"><option value="personal">Personal</option>{orgs.map(org => <option key={org.id} value={`org:${org.id}`}>{org.name}</option>)}</select>
            <button onClick={exportCSV} disabled={!data} className="rounded-lg px-3 py-2 text-[12px] border disabled:opacity-40" style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)', background: 'var(--bg-surface)' }}><ion-icon name="download-outline" /> CSV</button>
            <button onClick={exportPNG} disabled={!data} className="rounded-lg px-3 py-2 text-[12px] border disabled:opacity-40" style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)', background: 'var(--bg-surface)' }}><ion-icon name="image-outline" /> PNG</button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <nav className="flex overflow-x-auto" aria-label="Analytics sections">{TABS.map(item => <button key={item} onClick={() => setTab(item)} className="px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2" style={{ color: tab === item ? '#9b7bf7' : 'var(--text-muted)', borderColor: tab === item ? '#9b7bf7' : 'transparent' }}>{item}</button>)}</nav>
          <div className="flex items-center gap-1.5 pb-3 md:pb-0 overflow-x-auto">{RANGES.map(([value, label]) => <button key={value} onClick={() => setRange(value)} className="px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap" style={{ background: range === value ? '#9b7bf720' : 'transparent', color: range === value ? '#9b7bf7' : 'var(--text-faint)' }}>{label}</button>)}</div>
        </div>

        {range === 'custom' && <div className="flex flex-wrap gap-3 mb-5"><label className="text-[12px]" style={{ color: 'var(--text-muted)' }}>From <input type="date" value={customFrom} onChange={event => setCustomFrom(event.target.value)} className="ml-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }} /></label><label className="text-[12px]" style={{ color: 'var(--text-muted)' }}>To <input type="date" value={customTo} onChange={event => setCustomTo(event.target.value)} className="ml-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }} /></label></div>}

        {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 text-red-300 px-4 py-3 text-[13px] mb-5 flex justify-between"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
        {data?.dimensionsCollecting && <div className="mb-5"><CollectingNotice /></div>}

        {fetching ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 rounded-2xl animate-pulse bg-[var(--bg-elevated)]" />)}</div> : data && <>
          {tab === 'Overview' && <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard label="Views" value={totals.views} change={data.changes.views} definition={definitions.views} />
              <MetricCard label="Unique visitors" value={totals.uniqueVisitors} change={data.changes.uniqueVisitors} definition={definitions.uniqueVisitors} accent="#60a5fa" />
              <MetricCard label="Reads" value={totals.reads} change={data.changes.reads} definition={definitions.reads} accent="#4ade80" />
              <MetricCard label="Completion" value={totals.completionRate} suffix="%" change={data.changes.completionRate} definition={definitions.completionRate} accent="#f59e0b" />
              <MetricCard label="Avg. reading depth" value={totals.avgReadProgress} suffix="%" change={data.changes.avgReadProgress} definition={definitions.avgReadProgress} accent="#22d3ee" />
              <MetricCard label="Engagement rate" value={totals.engagementRate} suffix="%" change={data.changes.engagementRate} definition={definitions.engagementRate} accent="#f472b6" />
              <MetricCard label="Followers gained" value={totals.followers} change={data.changes.followers} definition={definitions.followers} accent="#a78bfa" />
              <MetricCard label="Published posts" value={totals.published} change={0} accent="#94a3b8" />
            </div>
            <section className="rounded-2xl border p-4 sm:p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between mb-4"><div><h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Performance over time</h2><p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>Daily totals in the selected period</p></div><select value={metric} onChange={event => setMetric(event.target.value)} className="rounded-lg px-3 py-1.5 text-[12px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-body)' }}><option value="views">Views</option><option value="reads">Reads</option></select></div>
              <TrendChart chartRef={chartRef} labels={data.trend.labels} values={data.trend[metric]} color={metric === 'views' ? '#9b7bf7' : '#4ade80'} />
            </section>
            <div className="grid md:grid-cols-2 gap-4"><Breakdown title="Engagement" rows={[['Likes', totals.likes], ['Comments', totals.comments], ['Bookmarks', totals.bookmarks], ['Shares', totals.shares], ['Claps', totals.claps]].map(([label, value]) => ({ label, value }))} /><Breakdown title="Conversion funnel" rows={data.funnel} /></div>
          </div>}

          {tab === 'Posts' && <section className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="p-4 border-b flex flex-wrap gap-3 justify-between" style={{ borderColor: 'var(--border-default)' }}><input value={postQuery} onChange={event => setPostQuery(event.target.value)} placeholder="Search posts" className="rounded-lg px-3 py-2 text-[12px] min-w-[220px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }} /><select value={postSort} onChange={event => setPostSort(event.target.value)} className="rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-body)' }}><option value="views">Sort: views</option><option value="reads">Sort: reads</option><option value="avgReadProgress">Sort: reading depth</option><option value="engagementRate">Sort: engagement</option></select></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{['Post', 'Views', 'Unique', 'Reads', 'Depth', 'Engagement'].map(label => <th key={label} className="px-4 py-3 font-semibold text-right first:text-left">{label}</th>)}</tr></thead><tbody>{posts.map(post => <tr key={post.id} className="border-t" style={{ borderColor: 'var(--border-default)' }}><td className="px-4 py-4"><p className="text-[13px] font-medium max-w-[300px] truncate" style={{ color: 'var(--text-primary)' }}>{post.title}</p><p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>{post.publishedAt ? new Date(post.publishedAt * 1000).toLocaleDateString() : 'Draft'}</p></td><td className="px-4 py-4 text-right text-[12px]">{fmt(post.views)}</td><td className="px-4 py-4 text-right text-[12px]">{fmt(post.uniqueVisitors)}</td><td className="px-4 py-4 text-right text-[12px]">{fmt(post.reads)}</td><td className="px-4 py-4 text-right text-[12px]">{post.avgReadProgress}%</td><td className="px-4 py-4 text-right text-[12px]">{post.engagementRate}%</td></tr>)}</tbody></table>{!posts.length && <p className="text-center py-16 text-[13px]" style={{ color: 'var(--text-faint)' }}>No matching published posts.</p>}</div>
          </section>}

          {tab === 'Audience' && <div className="space-y-5"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><MetricCard label="New readers" value={data.audience.newReaders} change={0} accent="#4ade80" /><MetricCard label="Returning readers" value={data.audience.returningReaders} change={0} accent="#60a5fa" /><MetricCard label="Signed-in readers" value={data.audience.signedIn} change={0} /><MetricCard label="Anonymous readers" value={data.audience.anonymous} change={0} accent="#94a3b8" /></div><div className="grid md:grid-cols-2 gap-4"><Breakdown title="Devices" rows={data.audience.devices} /><Breakdown title="Countries" rows={data.audience.countries} /></div></div>}

          {tab === 'Acquisition' && <div className="grid md:grid-cols-2 gap-4"><Breakdown title="Traffic sources" rows={data.acquisition.sources} /><Breakdown title="Top referrers" rows={data.acquisition.referrers} /></div>}
        </>}
      </main>
    </AppShell>
  );
}
