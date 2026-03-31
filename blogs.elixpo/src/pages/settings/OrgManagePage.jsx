'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/AppShell';
import TabBar from '../../components/TabBar';
import Link from 'next/link';
import { generatePixelAvatar } from '../../utils/pixelAvatar';

const ROLE_LABELS = { admin: 'Admin', maintain: 'Maintain', write: 'Write', read: 'Read' };
const ROLE_COLORS = { admin: '#f87171', maintain: '#fbbf24', write: '#4ade80', read: '#9ca3af' };

export default function OrgManagePage({ slug }) {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  // Editing state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [visibility, setVisibility] = useState('public');
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

        // Fetch members, collections, invites
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
        body: JSON.stringify({ orgId: org.id, name, description, bio, website, visibility }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  // Search users for direct invite
  useEffect(() => {
    if (!directQuery || directQuery.length < 2) { setDirectResults([]); return; }
    setDirectSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(directQuery)}&scope=users`)
        .then(r => r.ok ? r.json() : { users: [] })
        .then(d => {
          // Filter out users who are already members
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
          <div className="h-8 w-48 bg-[#232d3f] animate-pulse rounded mb-6" />
          <div className="h-64 bg-[#232d3f] animate-pulse rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!org) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-[#9ca3af]">Organization not found.</p>
          <Link href="/settings" className="text-[#9b7bf7] text-[13px] mt-3 inline-block">Back to settings</Link>
        </div>
      </AppShell>
    );
  }

  const TABS = [
    { key: 'general', label: 'General', icon: 'settings-outline' },
    { key: 'members', label: 'Members', icon: 'people-outline', count: members.length },
    { key: 'collections', label: 'Collections', icon: 'folder-outline', count: collections.length },
    { key: 'invites', label: 'Invites', icon: 'link-outline' },
  ];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="text-[#8896a8] hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div className="flex items-center gap-3">
            <img src={org.logo_url || generatePixelAvatar(org.slug)} alt="" className="h-10 w-10 rounded-lg" />
            <div>
              <h1 className="text-xl font-bold text-white">{org.name}</h1>
              <p className="text-[12px] text-[#8896a8]">@{org.slug}</p>
            </div>
          </div>
        </div>

        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} keyField="key" />

        {/* General */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            <div>
              <label className="text-[12px] text-[#9ca3af] mb-1.5 block font-medium">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-[#131922] text-[#e0e0e0] rounded-lg px-3 py-2.5 outline-none text-[13px] border border-[#232d3f] focus:border-[#444]" />
            </div>
            <div>
              <label className="text-[12px] text-[#9ca3af] mb-1.5 block font-medium">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#131922] text-[#e0e0e0] rounded-lg px-3 py-2.5 outline-none text-[13px] border border-[#232d3f] focus:border-[#444]" />
            </div>
            <div>
              <label className="text-[12px] text-[#9ca3af] mb-1.5 block font-medium">Bio (Markdown)</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
                className="w-full bg-[#131922] text-[#e0e0e0] rounded-lg px-3 py-2.5 outline-none text-[13px] border border-[#232d3f] focus:border-[#444] resize-none" />
            </div>
            <div>
              <label className="text-[12px] text-[#9ca3af] mb-1.5 block font-medium">Website</label>
              <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..."
                className="w-full bg-[#131922] text-[#e0e0e0] rounded-lg px-3 py-2.5 outline-none text-[13px] border border-[#232d3f] focus:border-[#444] placeholder-[#6b7a8d]" />
            </div>
            <div>
              <label className="text-[12px] text-[#9ca3af] mb-1.5 block font-medium">Visibility</label>
              <div className="flex gap-2">
                {['public', 'private'].map(v => (
                  <button key={v} onClick={() => setVisibility(v)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${visibility === v ? 'bg-[#9b7bf7] text-white' : 'bg-[#131922] border border-[#232d3f] text-[#9ca3af]'}`}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 bg-[#9b7bf7] text-white font-semibold rounded-lg text-[13px] hover:bg-[#b69aff] transition-colors disabled:opacity-40">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Members */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-[#141a26] border border-[#232d3f] rounded-xl">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#232d3f] flex items-center justify-center text-[11px] text-[#9ca3af] font-bold">
                    {(m.display_name || m.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#e0e0e0] font-medium">{m.display_name || m.username}</p>
                  <p className="text-[11px] text-[#8896a8]">@{m.username}</p>
                </div>
                {m.is_owner ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#9b7bf714] text-[#9b7bf7] font-medium">Owner</span>
                ) : (
                  <select value={m.role} onChange={e => handleChangeRole(m.id, e.target.value)}
                    className="bg-[#131922] text-[#9ca3af] border border-[#232d3f] rounded-lg px-2 py-1 text-[11px] outline-none">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}
                {!m.is_owner && (
                  <button onClick={() => handleRemoveMember(m.id)} className="text-[#666] hover:text-[#f87171] transition-colors p-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
            {members.length === 0 && <p className="text-[13px] text-[#8896a8] text-center py-8">No members yet.</p>}
          </div>
        )}

        {/* Collections */}
        {activeTab === 'collections' && (
          <div className="space-y-4">
            {collections.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-4 bg-[#141a26] border border-[#232d3f] rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[#e0e0e0] font-medium">{c.name}</p>
                  <p className="text-[11px] text-[#8896a8]">/{c.slug} &middot; {c.blog_count || 0} blog{(c.blog_count || 0) !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => handleDeleteCollection(c.id)} className="text-[#666] hover:text-[#f87171] text-[12px]">Delete</button>
              </div>
            ))}

            <div className="border border-[#232d3f] rounded-xl p-4 space-y-3">
              <p className="text-[13px] text-[#e0e0e0] font-medium">New Collection</p>
              <input value={newColName} onChange={e => { setNewColName(e.target.value); setNewColSlug(e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40)); }} placeholder="Name"
                className="w-full bg-[#131922] text-[#e0e0e0] rounded-lg px-3 py-2 outline-none text-[13px] border border-[#232d3f] placeholder-[#6b7a8d]" />
              <input value={newColDesc} onChange={e => setNewColDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full bg-[#131922] text-[#e0e0e0] rounded-lg px-3 py-2 outline-none text-[13px] border border-[#232d3f] placeholder-[#6b7a8d]" />
              <button onClick={handleCreateCollection} disabled={!newColName.trim()}
                className="px-4 py-2 bg-[#9b7bf7] text-white font-medium rounded-lg text-[12px] hover:bg-[#b69aff] disabled:opacity-40">
                Create Collection
              </button>
            </div>
          </div>
        )}

        {/* Invites */}
        {activeTab === 'invites' && (
          <div className="space-y-4">
            {/* Direct invite by username */}
            <div className="border border-[#232d3f] rounded-xl p-4 space-y-3">
              <p className="text-[13px] text-[#e0e0e0] font-medium">Invite by username</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={directQuery}
                    onChange={e => { setDirectQuery(e.target.value); setDirectError(''); }}
                    placeholder="Search username..."
                    className="w-full bg-[#131922] text-[#e0e0e0] rounded-lg px-3 py-2 outline-none text-[13px] border border-[#232d3f] focus:border-[#444] placeholder-[#6b7a8d]"
                  />
                  {/* Search results dropdown */}
                  {directResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[#141a26] border border-[#232d3f] rounded-lg shadow-xl z-10 overflow-hidden max-h-[200px] overflow-y-auto">
                      {directResults.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleDirectInvite(u.id, u.username)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#ffffff06] transition-colors"
                        >
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#232d3f] flex items-center justify-center text-[10px] text-[#9ca3af] font-bold">
                              {(u.display_name || u.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#e0e0e0] truncate">{u.display_name || u.username}</p>
                            <p className="text-[11px] text-[#666]">@{u.username}</p>
                          </div>
                          <span className="text-[11px] text-[#9b7bf7] font-medium flex-shrink-0">Add</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {directQuery.length >= 2 && directResults.length === 0 && !directSearching && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[#141a26] border border-[#232d3f] rounded-lg shadow-xl z-10 px-3 py-3 text-[12px] text-[#666]">
                      No users found
                    </div>
                  )}
                </div>
                <select value={directRole} onChange={e => setDirectRole(e.target.value)}
                  className="bg-[#131922] text-[#9ca3af] border border-[#232d3f] rounded-lg px-2 py-2 text-[12px] outline-none">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {directError && <p className="text-[11px] text-[#f87171]">{directError}</p>}
              {directSuccess && <p className="text-[11px] text-[#4ade80]">{directSuccess}</p>}
            </div>

            {/* Shareable org link */}
            <div className="border border-[#232d3f] rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#8896a8] mb-1">Share this org&apos;s profile</p>
                <p className="text-[13px] text-[#e0e0e0] font-mono truncate">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/@{org?.slug}
                </p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/@${org?.slug}`)}
                className="px-3 py-1.5 bg-[#232d3f] text-[#9ca3af] rounded-lg text-[12px] font-medium hover:text-white transition-colors flex-shrink-0"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
