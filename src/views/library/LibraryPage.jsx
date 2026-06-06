'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/AppShell';
import Link from 'next/link';

const TABS = ['Collections', 'Saved', 'Read History'];

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function BlogRow({ b }) {
  return (
    <Link href={`/${b.author_username || 'blog'}/${b.slug}`} className="flex gap-4 py-4 group" style={{ borderBottom: '1px solid var(--divider)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {b.author_avatar
            ? <img src={b.author_avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
            : <span className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)' }}>{(b.author_name || b.author_username || '?')[0].toUpperCase()}</span>}
          <span>{b.author_name || b.author_username}</span>
          {(b.saved_at || b.read_at) && <span style={{ color: 'var(--text-faint)' }}>· {timeAgo(b.saved_at || b.read_at)}</span>}
        </div>
        <p className="text-[16px] font-bold leading-snug group-hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)', fontFamily: "'Source Serif 4', Georgia, serif" }}>{b.title || 'Untitled'}</p>
        {b.subtitle && <p className="text-[13px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{b.subtitle}</p>}
      </div>
      {b.cover_image_r2_key && <img src={b.cover_image_r2_key} alt="" className="w-[80px] h-[80px] rounded-md object-cover flex-shrink-0 self-center hidden sm:block" />}
    </Link>
  );
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [collections, setCollections] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState('');

  const loadCollections = useCallback(() => {
    fetch('/api/library/collections').then(r => r.json()).then(d => setCollections(d.collections || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 0) loadCollections();
    if (activeTab === 1) fetch('/api/library/bookmarks').then(r => r.json()).then(d => setBookmarks(d.bookmarks || [])).catch(() => {});
    if (activeTab === 2) fetch('/api/library/history').then(r => r.json()).then(d => setHistory(d.history || [])).catch(() => {});
  }, [user, activeTab, loadCollections]);

  const createList = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const r = await fetch('/api/library/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) });
      if (r.ok) { setNewName(''); setShowCreate(false); loadCollections(); }
    } finally { setCreating(false); }
  };

  const togglePublic = async (c) => {
    setCollections(cs => cs.map(x => x.id === c.id ? { ...x, is_public: x.is_public ? 0 : 1 } : x));
    await fetch('/api/library/collections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, isPublic: !c.is_public }) }).catch(() => {});
  };

  const deleteList = async (c) => {
    if (!confirm(`Delete the list "${c.name}"? Saved posts move back to your default list.`)) return;
    setCollections(cs => cs.filter(x => x.id !== c.id));
    await fetch(`/api/library/collections?id=${c.id}`, { method: 'DELETE' }).catch(() => {});
  };

  const copyShare = (c) => {
    const url = `${window.location.origin}/${user.username}/reads/${c.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(c.id);
    setTimeout(() => setCopied(''), 1800);
  };

  if (loading) {
    return (
      <AppShell><div className="max-w-3xl mx-auto px-6 py-10">
        <div className="h-10 w-32 rounded mb-8 animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <div className="h-44 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      </div></AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell><div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in to access your library</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Your bookmarks, collections, and reading history will appear here.</p>
        <Link href="/sign-in" className="px-6 py-2.5 bg-[#9b7bf7] text-white font-semibold rounded-full text-sm hover:bg-[#8b6ae6] transition-colors">Sign In</Link>
      </div></AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Library</h1>

        <div className="flex gap-6 mb-8" style={{ borderBottom: '1px solid var(--border-default)' }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className="pb-3 text-[14px] font-medium border-b-2 transition-colors"
              style={{ color: i === activeTab ? 'var(--text-primary)' : 'var(--text-muted)', borderBottomColor: i === activeTab ? 'var(--text-primary)' : 'transparent' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Collections */}
        {activeTab === 0 && (
          <div>
            <div className="flex items-center justify-between w-full rounded-xl p-6 mb-8" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Create a reading list to organize and share posts</h2>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Make a list public to share it at /{user.username}/reads/…</p>
                {showCreate ? (
                  <div className="flex items-center gap-2 mt-3">
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createList()}
                      placeholder="List name…" className="flex-1 text-[14px] rounded-lg px-3 py-2 outline-none" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                    <button onClick={createList} disabled={creating || !newName.trim()} className="px-4 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-full transition-colors disabled:opacity-50">Create</button>
                    <button onClick={() => { setShowCreate(false); setNewName(''); }} className="px-3 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowCreate(true)} className="mt-3 px-5 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-full transition-colors">Start a collection</button>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {collections.map(c => {
                const shareable = c.id !== 'default';
                const isDefault = c.id === 'default';
                return (
                  <div key={c.id} onClick={isDefault ? () => setActiveTab(1) : undefined} className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', cursor: isDefault ? 'pointer' : 'default' }}>
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <ion-icon name="bookmark" style={{ fontSize: '18px', color: '#9b7bf7' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}{c.is_public ? <span className="text-[10px] font-bold uppercase ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#16a34a22', color: '#16a34a' }}>Public</span> : null}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-faint)' }}>{c.count} post{c.count !== 1 ? 's' : ''}{isDefault ? ' · view in Saved' : ''}</p>
                    </div>
                    {shareable && (
                      <>
                        <button onClick={() => togglePublic(c)} title={c.is_public ? 'Make private' : 'Make public'} className="text-[12px] px-3 py-1.5 rounded-full transition-colors" style={c.is_public ? { color: 'var(--text-muted)', border: '1px solid var(--border-default)' } : { color: '#fff', backgroundColor: '#9b7bf7' }}>
                          {c.is_public ? 'Public' : 'Share'}
                        </button>
                        {c.is_public && (
                          <button onClick={() => copyShare(c)} title="Copy link" className="flex items-center justify-center w-9 h-9 rounded-full transition-colors" style={{ color: copied === c.id ? '#16a34a' : 'var(--text-muted)' }}>
                            <ion-icon name={copied === c.id ? 'checkmark' : 'link-outline'} style={{ fontSize: '17px' }} />
                          </button>
                        )}
                        <button onClick={() => deleteList(c)} title="Delete" className="flex items-center justify-center w-9 h-9 rounded-full transition-colors" style={{ color: 'var(--text-faint)' }}>
                          <ion-icon name="trash-outline" style={{ fontSize: '16px' }} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved */}
        {activeTab === 1 && (
          bookmarks.length > 0
            ? <div>{bookmarks.map(b => <BlogRow key={b.blog_id} b={b} />)}</div>
            : <div className="text-center py-16"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No saved posts yet. Bookmark posts to see them here.</p></div>
        )}

        {/* Read History */}
        {activeTab === 2 && (
          history.length > 0
            ? <div>{history.map((b, i) => <BlogRow key={`${b.slug}-${i}`} b={b} />)}</div>
            : <div className="text-center py-16"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your reading history will appear here.</p></div>
        )}
      </div>
    </AppShell>
  );
}
