'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import TabBar from '../components/TabBar';
import BannerUploadModal from '../components/BannerUploadModal';
import Link from 'next/link';

function UsageBar({ label, used, limit, unit, color = '#9b7bf7' }) {
  const percent = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-[#b0b0b0]">{label}</span>
        <span className="text-[13px] text-[#e0e0e0] font-medium">
          {used}{unit ? ` ${unit}` : ''} <span className="text-[#666]">/ {limit}{unit ? ` ${unit}` : ''}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#1e2433] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: percent > 85 ? '#f87171' : color }}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [localBanner, setLocalBanner] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/tier/usage')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUsage(data); })
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [user]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-48 rounded-xl bg-[#232d3f] animate-pulse mb-20" />
          <div className="h-6 w-48 bg-[#232d3f] animate-pulse rounded mb-3" />
          <div className="h-4 w-32 bg-[#232d3f] animate-pulse rounded mb-6" />
          <div className="h-16 w-full bg-[#232d3f] animate-pulse rounded" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <h2 className="text-xl font-bold text-white mb-2">Sign in to view your profile</h2>
          <p className="text-[#9ca3af] text-sm mb-6">Your profile, blogs, and activity will appear here.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#9b7bf7] text-white font-semibold rounded-full text-sm hover:bg-[#b69aff] transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  const bannerSrc = localBanner || (user.banner_r2_key ? `/api/media/${user.banner_r2_key}` : null);

  async function handleBannerSave(blob) {
    if (!blob) {
      setLocalBanner(null);
      setShowBannerModal(false);
      return;
    }

    const previewUrl = URL.createObjectURL(blob);
    setLocalBanner(previewUrl);
    setShowBannerModal(false);
  }

  const tierLabel = usage?.tier === 'member' ? 'Member' : 'Free';
  const tierColor = usage?.tier === 'member' ? '#a78bfa' : '#9ca3af';

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Banner + Avatar */}
        <div className="relative mb-16">
          <div className="group w-full h-48 rounded-xl bg-[#232d3f] overflow-hidden relative">
            {bannerSrc && (
              <img src={bannerSrc} alt="" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => setShowBannerModal(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 px-4 py-2 bg-black/60 rounded-lg text-[13px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {bannerSrc ? 'Change Banner' : 'Add Banner'}
              </span>
            </button>
          </div>
          <div className="absolute -bottom-12 left-6">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-24 w-24 rounded-full border-4 border-[#131922] object-cover" />
            ) : (
              <div className="h-24 w-24 rounded-full border-4 border-[#131922] bg-[#2a2d3a] flex items-center justify-center text-3xl text-[#b0b0b0] font-bold">
                {(user.display_name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{user.display_name || user.username}</h1>
            <p className="text-[#9ca3af] text-sm mt-0.5">@{user.username}</p>
          </div>
          <Link
            href="/settings"
            className="px-4 py-2 text-[13px] font-medium text-[#b0b0b0] bg-[#141a26] border border-[#232d3f] rounded-lg hover:text-white hover:border-[#333] transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {user.bio && (
          <p className="text-[#c8c8c8] text-[15px] leading-relaxed mb-6">{user.bio}</p>
        )}

        <div className="flex items-center gap-6 text-[14px] text-[#9ca3af] mb-8">
          <span><strong className="text-[#e0e0e0]">0</strong> Followers</span>
          <span><strong className="text-[#e0e0e0]">0</strong> Following</span>
        </div>

        <div className="h-px bg-[#232d3f] mb-8" />

        {/* Subscription & Usage */}
        <div className="mb-8">
          <h2 className="text-[16px] font-semibold text-white mb-4">Subscription</h2>
          {usageLoading ? (
            <div className="bg-[#141a26] border border-[#232d3f] rounded-xl p-5 space-y-3">
              <div className="h-5 w-28 bg-[#232d3f] animate-pulse rounded" />
              <div className="h-2 w-full bg-[#232d3f] animate-pulse rounded-full" />
              <div className="h-2 w-full bg-[#232d3f] animate-pulse rounded-full" />
            </div>
          ) : usage ? (
            <div className="bg-[#141a26] border border-[#232d3f] rounded-xl p-5 space-y-5">
              {/* Tier badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wide"
                    style={{ background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}33` }}
                  >
                    {tierLabel}
                  </div>
                  <span className="text-[13px] text-[#8896a8]">Current plan</span>
                </div>
                {usage.tier === 'free' && (
                  <button className="px-3 py-1.5 text-[12px] font-medium text-[#a78bfa] bg-[#a78bfa12] border border-[#a78bfa25] rounded-lg hover:bg-[#a78bfa20] transition-colors">
                    Upgrade
                  </button>
                )}
              </div>

              {/* AI usage */}
              <UsageBar
                label="AI requests today"
                used={usage.ai.used}
                limit={usage.ai.limit}
                color="#a78bfa"
              />

              {/* Storage */}
              <UsageBar
                label="Storage used"
                used={usage.storage.usedFormatted}
                limit={usage.storage.limitFormatted}
                color="#60a5fa"
              />

              {/* Limits summary */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2 text-[12px] text-[#8896a8]">
                  <svg className="w-3.5 h-3.5 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Co-authors: {usage.limits.coAuthorsPerBlog}/blog
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#8896a8]">
                  <svg className="w-3.5 h-3.5 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Orgs: {usage.orgs.owned}/{usage.orgs.limit}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#8896a8]">
                  <svg className="w-3.5 h-3.5 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Images: {usage.limits.imagePerBlogFormatted}/blog
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#8896a8]">
                  <svg className="w-3.5 h-3.5 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI: {usage.ai.limit} req/day
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#141a26] border border-[#232d3f] rounded-xl p-5 text-center">
              <p className="text-[13px] text-[#8896a8]">Unable to load subscription info</p>
            </div>
          )}
        </div>

        <div className="h-px bg-[#232d3f] mb-8" />

        <TabBar
          tabs={[
            { label: 'Published', icon: 'globe-outline' },
            { label: 'Drafts', icon: 'document-outline' },
          ]}
          active={0}
          onChange={() => {}}
        />

        {/* Empty state */}
        <div className="text-center py-16">
          <p className="text-[#9ca3af] text-sm">No published blogs yet.</p>
          <Link href="/new-blog" className="inline-block mt-4 px-5 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#b69aff] rounded-full transition-colors">
            Write your first blog
          </Link>
        </div>
      </div>

      {/* Banner Upload Modal */}
      {showBannerModal && (
        <BannerUploadModal
          onSave={handleBannerSave}
          onClose={() => setShowBannerModal(false)}
          currentBanner={bannerSrc}
        />
      )}
    </AppShell>
  );
}
