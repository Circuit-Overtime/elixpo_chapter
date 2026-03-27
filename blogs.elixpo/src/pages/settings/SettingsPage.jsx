'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/AppShell';
import Link from 'next/link';

const TABS = ['Account', 'Publishing', 'Notifications', 'Organization', 'Subscription'];

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#9b7bf7]' : 'bg-[#232d3f]'}`}
    >
      <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-[22px]' : 'left-[3px]'}`} />
    </button>
  );
}

function SettingRow({ title, description, right, border = true }) {
  return (
    <>
      <div className="flex items-start justify-between py-4 gap-6">
        <div className="min-w-0">
          <p className="text-[14px] text-[#e0e0e0] font-medium">{title}</p>
          {description && <p className="text-[12px] text-[#8896a8] mt-0.5 leading-relaxed">{description}</p>}
        </div>
        <div className="flex-shrink-0">{right}</div>
      </div>
      {border && <div className="h-px bg-[#232d3f]" />}
    </>
  );
}

function SectionHeader({ title }) {
  return <h3 className="text-[13px] font-bold text-[#e0e0e0] uppercase tracking-wider mt-8 mb-2">{title}</h3>;
}

function DropdownSelect({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#141a26] border border-[#232d3f] rounded-lg px-3 py-1.5 text-[13px] text-[#b0b0b0] outline-none focus:border-[#333] transition-colors cursor-pointer appearance-none pr-8"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ── Account Tab ──
function AccountTab({ user }) {
  const [bio, setBio] = useState(user.bio || '');
  const [saved, setSaved] = useState(false);
  const [digestFreq, setDigestFreq] = useState('daily');

  return (
    <div>
      <SettingRow
        title="Email"
        right={<span className="text-[14px] text-[#9ca3af]">{user.email}</span>}
      />
      <SettingRow
        title="Username"
        right={<span className="text-[14px] text-[#9ca3af]">@{user.username}</span>}
      />
      <SettingRow
        title="Display Name"
        right={<span className="text-[14px] text-[#9ca3af]">{user.display_name || 'Not set'}</span>}
      />
      <SettingRow
        title="Locale"
        right={<span className="text-[14px] text-[#9ca3af]">{user.locale || 'en'}</span>}
      />

      <div className="py-4">
        <label className="block text-[14px] text-[#e0e0e0] font-medium mb-2">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => { setBio(e.target.value); setSaved(false); }}
          rows={3}
          className="w-full bg-[#141a26] border border-[#232d3f] rounded-lg p-3 text-[14px] text-[#c8c8c8] resize-none focus:outline-none focus:border-[#333] transition-colors placeholder-[#6b7a8d]"
          placeholder="Tell readers about yourself..."
        />
        {saved && <p className="text-[#4ade80] text-[12px] mt-1.5">Changes saved!</p>}
      </div>
      <div className="h-px bg-[#232d3f]" />

      <SettingRow
        title="LixBlogs Digest"
        description="How often you receive our curated digest email."
        right={
          <div className="flex gap-1.5">
            {['daily', 'weekly', 'monthly'].map((f) => (
              <button
                key={f}
                onClick={() => setDigestFreq(f)}
                className={`px-3 py-1 text-[12px] rounded-full border transition-colors capitalize ${
                  digestFreq === f
                    ? 'border-white text-white'
                    : 'border-[#232d3f] text-[#9ca3af] hover:text-[#b0b0b0] hover:border-[#333]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-12 space-y-3">
        <button className="text-[13px] text-red-400 hover:text-red-300 transition-colors">Disable Account</button>
        <br />
        <button className="text-[13px] text-red-400 hover:text-red-300 transition-colors">Delete Account</button>
      </div>
    </div>
  );
}

// ── Publishing Tab ──
function PublishingTab({ user }) {
  const [privateNotes, setPrivateNotes] = useState(true);
  const [tipping, setTipping] = useState(false);
  const [emailReplies, setEmailReplies] = useState(false);
  const [replyTo, setReplyTo] = useState(user.email || '');
  const [license, setLicense] = useState('all-rights');

  return (
    <div>
      <SettingRow
        title="Manage publications"
        description="Create and manage your publications on LixBlogs."
        right={
          <Link href="/settings/publisher" className="text-[13px] text-[#9b7bf7] hover:text-[#b69aff] transition-colors font-medium">
            Manage
          </Link>
        }
      />

      <SettingRow
        title="Allow readers to leave private notes on your stories"
        description="Private notes are visible to you and (if left in a publication) all Editors of the publication."
        right={<Toggle checked={privateNotes} onChange={setPrivateNotes} />}
      />

      <SettingRow
        title="Manage tipping on your stories"
        description="Readers can send you tips through the third-party platform of your choice."
        right={
          <span className="text-[13px] text-[#9ca3af]">{tipping ? 'Enabled' : 'Disabled'}</span>
        }
      />

      <SettingRow
        title="Default content license"
        description="Applied to new stories unless overridden per-post."
        right={
          <DropdownSelect
            value={license}
            onChange={setLicense}
            options={[
              { value: 'all-rights', label: 'All Rights Reserved' },
              { value: 'cc-by', label: 'CC BY 4.0' },
              { value: 'cc-by-sa', label: 'CC BY-SA 4.0' },
              { value: 'cc-by-nc', label: 'CC BY-NC 4.0' },
              { value: 'cc0', label: 'Public Domain (CC0)' },
            ]}
          />
        }
      />

      <div className="h-px bg-[#232d3f] mt-2" />

      <SettingRow
        title="Allow email replies"
        description="Let readers reply to your stories directly from their email."
        right={<Toggle checked={emailReplies} onChange={setEmailReplies} />}
      />

      <SettingRow
        title="'Reply To' email address"
        description="Shown to your subscribers when they reply."
        right={<span className="text-[13px] text-[#9ca3af]">{replyTo}</span>}
      />

      <SettingRow
        title="Import email subscribers"
        description="Upload a CSV or TXT file containing up to 25,000 email addresses."
        right={
          <button className="text-[13px] text-[#9b7bf7] hover:text-[#b69aff] transition-colors font-medium flex items-center gap-1">
            Import
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" /></svg>
          </button>
        }
        border={false}
      />
    </div>
  );
}

// ── Notifications Tab ──
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    digest: true,
    digestFreq: 'daily',
    recommended: true,
    newListStories: true,
    follows: true,
    highlights: true,
    replies: true,
    mentions: 'network',
    publishedActivity: true,
    listActivity: true,
    featureStories: true,
    submissions: true,
    submissionStatus: true,
    newFeatures: true,
    membership: true,
    announcements: true,
    allowEmail: true,
  });

  const update = (key, val) => setPrefs((p) => ({ ...p, [key]: val }));

  return (
    <div>
      <SectionHeader title="Story recommendations" />
      <SettingRow
        title="LixBlogs Digest"
        description="The best stories on LixBlogs personalized based on your interests, as well as outstanding stories selected by our editors."
        right={<Toggle checked={prefs.digest} onChange={(v) => update('digest', v)} />}
      />
      <SettingRow
        title="Your LixBlogs Digest frequency"
        description="Adjust how often you see a new Digest."
        right={
          <DropdownSelect
            value={prefs.digestFreq}
            onChange={(v) => update('digestFreq', v)}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />
        }
      />
      <SettingRow
        title="Recommended reading"
        description="Featured stories, columns, and collections that we think you'll enjoy based on your reading history."
        right={<Toggle checked={prefs.recommended} onChange={(v) => update('recommended', v)} />}
      />

      <SectionHeader title="From writers and publications" />
      <SettingRow
        title="New stories added to lists you've saved"
        right={<Toggle checked={prefs.newListStories} onChange={(v) => update('newListStories', v)} />}
      />

      <SectionHeader title="Social activity" />
      <SettingRow
        title="Follows and matching highlights"
        right={<Toggle checked={prefs.follows} onChange={(v) => update('follows', v)} />}
      />
      <SettingRow
        title="Replies to your responses"
        right={<Toggle checked={prefs.replies} onChange={(v) => update('replies', v)} />}
      />
      <SettingRow
        title="Story mentions"
        right={
          <DropdownSelect
            value={prefs.mentions}
            onChange={(v) => update('mentions', v)}
            options={[
              { value: 'network', label: 'In network' },
              { value: 'everyone', label: 'Everyone' },
              { value: 'off', label: 'Off' },
            ]}
          />
        }
      />

      <SectionHeader title="For writers" />
      <SettingRow
        title="Activity on your published stories"
        right={<Toggle checked={prefs.publishedActivity} onChange={(v) => update('publishedActivity', v)} />}
      />
      <SettingRow
        title="Activity on your lists"
        right={<Toggle checked={prefs.listActivity} onChange={(v) => update('listActivity', v)} />}
      />
      <SettingRow
        title="From editors about featuring your stories"
        right={<Toggle checked={prefs.featureStories} onChange={(v) => update('featureStories', v)} />}
      />

      <SectionHeader title="For publications" />
      <SettingRow
        title="New submissions"
        right={<Toggle checked={prefs.submissions} onChange={(v) => update('submissions', v)} />}
      />

      <SectionHeader title="For submissions" />
      <SettingRow
        title="Submission status changes"
        right={<Toggle checked={prefs.submissionStatus} onChange={(v) => update('submissionStatus', v)} />}
      />

      <SectionHeader title="Others from LixBlogs" />
      <SettingRow
        title="New product features from LixBlogs"
        right={<Toggle checked={prefs.newFeatures} onChange={(v) => update('newFeatures', v)} />}
      />
      <SettingRow
        title="Information about LixBlogs subscription"
        right={<Toggle checked={prefs.membership} onChange={(v) => update('membership', v)} />}
      />
      <SettingRow
        title="Writing updates and announcements"
        right={<Toggle checked={prefs.announcements} onChange={(v) => update('announcements', v)} />}
      />

      <div className="h-px bg-[#232d3f] mt-4" />
      <SettingRow
        title="Allow email notifications"
        description="You'll still receive administrative emails even if this setting is off."
        right={<Toggle checked={prefs.allowEmail} onChange={(v) => update('allowEmail', v)} />}
        border={false}
      />
    </div>
  );
}

// ── Organization Tab ──
function OrganizationTab({ user }) {
  // TODO: fetch user's orgs from API
  const orgs = [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] text-[#e0e0e0] font-semibold">Your Organizations</h3>
          <p className="text-[12px] text-[#8896a8] mt-0.5">Create and manage organizations to publish collaboratively.</p>
        </div>
        <button className="px-4 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#b69aff] rounded-lg transition-colors">
          Create Organization
        </button>
      </div>

      {orgs.length > 0 ? (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="flex items-center gap-4 p-4 bg-[#141a26] border border-[#232d3f] rounded-xl">
              <div className="h-10 w-10 rounded-lg bg-[#232d3f] flex-shrink-0 flex items-center justify-center text-[14px] text-[#9ca3af] font-bold">
                {org.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[#e0e0e0] font-medium truncate">{org.name}</p>
                <p className="text-[12px] text-[#8896a8] truncate">@{org.slug} &middot; {org.role}</p>
              </div>
              <Link href={`/settings/org/${org.slug}`} className="text-[12px] text-[#9b7bf7] hover:text-[#b69aff] transition-colors font-medium">
                Manage
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#141a26] border border-[#232d3f] rounded-xl">
          <svg className="w-12 h-12 text-[#232d3f] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-[#9ca3af] text-[14px] font-medium mb-1">No organizations yet</p>
          <p className="text-[#8896a8] text-[12px] mb-5">Create one to collaborate with others.</p>
          <button className="px-5 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#b69aff] rounded-full transition-colors">
            Create your first organization
          </button>
        </div>
      )}

      <div className="h-px bg-[#232d3f] my-8" />

      <SectionHeader title="Organization Settings" />
      <SettingRow
        title="Default visibility"
        description="New organizations will use this visibility by default."
        right={
          <DropdownSelect
            value="public"
            onChange={() => {}}
            options={[
              { value: 'public', label: 'Public' },
              { value: 'private', label: 'Private' },
            ]}
          />
        }
      />
      <SettingRow
        title="Allow org invitations"
        description="Other users can invite you to join their organizations."
        right={<Toggle checked={true} onChange={() => {}} />}
        border={false}
      />
    </div>
  );
}

// ── Subscription Tab ──
function SubscriptionTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-14 h-14 rounded-full bg-[#9b7bf714] flex items-center justify-center mb-5">
        <ion-icon name="diamond-outline" style={{ fontSize: '28px', color: '#9b7bf7' }} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Subscription</h3>
      <p className="text-[#9ca3af] text-[14px] text-center max-w-sm">Pricing and subscription management is coming soon. Stay tuned for LixBlogs Pro.</p>
    </div>
  );
}

// ── Main Settings Page ──
export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="h-10 w-40 bg-[#232d3f] animate-pulse rounded mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[#232d3f] animate-pulse rounded" />
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
          <p className="text-[#9ca3af] text-sm mb-6">Manage your account, profile, and preferences.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#9b7bf7] text-white font-semibold rounded-full text-sm hover:bg-[#b69aff] transition-colors">
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
        <div className="flex gap-4 border-b border-[#232d3f] mb-8 overflow-x-auto scrollbar-none">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`pb-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                i === activeTab
                  ? 'text-white border-white'
                  : 'text-[#9ca3af] border-transparent hover:text-[#b0b0b0]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && <AccountTab user={user} />}
        {activeTab === 1 && <PublishingTab user={user} />}
        {activeTab === 2 && <NotificationsTab />}
        {activeTab === 3 && <OrganizationTab user={user} />}
        {activeTab === 4 && <SubscriptionTab />}
      </div>
    </AppShell>
  );
}
