'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import Link from 'next/link';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TABS = ['Overview', 'Posts', 'Followers'];

// Placeholder data — replace with API calls
const MOCK_MONTHLY = [12, 28, 45, 38, 62, 55, 78, 94, 85, 110, 98, 0];
const MOCK_READS = [8, 18, 30, 25, 40, 35, 55, 68, 60, 82, 70, 0];

function MiniStatCard({ label, value, icon, trend }) {
  return (
    <div className="flex-1 bg-[#141a26] border border-[#232d3f] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#232d3f] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[13px] text-[#9ca3af]">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {trend !== undefined && (
        <p className={`text-[12px] mt-1 ${trend >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}% from last month
        </p>
      )}
    </div>
  );
}

function LineChart({ data, color, label, height = 200 }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const padding = 40;
  const chartWidth = 600;
  const chartHeight = height;
  const stepX = (chartWidth - padding * 2) / (data.length - 1);

  const points = data.map((val, i) => ({
    x: padding + i * stepX,
    y: chartHeight - padding - ((val / max) * (chartHeight - padding * 2)),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  return (
    <div className="bg-[#141a26] border border-[#232d3f] rounded-xl p-5">
      <p className="text-[14px] font-medium text-[#e0e0e0] mb-4">{label}</p>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
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

        {/* X labels */}
        {MONTHS.map((m, i) => (
          <text
            key={m}
            x={padding + i * stepX}
            y={chartHeight - 12}
            textAnchor="middle"
            fill="#555"
            fontSize="11"
          >
            {m}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaD} fill={color} opacity="0.08" />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
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

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="h-10 w-32 bg-[#232d3f] animate-pulse rounded mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-[#232d3f] animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-[#232d3f] animate-pulse rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <svg className="w-12 h-12 text-[#2a2d3a] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <h2 className="text-xl font-bold text-white mb-2">Sign in to view your stats</h2>
          <p className="text-[#9ca3af] text-sm mb-6">Track your views, reads, and followers over time.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#9b7bf7] text-white font-semibold rounded-full text-sm hover:bg-[#b69aff] transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">Stats</h1>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[#232d3f] mb-8">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`pb-3 text-[14px] font-medium border-b-2 transition-colors ${
                i === activeTab
                  ? 'text-white border-white'
                  : 'text-[#9ca3af] border-transparent hover:text-[#b0b0b0]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniStatCard
                label="Views"
                value="0"
                trend={0}
                icon={<svg className="w-4 h-4 text-[#9b7bf7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
              />
              <MiniStatCard
                label="Reads"
                value="0"
                trend={0}
                icon={<svg className="w-4 h-4 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
              />
              <MiniStatCard
                label="Likes"
                value="0"
                trend={0}
                icon={<svg className="w-4 h-4 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
              />
              <MiniStatCard
                label="Followers"
                value="0"
                trend={0}
                icon={<svg className="w-4 h-4 text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              />
            </div>

            {/* Views chart */}
            <LineChart
              data={MOCK_MONTHLY}
              color="#9b7bf7"
              label="Views over time"
            />

            {/* Reads chart */}
            <LineChart
              data={MOCK_READS}
              color="#4ade80"
              label="Reads over time"
            />
          </div>
        )}

        {activeTab === 1 && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-[#232d3f] mx-auto mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-[#9ca3af] text-[15px] font-medium mb-1">No post stats yet</p>
            <p className="text-[#8896a8] text-[13px]">Publish a story to start tracking its performance.</p>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="bg-[#141a26] border border-[#232d3f] rounded-xl p-8 text-center">
              <p className="text-4xl font-bold text-white mb-1">0</p>
              <p className="text-[#9ca3af] text-[14px]">Total followers</p>
            </div>
            <div className="text-center py-8">
              <p className="text-[#8896a8] text-[13px]">Follower growth chart will appear once you have followers.</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
