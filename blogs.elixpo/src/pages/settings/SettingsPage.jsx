'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { generatePixelAvatar } from '../../utils/pixelAvatar';
import AppShell from '../../components/AppShell';
import TabBar from '../../components/TabBar';
import Link from 'next/link';

const TABS = [
  { label: 'Account', icon: 'person-outline' },
  { label: 'Publishing', icon: 'create-outline' },
  { label: 'Notifications', icon: 'notifications-outline' },
  { label: 'Organization', icon: 'people-outline' },
  { label: 'Subscription', icon: 'diamond-outline' },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#9b7bf7]' : 'bg-[var(--bg-elevated)]'}`}
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
          <p className="text-[14px] text-[var(--text-primary)] font-medium">{title}</p>
          {description && <p className="text-[12px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{description}</p>}
        </div>
        <div className="flex-shrink-0">{right}</div>
      </div>
      {border && <div className="h-px bg-[var(--bg-elevated)]" />}
    </>
  );
}

function SectionHeader({ title }) {
  return <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-wider mt-8 mb-2">{title}</h3>;
}

function DropdownSelect({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-body)] outline-none focus:border-[var(--border-hover)] transition-colors cursor-pointer appearance-none pr-8"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

const TIMEZONES = [
  '', 'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
  'Africa/Cairo', 'Africa/Nairobi', 'Africa/Lagos',
];

