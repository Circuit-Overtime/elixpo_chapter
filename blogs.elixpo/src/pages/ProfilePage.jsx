'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import BannerUploadModal from '../components/BannerUploadModal';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [localBanner, setLocalBanner] = useState(null);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-48 rounded-xl bg-[#1a1d27] animate-pulse mb-20" />
          <div className="h-6 w-48 bg-[#1a1d27] animate-pulse rounded mb-3" />
          <div className="h-4 w-32 bg-[#1a1d27] animate-pulse rounded mb-6" />
          <div className="h-16 w-full bg-[#1a1d27] animate-pulse rounded" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <h2 className="text-xl font-bold text-white mb-2">Sign in to view your profile</h2>
          <p className="text-[#777] text-sm mb-6">Your profile, blogs, and activity will appear here.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#e8e8e8] text-[#030712] font-semibold rounded-full text-sm hover:bg-white transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  const bannerSrc = localBanner || (user.banner_r2_key ? `/api/media/${user.banner_r2_key}` : null);

  async function handleBannerSave(blob) {
    if (!blob) {
      // Remove banner
      setLocalBanner(null);
      // TODO: API call to remove banner
      setShowBannerModal(false);
      return;
    }

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(blob);
    setLocalBanner(previewUrl);
    setShowBannerModal(false);

    // TODO: Upload blob to /api/users/me/banner
    // const formData = new FormData();
    // formData.append('banner', blob, 'banner.webp');
    // await fetch('/api/users/me/banner', { method: 'POST', body: formData });
    // refetchUser();
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Banner + Avatar */}
        <div className="relative mb-16">
          <div className="group w-full h-48 rounded-xl bg-[#1a1d27] overflow-hidden relative">
            {bannerSrc && (
              <img src={bannerSrc} alt="" className="w-full h-full object-cover" />
            )}
            {/* Edit banner overlay */}
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
              <img src={user.avatar_url} alt="" className="h-24 w-24 rounded-full border-4 border-[#030712] object-cover" />
            ) : (
              <div className="h-24 w-24 rounded-full border-4 border-[#030712] bg-[#2a2d3a] flex items-center justify-center text-3xl text-[#b0b0b0] font-bold">
                {(user.display_name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{user.display_name || user.username}</h1>
            <p className="text-[#777] text-sm mt-0.5">@{user.username}</p>
          </div>
          <Link
            href="/settings"
            className="px-4 py-2 text-[13px] font-medium text-[#b0b0b0] bg-[#0d1117] border border-[#1a1d27] rounded-lg hover:text-white hover:border-[#333] transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {user.bio && (
          <p className="text-[#c8c8c8] text-[15px] leading-relaxed mb-6">{user.bio}</p>
        )}

        <div className="flex items-center gap-6 text-[14px] text-[#777] mb-8">
          <span><strong className="text-[#e0e0e0]">0</strong> Followers</span>
          <span><strong className="text-[#e0e0e0]">0</strong> Following</span>
        </div>

        <div className="h-px bg-[#1a1d27] mb-8" />

        {/* Blog tabs */}
        <div className="flex gap-6 border-b border-[#1a1d27] mb-8">
          <button className="pb-3 text-[14px] font-medium text-white border-b-2 border-white">Published</button>
          <button className="pb-3 text-[14px] font-medium text-[#777] border-b-2 border-transparent hover:text-[#b0b0b0] transition-colors">Drafts</button>
        </div>

        {/* Empty state */}
        <div className="text-center py-16">
          <p className="text-[#777] text-sm">No published blogs yet.</p>
          <Link href="/new-blog" className="inline-block mt-4 px-5 py-2 text-[13px] font-medium text-[#030712] bg-[#e8e8e8] hover:bg-white rounded-full transition-colors">
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
