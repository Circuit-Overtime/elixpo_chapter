'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import TabBar from '../components/TabBar';
import Link from 'next/link';

const TABS = [
  { label: 'Overview', icon: 'analytics-outline' },
  { label: 'Posts', icon: 'document-text-outline' },
  { label: 'Followers', icon: 'people-outline' },
];

function MiniStatCard({ label, value, icon }) {
  return (
    <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-[var(--text-muted)]xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function LineChart({ data, labels, color, label, height = 200 }) {
  if (!data || data.length === 0 || data.every(v => v === 0)) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5">
        <p className="text-[14px] font-medium text-[var(--text-primary)] mb-4">{label}</p>
        <div className="flex items-center justify-center h-40 text-[13px] text-[var(--text-faint)]">
          No data yet
        </div>
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const padding = 40;
  const chartWidth = 600;
  const chartHeight = height;
  const stepX = (chartWidth - padding * 2) / Math.max(data.length - 1, 1);

  const points = data.map((val, i) => ({
    x: padding + i * stepX,
    y: chartHeight - padding - ((val / max) * (chartHeight - padding * 2)),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  const displayLabels = (labels || []).map(l => {
    const [, m] = l.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(m) - 1] || l;
  });

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5">
      <p className="text-[14px] font-medium text-[var(--text-primary)] mb-4">{label}</p>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartHeight - padding - frac * (chartHeight - padding * 2);
          return (
            <g key={frac}>
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#232d3f" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" fill="#555" fontSize="11">
                {Math.round(max * frac)}
              </text>
            </g>
          );
        })}

        {displayLabels.map((m, i) => (
          <text key={i} x={padding + i * stepX} y={chartHeight - 12} textAnchor="middle" fill="#555" fontSize="11">
            {m}
          </text>
        ))}

        <path d={areaD} fill={color} opacity="0.08" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#141a26" stroke={color} strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}

export default function StatsPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/stats/overview')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [user]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="h-10 w-32 bg-[var(--bg-elevated)] animate-pulse rounded mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-[var(--bg-elevated)] animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-[var(--bg-elevated)] animate-pulse rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <svg className="w-12 h-12 text-[#2a2d3a] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign in to view your stats</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">Track your views, reads, and followers over time.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-full text-sm hover:bg-[#b69aff] transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  const s = stats || { views: 0, reads: 0, likes: 0, followers: 0, published: 0, drafts: 0, comments: 0, following: 0, monthly: { labels: [], views: [], reads: [] }, topPosts: [] };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[var(--text-muted)]xl font-bold text-[var(--text-primary)]">Stats</h1>
          <div className="flex items-center gap-3 text-[13px] text-[var(--text-muted)]">
            <span><strong className="text-[var(--text-primary)]">{s.published}</strong> published</span>
            <span className="text-[#333]">&middot;</span>
            <span><strong className="text-[var(--text-primary)]">{s.drafts}</strong> drafts</span>
          </div>
        </div>

        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {statsLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-[var(--bg-elevated)] animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-[var(--bg-elevated)] animate-pulse rounded-xl" />
          </div>
        ) : (
          <>
            {activeTab === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MiniStatCard
                    label="Views"
                    value={s.views.toLocaleString()}
                    icon={<svg className="w-4 h-4 text-[#9b7bf7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                  />
                  <MiniStatCard
                    label="Reads"
                    value={s.reads.toLocaleString()}
                    icon={<svg className="w-4 h-4 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                  />
                  <MiniStatCard
                    label="Likes"
                    value={s.likes.toLocaleString()}
                    icon={<svg className="w-4 h-4 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                  />
                  <MiniStatCard
                    label="Followers"
                    value={s.followers.toLocaleString()}
                    icon={<svg className="w-4 h-4 text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  />
                </div>

                <LineChart data={s.monthly.views} labels={s.monthly.labels} color="#9b7bf7" label="Views over time" />
                <LineChart data={s.monthly.reads} labels={s.monthly.labels} color="#4ade80" label="Reads over time" />
              </div>
            )}

            {activeTab === 1 && (
              <div>
                {s.topPosts.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_80px_80px_80px] gap-4 px-4 py-2 text-[12px] text-[var(--text-faint)] uppercase tracking-wider font-medium">
                      <span>Post</span>
                      <span className="text-right">Views</span>
                      <span className="text-right">Reads</span>
                      <span className="text-right">Likes</span>
                    </div>
                    {s.topPosts.map(post => (
                      <div key={post.id} className="grid grid-cols-[1fr_80px_80px_80px] gap-4 items-center bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-[14px] text-[var(--text-primary)] font-medium truncate">{post.title || 'Untitled'}</p>
                          {post.publishedAt && (
                            <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
                              {new Date(post.publishedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <p className="text-[14px] text-[var(--text-body)] text-right font-medium">{post.views}</p>
                        <p className="text-[14px] text-[var(--text-body)] text-right font-medium">{post.reads}</p>
                        <p className="text-[14px] text-[var(--text-body)] text-right font-medium">{post.likes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[var(--text-muted)]enter py-16">
                    <svg className="w-16 h-16 text-[#232d3f] mx-auto mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <p className="text-[var(--text-muted)] text-[15px] font-medium mb-1">No post stats yet</p>
                    <p className="text-[var(--text-muted)] text-[13px]">Publish a story to start tracking its performance.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-8 text-[var(--text-muted)]enter">
                    <p className="text-4xl font-bold text-[var(--text-primary)] mb-1">{s.followers.toLocaleString()}</p>
                    <p className="text-[var(--text-muted)] text-[14px]">Followers</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-8 text-[var(--text-muted)]enter">
                    <p className="text-4xl font-bold text-[var(--text-primary)] mb-1">{s.following.toLocaleString()}</p>
                    <p className="text-[var(--text-muted)] text-[14px]">Following</p>
                  </div>
                </div>
                {s.followers === 0 && (
                  <div className="text-[var(--text-muted)]enter py-8">
                    <p className="text-[var(--text-muted)] text-[13px]">Follower growth chart will appear once you have followers.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
