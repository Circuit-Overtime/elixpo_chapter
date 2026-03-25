'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/AppShell';
import Link from 'next/link';

const TABS = ['Account', 'Publisher', 'Notifications', 'Organization'];

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="h-10 w-40 bg-[#1a1d27] animate-pulse rounded mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[#1a1d27] animate-pulse rounded" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <h2 className="text-xl font-bold text-white mb-2">Sign in to access settings</h2>
          <p className="text-[#777] text-sm mb-6">Manage your account, profile, and preferences.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#e8e8e8] text-[#030712] font-semibold rounded-full text-sm hover:bg-white transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[#1a1d27] mb-8">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`pb-3 text-[14px] font-medium border-b-2 transition-colors ${
                i === activeTab
                  ? 'text-white border-white'
                  : 'text-[#777] border-transparent hover:text-[#b0b0b0]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Account Settings */}
        {activeTab === 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between py-3">
              <span className="text-[15px] text-[#e0e0e0]">Email</span>
              <span className="text-[15px] text-[#777]">{user.email}</span>
            </div>
            <div className="h-px bg-[#1a1d27]" />

            <div className="flex items-center justify-between py-3">
              <span className="text-[15px] text-[#e0e0e0]">Username</span>
              <span className="text-[15px] text-[#777]">@{user.username}</span>
            </div>
            <div className="h-px bg-[#1a1d27]" />

            <div className="flex items-center justify-between py-3">
              <span className="text-[15px] text-[#e0e0e0]">Display Name</span>
              <span className="text-[15px] text-[#777]">{user.display_name || 'Not set'}</span>
            </div>
            <div className="h-px bg-[#1a1d27]" />

            <div className="flex items-center justify-between py-3">
              <span className="text-[15px] text-[#e0e0e0]">Locale</span>
              <span className="text-[15px] text-[#777]">{user.locale || 'en'}</span>
            </div>
            <div className="h-px bg-[#1a1d27]" />

            <div className="py-3">
              <label className="block text-[15px] text-[#e0e0e0] mb-2">Bio</label>
              <textarea
                value={bio || user.bio || ''}
                onChange={(e) => { setBio(e.target.value); setSaved(false); }}
                rows={4}
                className="w-full bg-[#0d1117] border border-[#1a1d27] rounded-lg p-3 text-[14px] text-[#c8c8c8] resize-none focus:outline-none focus:border-[#333] transition-colors placeholder-[#555]"
                placeholder="Tell readers about yourself..."
              />
              {saved && <p className="text-[#4ade80] text-[13px] mt-2">Changes saved!</p>}
            </div>
            <div className="h-px bg-[#1a1d27]" />

            <div className="flex items-center justify-between py-3">
              <span className="text-[15px] text-[#e0e0e0]">LixBlogs Digest</span>
              <div className="flex gap-2">
                {['Daily', 'Weekly', 'Monthly'].map((freq) => (
                  <button
                    key={freq}
                    className="px-3 py-1 text-[13px] rounded-full border border-[#1a1d27] text-[#777] hover:text-white hover:border-[#333] transition-colors"
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-12 space-y-3">
              <button className="text-[14px] text-red-400 hover:text-red-300 transition-colors">
                Disable Account
              </button>
              <br />
              <button className="text-[14px] text-red-400 hover:text-red-300 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="text-center py-16">
            <p className="text-[#777] text-sm">Publisher settings coming soon.</p>
          </div>
        )}

        {activeTab === 2 && (
          <div className="text-center py-16">
            <p className="text-[#777] text-sm">Notification preferences coming soon.</p>
          </div>
        )}

        {activeTab === 3 && (
          <div className="text-center py-16">
            <p className="text-[#777] text-sm">Organization settings coming soon.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