const USER_LINK_PRESETS = [
  { key: 'website', label: 'Website', icon: 'globe-outline', placeholder: 'https://example.com' },
  { key: 'github', label: 'GitHub', icon: 'logo-github', placeholder: 'https://github.com/username' },
  { key: 'twitter', label: 'X / Twitter', icon: 'logo-twitter', placeholder: 'https://x.com/username' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', placeholder: 'https://linkedin.com/in/username' },
  { key: 'mastodon', label: 'Mastodon', icon: 'globe-outline', placeholder: 'https://mastodon.social/@user' },
  { key: 'custom', label: 'Custom Link', icon: 'link-outline', placeholder: 'https://...' },
];

// ── Account Tab ──
function AccountTab({ user, refetchUser }) {
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [pronouns, setPronouns] = useState(user.pronouns || '');
  const [location, setLocation] = useState(user.location || '');
  const [timezone, setTimezone] = useState(user.timezone || '');
  const [website, setWebsite] = useState(user.website || '');
  const [company, setCompany] = useState(user.company || '');
  const [links, setLinks] = useState(() => {
    try { const p = JSON.parse(user.links || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addLink = (preset) => setLinks([...links, { type: preset.key, label: preset.label, url: '' }]);
  const updateLink = (i, field, value) => { const u = [...links]; u[i] = { ...u[i], [field]: value }; setLinks(u); };
  const removeLink = (i) => setLinks(links.filter((_, idx) => idx !== i));
  const addedTypes = new Set(links.map(l => l.type));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName, bio, pronouns, location, timezone, website, company,
          links: links.filter(l => l.url?.trim()),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        refetchUser?.();
      }
    } catch {}
    setSaving(false);
  };

  const inputCls = "w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]";

  return (
    <div className="space-y-8">
      {/* ── Identity ── */}
      <section>
        <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-4">Profile</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--border-default)]" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-2xl text-[var(--text-muted)] font-bold ring-2 ring-[var(--border-default)]">
                {(user.display_name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[15px] text-[var(--text-primary)] font-semibold">{user.display_name || user.username}</p>
              <p className="text-[13px] text-[var(--text-faint)]">@{user.username} &middot; {user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Display name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" className={inputCls} />
            </div>
            <div>
              <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Pronouns</label>
              <select value={pronouns} onChange={e => setPronouns(e.target.value)} className={inputCls}>
                <option value="">Don&apos;t specify</option>
                <option value="he/him">he/him</option>
                <option value="she/her">she/her</option>
                <option value="they/them">they/them</option>
                <option value="he/they">he/they</option>
                <option value="she/they">she/they</option>
                <option value="custom">Custom</option>
              </select>
              {pronouns === 'custom' && (
                <input value={pronouns} onChange={e => setPronouns(e.target.value)} placeholder="Your pronouns" className={`${inputCls} mt-2`} />
              )}
            </div>
          </div>

          <div>
            <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Bio</label>
            <p className="text-[11px] text-[var(--text-faint)] mb-2">Tell readers a little about yourself</p>
            <textarea
              value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Developer, writer, creator..."
              maxLength={300}
              className={`${inputCls} resize-none`}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1 text-right">{bio.length}/300</p>
          </div>
        </div>
      </section>

      <div className="h-px bg-[#1e2736]" />

      {/* ── Location & Work ── */}
      <section>
        <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-4">Location & Work</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Location</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><ion-icon name="location-outline" style={{ fontSize: '15px' }} /></span>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" className={`${inputCls} pl-9`} />
            </div>
          </div>
          <div>
            <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Company</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><ion-icon name="business-outline" style={{ fontSize: '15px' }} /></span>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Where you work" className={`${inputCls} pl-9`} />
            </div>
          </div>
          <div>
            <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inputCls}>
              <option value="">Select timezone...</option>
              {TIMEZONES.filter(Boolean).map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Website</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><ion-icon name="globe-outline" style={{ fontSize: '15px' }} /></span>
              <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" className={`${inputCls} pl-9`} />
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-[#1e2736]" />

      {/* ── Social Links ── */}
      <section>
        <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-1">Social Links</h3>
        <p className="text-[11px] text-[var(--text-faint)] mb-4">Add links to your profiles on other platforms.</p>

        {links.length > 0 && (
          <div className="space-y-2.5 mb-4">
            {links.map((link, i) => {
              const preset = USER_LINK_PRESETS.find(p => p.key === link.type) || USER_LINK_PRESETS.at(-1);
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl group">
                  <div className="h-8 w-8 rounded-lg bg-[var(--bg-base)] flex items-center justify-center shrink-0">
                    <ion-icon name={preset.icon} style={{ fontSize: '16px', color: '#7c8a9e' }} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    {link.type === 'custom' && (
                      <input value={link.label || ''} onChange={e => updateLink(i, 'label', e.target.value)} placeholder="Label"
                        className="w-full bg-transparent text-[12px] text-[var(--text-primary)] outline-none placeholder-[var(--text-faint)] font-medium" />
                    )}
                    {link.type !== 'custom' && (
                      <p className="text-[11px] text-[var(--text-faint)] font-medium">{preset.label}</p>
                    )}
                    <input value={link.url || ''} onChange={e => updateLink(i, 'url', e.target.value)} placeholder={preset.placeholder}
                      className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder-[var(--text-faint)]" />
                  </div>
                  <button onClick={() => removeLink(i)} className="text-[var(--text-muted)] hover:text-[#f87171] transition-colors p-1 opacity-0 group-hover:opacity-100">
                    <ion-icon name="trash-outline" style={{ fontSize: '15px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {USER_LINK_PRESETS.map(preset => (
            <button key={preset.key} onClick={() => addLink(preset)}
              disabled={preset.key !== 'custom' && addedTypes.has(preset.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-lg text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2d3a4d] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <ion-icon name={preset.icon} style={{ fontSize: '13px' }} />
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-[#1e2736]" />

      {/* ── Save ── */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-lg text-[13px] hover:bg-[#b69aff] transition-colors disabled:opacity-40">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
        {saved && <span className="text-[12px] text-[#4ade80] flex items-center gap-1"><ion-icon name="checkmark-circle" style={{ fontSize: '14px' }} /> Profile updated</span>}
      </div>

      <div className="h-px bg-[#1e2736]" />

      {/* ── Danger zone ── */}
      <section>
        <h3 className="text-[11px] font-semibold text-[#f8717180] uppercase tracking-widest mb-4">Danger Zone</h3>
        <div className="space-y-2">
          <button className="text-[13px] text-[#f87171]/70 hover:text-[#f87171] transition-colors">Disable Account</button>
          <br />
          <button className="text-[13px] text-[#f87171]/70 hover:text-[#f87171] transition-colors">Delete Account</button>
        </div>
      </section>
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
          <span className="text-[13px] text-[var(--text-muted)]">{tipping ? 'Enabled' : 'Disabled'}</span>
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

      <div className="h-px bg-[var(--bg-elevated)] mt-2" />

      <SettingRow
        title="Allow email replies"
        description="Let readers reply to your stories directly from their email."
        right={<Toggle checked={emailReplies} onChange={setEmailReplies} />}
      />

      <SettingRow
        title="'Reply To' email address"
        description="Shown to your subscribers when they reply."
        right={<span className="text-[13px] text-[var(--text-muted)]">{replyTo}</span>}
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

      <div className="h-px bg-[var(--bg-elevated)] mt-4" />
      <SettingRow
        title="Allow email notifications"
        description="You'll still receive administrative emails even if this setting is off."
        right={<Toggle checked={prefs.allowEmail} onChange={(v) => update('allowEmail', v)} />}
        border={false}
      />
    </div>
  );
}

// Random org name suggestions (GitHub-style)
const ORG_NAME_ADJECTIVES = ['curious', 'bold', 'swift', 'bright', 'calm', 'cool', 'epic', 'kind', 'lucky', 'neat', 'rare', 'wise', 'keen', 'cozy', 'zesty'];
const ORG_NAME_NOUNS = ['panda', 'falcon', 'lotus', 'spark', 'pixel', 'orbit', 'coral', 'cedar', 'flint', 'prism', 'ridge', 'bloom', 'ember', 'drift', 'grove'];

function getRandomOrgNames(count = 3) {
  const names = [];
  const used = new Set();
  while (names.length < count) {
    const adj = ORG_NAME_ADJECTIVES[Math.floor(Math.random() * ORG_NAME_ADJECTIVES.length)];
    const noun = ORG_NAME_NOUNS[Math.floor(Math.random() * ORG_NAME_NOUNS.length)];
    const combo = `${adj}-${noun}`;
    if (!used.has(combo)) { used.add(combo); names.push(combo); }
  }
  return names;
}

// ── Create Org Modal ──
function CreateOrgModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [category, setCategory] = useState('');
  const [bioPreview, setBioPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [suggestions] = useState(() => getRandomOrgNames(3));
  const [avatarSeed] = useState(() => `org-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    if (name) {
      setSlug(name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40));
    }
  }, [name]);

  // Check slug availability (debounced)
  const [slugError, setSlugError] = useState('');
  useEffect(() => {
    if (!slug || slug.length < 2) { setSlugAvailable(null); setSlugError(''); return; }
    const timer = setTimeout(() => {
      fetch(`/api/check-name?name=${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then(d => {
          setSlugAvailable(d.available);
          setSlugError(d.available ? '' : (d.error || 'Already taken'));
        })
        .catch(() => { setSlugAvailable(null); setSlugError(''); });
    }, 800);
    return () => clearTimeout(timer);
  }, [slug]);

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim() || creating) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug, description, bio, website, visibility: 'public' }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated?.(data);
        onClose();
      } else {
        setError(data.error || 'Failed to create');
      }
    } catch { setError('Network error'); }
    setCreating(false);
  };

  const ORG_CATEGORIES = ['Tech', 'Open Source', 'Education', 'Media', 'Community', 'Business', 'Non-profit', 'Creative', 'Research', 'Other'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Create Organization</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Organizations are always public and visible to everyone.</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Avatar centered */}
          <div className="flex flex-col items-center mb-2">
            <img src={generatePixelAvatar(slug || name || avatarSeed)} alt="" className="w-28 h-28 rounded-2xl" />
            <p className="text-[10px] text-[var(--text-faint)] mt-2">Auto-generated — change later in settings</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-[var(--text-muted)] mb-1.5 block font-medium">Organization name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
                className="w-full bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-3 py-2 outline-none text-[13px] border border-[var(--border-default)] focus:border-[var(--border-hover)] transition-colors placeholder-[var(--text-faint)]" />
            </div>
            <div>
              <label className="text-[12px] text-[var(--text-muted)] mb-1.5 block font-medium">
                URL slug *
                {slug && slugAvailable === true && <span className="text-[#4ade80] ml-2">Available</span>}
                {slug && slugAvailable === false && <span className="text-[#f87171] ml-2">{slugError || 'Taken'}</span>}
              </label>
              <div className="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                <span className="text-[var(--text-muted)] text-[13px] px-3 flex-shrink-0">@</span>
                <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, ''))}
                  className="flex-1 bg-transparent text-[var(--text-primary)] py-2 pr-3 outline-none text-[13px]" />
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {!name && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--text-faint)]">Try:</span>
              {suggestions.map(s => (
                <button key={s} onClick={() => setName(s)}
                  className="px-3 py-1 text-[12px] text-[#9b7bf7] bg-[#9b7bf70a] border border-[#9b7bf720] rounded-full hover:bg-[#9b7bf714] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="h-px bg-[var(--bg-elevated)]" />

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-[var(--text-muted)] mb-1.5 block font-medium">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-3 py-2 outline-none text-[13px] border border-[var(--border-default)] focus:border-[var(--border-hover)]">
                <option value="">Select...</option>
                {ORG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-[var(--text-muted)] mb-1.5 block font-medium">
                Website
                {website && !website.startsWith('https://') && website.length > 3 && <span className="text-[#f87171] ml-1.5 font-normal">must start with https://</span>}
              </label>
              <div className="flex items-center bg-[var(--bg-app)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                <span className="text-[var(--text-faint)] text-[12px] px-2.5 flex-shrink-0">https://</span>
                <input
                  value={website.replace(/^https?:\/\//, '')}
                  onChange={e => setWebsite('https://' + e.target.value.replace(/^https?:\/\//, ''))}
                  placeholder="example.com"
                  className="flex-1 bg-transparent text-[var(--text-primary)] py-2 pr-3 outline-none text-[13px]" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[12px] text-[var(--text-muted)] mb-1.5 block font-medium">
              Contact email
              {contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) && <span className="text-[#f87171] ml-1.5 font-normal">invalid email</span>}
            </label>
            <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="org@example.com" type="email"
              className="w-full bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-3 py-2 outline-none text-[13px] border border-[var(--border-default)] focus:border-[var(--border-hover)] placeholder-[var(--text-faint)]" />
          </div>

          <div>
            <label className="text-[12px] text-[var(--text-muted)] mb-1.5 block font-medium">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short tagline"
              className="w-full bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-3 py-2 outline-none text-[13px] border border-[var(--border-default)] focus:border-[var(--border-hover)] placeholder-[var(--text-faint)]" />
          </div>

          {/* About — code/preview toggle like GitHub */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] text-[var(--text-muted)] font-medium">About</label>
              <div className="flex bg-[var(--bg-app)] rounded-md border border-[var(--border-default)] overflow-hidden">
                <button type="button" onClick={() => setBioPreview(false)}
                  className={`px-3 py-1 text-[11px] font-medium transition-colors ${!bioPreview ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[#999]'}`}>
                  Write
                </button>
                <button type="button" onClick={() => setBioPreview(true)}
                  className={`px-3 py-1 text-[11px] font-medium transition-colors ${bioPreview ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[#999]'}`}>
                  Preview
                </button>
              </div>
            </div>
            {!bioPreview ? (
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Supports **bold**, *italic*, [links](url), `code`, lists..."
                className="w-full bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg px-3 py-2 outline-none text-[13px] font-mono border border-[var(--border-default)] focus:border-[var(--border-hover)] placeholder-[var(--text-faint)] resize-none" />
            ) : (
              <div className="bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 min-h-[100px] text-[13px] text-[var(--text-secondary)] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: bio
                  ? bio
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;color:#e0e0e0;margin:12px 0 4px">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:700;color:#e0e0e0;margin:14px 0 4px">$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:800;color:#fff;margin:16px 0 6px">$1</h1>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/~~(.+?)~~/g, '<del>$1</del>')
                    .replace(/`(.+?)`/g, '<code style="background:#232d3f;padding:1px 4px;border-radius:3px;font-size:12px;color:#c4b5fd">$1</code>')
                    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#60a5fa;text-decoration:none">$1</a>')
                    .replace(/^- (.+)$/gm, '<li style="margin-left:16px">$1</li>')
                    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #9b7bf740;padding-left:12px;color:#9ca3af;margin:8px 0">$1</blockquote>')
                    .replace(/\n/g, '<br>')
                  : '<span style="color:#666">Nothing to preview</span>'
                }} />
            )}
          </div>

          {/* Info box */}
          <div className="bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg p-4 flex gap-3">
            <svg className="w-5 h-5 text-[#60a5fa] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="text-[12px] text-[var(--text-muted)] leading-relaxed">
              <p className="mb-1">As the owner you&apos;ll have full admin access. You can:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>Invite members with admin, maintain, write, or read roles</li>
                <li>Create collections to organize blogs</li>
                <li>Publish blogs under the org name</li>
                <li>Generate shareable invite links with expiry</li>
              </ul>
            </div>
          </div>

          {error && <p className="text-[12px] text-[#f87171]">{error}</p>}
        </div>

        <div className="p-6 border-t border-[var(--border-default)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
            <span className="text-[12px] text-[var(--text-muted)]">Public — visible to everyone</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={!name.trim() || !slug.trim() || slugAvailable === false || creating}
              className="px-6 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-lg text-[13px] hover:bg-[#b69aff] transition-colors disabled:opacity-40">
              {creating ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Organization Tab ──
function OrganizationTab({ user }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchOrgs = useCallback(() => {
    fetch('/api/orgs')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.orgs) setOrgs(d.orgs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] text-[var(--text-primary)] font-semibold">Your Organizations</h3>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Create and manage organizations to publish collaboratively.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-[13px] font-medium text-[var(--text-primary)] bg-[#9b7bf7] hover:bg-[#b69aff] rounded-lg transition-colors">
          Create Organization
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl animate-pulse" />)}
        </div>
      ) : orgs.length > 0 ? (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="flex items-center gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
              <img src={org.logo_url || generatePixelAvatar(org.slug)} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[var(--text-primary)] font-medium truncate">{org.name}</p>
                <p className="text-[12px] text-[var(--text-muted)] truncate">
                  @{org.slug} &middot; {org.role} &middot; {org.member_count || 1} member{(org.member_count || 1) !== 1 ? 's' : ''}
                </p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${org.visibility === 'private' ? 'bg-[#f8717114] text-[#f87171]' : 'bg-[#4ade8014] text-[#4ade80]'}`}>
                {org.visibility}
              </span>
              <Link href={`/settings/org/${org.slug}`} className="text-[12px] text-[#9b7bf7] hover:text-[#b69aff] transition-colors font-medium">
                Manage
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
          <svg className="w-12 h-12 text-[var(--border-default)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-[var(--text-muted)] text-[14px] font-medium mb-1">No organizations yet</p>
          <p className="text-[var(--text-muted)] text-[12px] mb-5">Create one to collaborate with others.</p>
          <button onClick={() => setShowCreateModal(true)} className="px-5 py-2 text-[13px] font-medium text-[var(--text-primary)] bg-[#9b7bf7] hover:bg-[#b69aff] rounded-full transition-colors">
            Create your first organization
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateOrgModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchOrgs()}
        />
      )}
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
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Subscription</h3>
      <p className="text-[var(--text-muted)] text-[14px] text-[var(--text-secondary)]enter max-w-sm">Pricing and subscription management is coming soon. Stay tuned for LixBlogs Pro.</p>
    </div>
  );
}

// ── Main Settings Page ──
export default function SettingsPage() {
  const { user, loading, refetchUser } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam ? TABS.findIndex(t => t.toLowerCase() === tabParam.toLowerCase()) : 0;
  const [activeTab, setActiveTab] = useState(initialTab >= 0 ? initialTab : 0);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="h-10 w-40 bg-[var(--bg-elevated)] animate-pulse rounded mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--bg-elevated)] animate-pulse rounded" />
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
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign in to access settings</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">Manage your account, profile, and preferences.</p>
          <Link href="/sign-in" className="px-6 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-full text-sm hover:bg-[#b69aff] transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-[var(--text-muted)]xl font-bold text-[var(--text-primary)] mb-8">Settings</h1>

        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === 0 && <AccountTab user={user} refetchUser={refetchUser} />}
        {activeTab === 1 && <PublishingTab user={user} />}
        {activeTab === 2 && <NotificationsTab />}
        {activeTab === 3 && <OrganizationTab user={user} />}
        {activeTab === 4 && <SubscriptionTab />}
      </div>
    </AppShell>
  );
}
