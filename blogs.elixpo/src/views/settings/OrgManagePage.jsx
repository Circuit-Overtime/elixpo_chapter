'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/AppShell';
import TabBar from '../../components/TabBar';
import Link from 'next/link';
import { generatePixelAvatar } from '../../utils/pixelAvatar';

const ROLE_LABELS = { admin: 'Admin', maintain: 'Maintain', write: 'Write', read: 'Read' };

const TIMEZONES = [
  '', 'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
  'Africa/Cairo', 'Africa/Nairobi', 'Africa/Lagos',
];

const LINK_PRESETS = [
  { key: 'website', label: 'Website', icon: 'globe-outline', placeholder: 'https://example.com' },
  { key: 'github', label: 'GitHub', icon: 'logo-github', placeholder: 'https://github.com/org' },
  { key: 'twitter', label: 'X / Twitter', icon: 'logo-twitter', placeholder: 'https://x.com/org' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', placeholder: 'https://linkedin.com/company/org' },
  { key: 'discord', label: 'Discord', icon: 'logo-discord', placeholder: 'https://discord.gg/invite' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube', placeholder: 'https://youtube.com/@org' },
  { key: 'custom', label: 'Custom Link', icon: 'link-outline', placeholder: 'https://...' },
];

export default function OrgManagePage({ slug }) {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  // General editing state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [timezone, setTimezone] = useState('');
  const [location, setLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [links, setLinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Invite state
  const [inviteRole, setInviteRole] = useState('write');
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);

  // Direct invite by username
  const [directQuery, setDirectQuery] = useState('');
  const [directResults, setDirectResults] = useState([]);
  const [directSearching, setDirectSearching] = useState(false);
  const [directRole, setDirectRole] = useState('write');
  const [directError, setDirectError] = useState('');
  const [directSuccess, setDirectSuccess] = useState('');

  // Collection state
  const [newColName, setNewColName] = useState('');
  const [newColSlug, setNewColSlug] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch('/api/orgs');
      const data = await res.json();
      const found = (data?.orgs || []).find(o => o.slug === slug);
      if (found) {
        setOrg(found);
        setName(found.name || '');
        setDescription(found.description || '');
        setBio(found.bio || '');
        setWebsite(found.website || '');
        setVisibility(found.visibility || 'public');
        setTimezone(found.timezone || '');
        setLocation(found.location || '');
        setContactEmail(found.contact_email || '');
        try {
          const parsed = JSON.parse(found.links || '[]');
          setLinks(Array.isArray(parsed) ? parsed : []);
        } catch { setLinks([]); }

        const [mRes, cRes, iRes] = await Promise.all([
          fetch(`/api/orgs/members?orgId=${found.id}`).then(r => r.json()).catch(() => ({})),
          fetch(`/api/orgs/collections?orgId=${found.id}`).then(r => r.json()).catch(() => ({})),
          fetch(`/api/orgs/invite?orgId=${found.id}`).then(r => r.json()).catch(() => ({})),
        ]);
        setMembers(mRes?.members || []);
        setCollections(cRes?.collections || []);
        setInvites(iRes?.invites || []);
      }
    } catch {}
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  const handleSave = async () => {
    if (!org || saving) return;
    setSaving(true);
    try {
      await fetch('/api/orgs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id, name, description, bio, website, visibility,
          timezone, location, contact_email: contactEmail,
          links: links.filter(l => l.url?.trim()),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  // Link management
  const addLink = (preset) => {
    setLinks([...links, { type: preset.key, label: preset.label, url: '' }]);
  };
  const updateLink = (index, field, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  };
  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  // Search users for direct invite
  useEffect(() => {
    if (!directQuery || directQuery.length < 2) { setDirectResults([]); return; }
    setDirectSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(directQuery)}&scope=users`)
        .then(r => r.ok ? r.json() : { users: [] })
        .then(d => {
          const memberIds = new Set(members.map(m => m.id));
          setDirectResults((d.users || []).filter(u => !memberIds.has(u.id)));
          setDirectSearching(false);
        })
        .catch(() => { setDirectResults([]); setDirectSearching(false); });
    }, 600);
    return () => clearTimeout(timer);
  }, [directQuery, members]);

  const handleDirectInvite = async (userId, username) => {
    if (!org) return;
    setDirectError('');
    setDirectSuccess('');
    try {
      const res = await fetch('/api/orgs/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, userId, role: directRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setDirectSuccess(`Added @${username}`);
        setDirectQuery('');
        setDirectResults([]);
        setTimeout(() => setDirectSuccess(''), 3000);
        fetchOrg();
      } else {
        setDirectError(data.error || 'Failed to add');
      }
    } catch {
      setDirectError('Failed to invite');
    }
  };

  const handleCreateInvite = async () => {
    if (!org || creatingInvite) return;
    setCreatingInvite(true);
    try {
      const res = await fetch('/api/orgs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id, role: inviteRole,
          maxUses: inviteMaxUses ? parseInt(inviteMaxUses) : null,
          expiresInHours: inviteExpiry ? parseInt(inviteExpiry) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const url = `${window.location.origin}${data.url}`;
        navigator.clipboard.writeText(url).catch(() => {});
        fetchOrg();
      }
    } catch {}
    setCreatingInvite(false);
  };

  const handleChangeRole = async (userId, role) => {
    await fetch('/api/orgs/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, userId, role }),
    });
    fetchOrg();
  };

  const handleRemoveMember = async (userId) => {
    await fetch('/api/orgs/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, userId }),
    });
    fetchOrg();
  };

  const handleCreateCollection = async () => {
    if (!newColName.trim()) return;
    const colSlug = newColSlug || newColName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);
    await fetch('/api/orgs/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, name: newColName, slug: colSlug, description: newColDesc }),
    });
    setNewColName(''); setNewColSlug(''); setNewColDesc('');
    fetchOrg();
  };

  const handleDeleteCollection = async (colId) => {
    await fetch('/api/orgs/collections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: colId }),
    });
    fetchOrg();
  };

  const handleDeleteInvite = async (inviteId) => {
    await fetch('/api/orgs/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, orgId: org.id }),
    });
    fetchOrg();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-8 w-48 bg-[var(--bg-elevated)] animate-pulse rounded mb-6" />
          <div className="h-64 bg-[var(--bg-elevated)] animate-pulse rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!org) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-[var(--text-muted)]enter">
          <p className="text-[var(--text-muted)]">Organization not found.</p>
          <Link href="/settings" className="text-[#9b7bf7] text-[13px] mt-3 inline-block">Back to settings</Link>
        </div>
      </AppShell>
    );
  }

  // Helper: styled input
  const Input = ({ label, sublabel, value, onChange, placeholder, type = 'text', ...props }) => (
    <div>
      <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">{label}</label>
      {sublabel && <p className="text-[11px] text-[var(--text-faint)] mb-2">{sublabel}</p>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]"
        {...props}
      />
    </div>
  );

  const TABS = [
    { key: 'general', label: 'Profile', icon: 'person-outline' },
    { key: 'links', label: 'Links', icon: 'link-outline', count: links.length || undefined },
    { key: 'members', label: 'Members', icon: 'people-outline', count: members.length },
    { key: 'collections', label: 'Collections', icon: 'folder-outline', count: collections.length },
    { key: 'invites', label: 'Invites', icon: 'mail-outline' },
  ];

  // Determine which link types are already added
  const addedLinkTypes = new Set(links.map(l => l.type));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <Link href="/settings" className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors p-1">
            <ion-icon name="arrow-back" style={{ fontSize: '18px' }} />
          </Link>
          <img src={org.logo_url || generatePixelAvatar(org.slug)} alt="" className="h-10 w-10 rounded-xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{org.name}</h1>
            <p className="text-[12px] text-[var(--text-faint)]">@{org.slug}</p>
          </div>
          <Link
            href={`/${org.slug}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-lg text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#334155] transition-colors"
          >
            <ion-icon name="eye-outline" style={{ fontSize: '13px' }} />
            View Profile
          </Link>
        </div>

        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} keyField="key" />

        {/* ═══════════ Profile Tab ═══════════ */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            {/* ── Identity ── */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-4">Identity</h3>
              <div className="space-y-4">
                <Input label="Organization name" value={name} onChange={e => setName(e.target.value)} placeholder="My Organization" />
                <div>
                  <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Short description</label>
                  <p className="text-[11px] text-[var(--text-faint)] mb-2">A one-liner that appears under your org name</p>
                  <input
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Building the future of..."
                    maxLength={160}
                    className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 text-right">{description.length}/160</p>
                </div>
                <div>
                  <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Bio</label>
                  <p className="text-[11px] text-[var(--text-faint)] mb-2">Tell people about your organization</p>
                  <textarea
                    value={bio} onChange={e => setBio(e.target.value)} rows={4}
                    placeholder="We are a team of..."
                    className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors resize-none placeholder-[var(--text-faint)]"
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-[var(--divider)]" />

            {/* ── Location & Contact ── */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-4">Location & Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Location"
                  sublabel="Where your org is based"
                  value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                />
                <div>
                  <label className="text-[13px] text-[var(--text-primary)] mb-1 block font-medium">Timezone</label>
                  <p className="text-[11px] text-[var(--text-faint)] mb-2">Displayed on your org profile</p>
                  <select
                    value={timezone} onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors"
                  >
                    <option value="">Select timezone...</option>
                    {TIMEZONES.filter(Boolean).map(tz => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Contact email"
                  sublabel="Public email for inquiries"
                  value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  placeholder="hello@example.com"
                  type="email"
                />
                <Input
                  label="Website"
                  sublabel="Your org's homepage"
                  value={website} onChange={e => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </section>

            <div className="h-px bg-[var(--divider)]" />

            {/* ── Visibility ── */}
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-4">Visibility</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'public', label: 'Public', desc: 'Visible to everyone', icon: 'earth-outline' },
                  { value: 'private', label: 'Private', desc: 'Only visible to members', icon: 'lock-closed-outline' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      visibility === opt.value
                        ? 'bg-[#9b7bf7]/10 border-[#9b7bf7]/40 ring-1 ring-[#9b7bf7]/20'
                        : 'bg-[var(--bg-base)] border-[var(--border-default)] hover:border-[#2d3a4d]'
                    }`}
                  >
                    <ion-icon name={opt.icon} style={{ fontSize: '20px', color: visibility === opt.value ? '#c4b5fd' : '#5a657a', marginTop: '2px' }} />
                    <div>
                      <p className={`text-[13px] font-semibold ${visibility === opt.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{opt.label}</p>
                      <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Save ── */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-lg text-[13px] hover:bg-[#b69aff] transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
              {saved && <span className="text-[12px] text-[#4ade80] flex items-center gap-1"><ion-icon name="checkmark-circle" style={{ fontSize: '14px' }} /> Changes saved</span>}
            </div>
          </div>
        )}

        {/* ═══════════ Links Tab ═══════════ */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <section>
              <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-1">Social & Links</h3>
              <p className="text-[12px] text-[var(--text-faint)] mb-5">Add links that appear on your organization profile.</p>

              {/* Existing links */}
              {links.length > 0 && (
                <div className="space-y-3 mb-5">
                  {links.map((link, i) => {
                    const preset = LINK_PRESETS.find(p => p.key === link.type) || LINK_PRESETS.at(-1);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl group">
                        <div className="h-9 w-9 rounded-lg bg-[var(--bg-base)] flex items-center justify-center shrink-0">
                          <ion-icon name={preset.icon} style={{ fontSize: '18px', color: '#7c8a9e' }} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {link.type === 'custom' && (
                            <input
                              value={link.label || ''} onChange={e => updateLink(i, 'label', e.target.value)}
                              placeholder="Label"
                              className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder-[var(--text-faint)] font-medium"
                            />
                          )}
                          {link.type !== 'custom' && (
                            <p className="text-[12px] text-[var(--text-muted)] font-medium">{link.label || preset.label}</p>
                          )}
                          <input
                            value={link.url || ''} onChange={e => updateLink(i, 'url', e.target.value)}
                            placeholder={preset.placeholder}
                            className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder-[var(--text-faint)]"
                          />
                        </div>
                        <button
                          onClick={() => removeLink(i)}
                          className="text-[var(--text-muted)] hover:text-[#f87171] transition-colors p-1.5 opacity-0 group-hover:opacity-100"
                        >
                          <ion-icon name="trash-outline" style={{ fontSize: '16px' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add link buttons */}
              <div>
                <p className="text-[12px] text-[var(--text-faint)] mb-3">Add a link:</p>
                <div className="flex flex-wrap gap-2">
                  {LINK_PRESETS.map(preset => (
                    <button
                      key={preset.key}
                      onClick={() => addLink(preset)}
                      disabled={preset.key !== 'custom' && addedLinkTypes.has(preset.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-lg text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2d3a4d] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ion-icon name={preset.icon} style={{ fontSize: '14px' }} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-[#9b7bf7] text-[var(--text-primary)] font-semibold rounded-lg text-[13px] hover:bg-[#b69aff] transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Links'}
              </button>
              {saved && <span className="text-[12px] text-[#4ade80] flex items-center gap-1"><ion-icon name="checkmark-circle" style={{ fontSize: '14px' }} /> Saved</span>}
            </div>
          </div>
        )}

        {/* ═══════════ Members Tab ═══════════ */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[12px] text-[var(--text-muted)] font-bold">
                    {(m.display_name || m.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[var(--text-primary)] font-medium">{m.display_name || m.username}</p>
                  <p className="text-[11px] text-[var(--text-faint)]">@{m.username}</p>
                </div>
                {m.is_owner ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#9b7bf7]/10 text-[#c4b5fd] border border-[#9b7bf7]/20 font-medium">Owner</span>
                ) : (
                  <select value={m.role} onChange={e => handleChangeRole(m.id, e.target.value)}
                    className="bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-[11px] outline-none focus:border-[#9b7bf7]/50 transition-colors">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}
                {!m.is_owner && (
                  <button onClick={() => handleRemoveMember(m.id)} className="text-[var(--text-muted)] hover:text-[#f87171] transition-colors p-1">
                    <ion-icon name="close" style={{ fontSize: '16px' }} />
                  </button>
                )}
              </div>
            ))}
            {members.length === 0 && <p className="text-[13px] text-[var(--text-faint)] text-[var(--text-muted)]enter py-12">No members yet.</p>}
          </div>
        )}

        {/* ═══════════ Collections Tab ═══════════ */}
        {activeTab === 'collections' && (
          <div className="space-y-4">
            {collections.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
                <div className="h-9 w-9 rounded-lg bg-[var(--bg-base)] flex items-center justify-center shrink-0">
                  <ion-icon name="folder" style={{ fontSize: '18px', color: '#60a5fa' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[var(--text-primary)] font-medium">{c.name}</p>
                  <p className="text-[11px] text-[var(--text-faint)]">/{c.slug} &middot; {c.blog_count || 0} blog{(c.blog_count || 0) !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => handleDeleteCollection(c.id)} className="text-[var(--text-muted)] hover:text-[#f87171] transition-colors p-1">
                  <ion-icon name="trash-outline" style={{ fontSize: '16px' }} />
                </button>
              </div>
            ))}

            <div className="border border-[var(--border-default)] rounded-xl p-5 space-y-4 bg-[var(--card-bg)]">
              <p className="text-[13px] text-[var(--text-primary)] font-semibold flex items-center gap-2">
                <ion-icon name="add-circle-outline" style={{ fontSize: '16px', color: '#9b7bf7' }} />
                New Collection
              </p>
              <input value={newColName} onChange={e => { setNewColName(e.target.value); setNewColSlug(e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40)); }} placeholder="Collection name"
                className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]" />
              <input value={newColDesc} onChange={e => setNewColDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]" />
              <button onClick={handleCreateCollection} disabled={!newColName.trim()}
                className="px-4 py-2 bg-[#9b7bf7] text-[var(--text-primary)] font-medium rounded-lg text-[12px] hover:bg-[#b69aff] disabled:opacity-40 transition-colors">
                Create
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ Invites Tab ═══════════ */}
        {activeTab === 'invites' && (
          <div className="space-y-5">
            {/* Direct invite by username */}
            <div className="border border-[var(--border-default)] rounded-xl p-5 space-y-4 bg-[var(--card-bg)]">
              <p className="text-[13px] text-[var(--text-primary)] font-semibold flex items-center gap-2">
                <ion-icon name="person-add-outline" style={{ fontSize: '16px', color: '#9b7bf7' }} />
                Invite by username
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={directQuery}
                    onChange={e => { setDirectQuery(e.target.value); setDirectError(''); }}
                    placeholder="Search username..."
                    className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] rounded-lg px-3.5 py-2.5 outline-none text-[13px] border border-[var(--border-default)] focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]"
                  />
                  {directResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-xl z-10 overflow-hidden max-h-[200px] overflow-y-auto">
                      {directResults.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleDirectInvite(u.id, u.username)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] text-[var(--text-muted)] font-bold">
                              {(u.display_name || u.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[var(--text-primary)] truncate">{u.display_name || u.username}</p>
                            <p className="text-[11px] text-[var(--text-faint)]">@{u.username}</p>
                          </div>
                          <span className="text-[11px] text-[#9b7bf7] font-medium flex-shrink-0">Add</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {directQuery.length >= 2 && directResults.length === 0 && !directSearching && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-xl z-10 px-3 py-3 text-[12px] text-[var(--text-faint)]">
                      No users found
                    </div>
                  )}
                </div>
                <select value={directRole} onChange={e => setDirectRole(e.target.value)}
                  className="bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-default)] rounded-lg px-2.5 py-2.5 text-[12px] outline-none focus:border-[#9b7bf7]/50 transition-colors">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {directError && <p className="text-[11px] text-[#f87171]">{directError}</p>}
              {directSuccess && <p className="text-[11px] text-[#4ade80]">{directSuccess}</p>}
            </div>

            {/* Generate invite link */}
            <div className="border border-[var(--border-default)] rounded-xl p-5 space-y-4 bg-[var(--card-bg)]">
              <p className="text-[13px] text-[var(--text-primary)] font-semibold flex items-center gap-2">
                <ion-icon name="link-outline" style={{ fontSize: '16px', color: '#9b7bf7' }} />
                Generate invite link
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[var(--text-faint)] mb-1 block">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-[12px] outline-none focus:border-[#9b7bf7]/50 transition-colors">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-faint)] mb-1 block">Expires in (hours)</label>
                  <input value={inviteExpiry} onChange={e => setInviteExpiry(e.target.value)} placeholder="Never"
                    className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-[12px] outline-none focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]" />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-faint)] mb-1 block">Max uses</label>
                  <input value={inviteMaxUses} onChange={e => setInviteMaxUses(e.target.value)} placeholder="Unlimited"
                    className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-[12px] outline-none focus:border-[#9b7bf7]/50 transition-colors placeholder-[var(--text-faint)]" />
                </div>
              </div>
              <button onClick={handleCreateInvite} disabled={creatingInvite}
                className="px-4 py-2 bg-[#9b7bf7] text-[var(--text-primary)] font-medium rounded-lg text-[12px] hover:bg-[#b69aff] disabled:opacity-40 transition-colors">
                {creatingInvite ? 'Creating...' : 'Generate & Copy Link'}
              </button>
            </div>

            {/* Active invites */}
            {invites.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-widest font-semibold mb-3">Active Invites</p>
                <div className="space-y-2">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-3.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[var(--text-primary)] font-mono truncate">{inv.id}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-faint)]">
                          <span className="capitalize">{inv.role}</span>
                          {inv.uses !== undefined && <span>&middot; {inv.uses}/{inv.max_uses || '∞'} uses</span>}
                          {inv.expires_at && <span>&middot; Expires {new Date(inv.expires_at * 1000).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteInvite(inv.id)} className="text-[var(--text-muted)] hover:text-[#f87171] transition-colors p-1">
                        <ion-icon name="trash-outline" style={{ fontSize: '16px' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shareable org link */}
            <div className="border border-[var(--border-default)] rounded-xl p-4 flex items-center gap-3 bg-[var(--card-bg)]">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--text-faint)] mb-1">Share this org&apos;s profile</p>
                <p className="text-[13px] text-[var(--text-primary)] font-mono truncate">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/{org?.slug}
                </p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${org?.slug}`)}
                className="px-3 py-1.5 bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-muted)] rounded-lg text-[12px] font-medium hover:text-[var(--text-primary)] hover:border-[#2d3a4d] transition-colors flex-shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
