'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AppShell from '../components/AppShell';
import Link from 'next/link';
import { generatePixelAvatar } from '../utils/pixelAvatar';
import { useAuth } from '../context/AuthContext';

const BlogPreview = dynamic(() => import('../components/Editor/BlogPreview'), { ssr: false });

export default function HandlePage({ path }) {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse: path[0] = name, path[1] = slug or collection, path[2] = slug (if collection)
  const name = (path?.[0] || '').toLowerCase();
  const second = (path?.[1] || '').toLowerCase();
  const third = (path?.[2] || '').toLowerCase();

  // If 1 segment: profile. If 2: blog or collection listing. If 3: blog in collection.
  const isProfile = path?.length === 1;
  const slug = path?.length === 2 ? second : path?.length === 3 ? third : '';
  const collection = path?.length === 3 ? second : '';

  useEffect(() => {
    if (!name) { setLoading(false); setError('Not found'); return; }

    const params = new URLSearchParams({ name });
    if (slug) params.set('slug', slug);
    if (collection) params.set('collection', collection);

    fetch(`/api/resolve?${params}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error || 'Not found'); }))
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [name, slug, collection]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-44 rounded-xl bg-[var(--bg-elevated)] animate-pulse mb-16" />
          <div className="h-8 bg-[var(--bg-elevated)] animate-pulse rounded w-2/3 mb-4" />
          <div className="h-4 bg-[var(--bg-elevated)] animate-pulse rounded w-1/3 mb-6" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-[var(--bg-elevated)] animate-pulse rounded" style={{ width: `${60 + Math.random() * 40}%` }} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className="text-6xl mb-4 text-[#232d3f]">404</p>
          <p className="text-[var(--text-muted)] text-[15px] mb-6">{error || 'Page not found'}</p>
          <Link href="/" className="text-[#9b7bf7] text-[13px] hover:text-[#b69aff]">Go home</Link>
        </div>
      </AppShell>
    );
  }

  // ── Blog view ──
  if (data.type === 'blog') {
    const blog = data.blog;
    let blocks = [];
    try { blocks = typeof blog.content === 'string' ? JSON.parse(blog.content) : blog.content || []; } catch { blocks = []; }

    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <BlogPreview
            title={blog.title}
            subtitle={blog.subtitle}
            pageEmoji={blog.page_emoji}
            tags={blog.tags || []}
            blocks={blocks}
            coverPreview={blog.cover_image_r2_key}
            user={{ username: blog.author_username, display_name: blog.author_name, avatar_url: blog.author_avatar }}
            wordCount={0}
          />
        </div>
      </AppShell>
    );
  }

  // ── User profile ──
  if (data.type === 'user') {
    const u = data.user;
    const userLinks = (() => { try { return JSON.parse(u.links || '[]'); } catch { return []; } })();
    const joined = u.created_at ? new Date(u.created_at * 1000) : null;
    const isOwnProfile = currentUser && currentUser.id === u.id;

    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* ── Avatar + Header ── */}
          <div className="flex items-start gap-5 mb-5">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="h-[88px] w-[88px] rounded-full border-[3px] border-[var(--border-default)] object-cover shadow-lg shadow-black/20 shrink-0" />
            ) : (
              <div className="h-[88px] w-[88px] rounded-full border-[3px] border-[var(--border-default)] bg-[var(--bg-elevated)] flex items-center justify-center text-3xl text-[var(--text-muted)] font-bold shadow-lg shadow-black/20 shrink-0">
                {(u.display_name || u.username || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-[26px] font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                    {u.display_name || u.username}
                    {u.pronouns && <span className="text-[14px] font-normal text-[var(--text-faint)] ml-2">({u.pronouns})</span>}
                  </h1>
                  <p className="text-[var(--text-muted)] text-[15px] mt-0.5 font-medium">@{u.username}</p>
                </div>
                {isOwnProfile && (
                  <Link
                    href="/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#9b7bf7]/50 hover:bg-[#9b7bf7]/10 transition-all shrink-0"
                  >
                    <ion-icon name="create-outline" style={{ fontSize: '14px' }} />
                    Edit
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Bio ── */}
          {u.bio && <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-4">{u.bio}</p>}

          {/* ── Meta info row ── */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--text-muted)]">
            {u.company && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="business-outline" style={{ fontSize: '14px' }} />
                {u.company}
              </span>
            )}
            {u.location && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="location-outline" style={{ fontSize: '14px' }} />
                {u.location}
              </span>
            )}
            {u.timezone && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="time-outline" style={{ fontSize: '14px' }} />
                {u.timezone.replace(/_/g, ' ')}
              </span>
            )}
            {u.website && (
              <a href={u.website.startsWith('http') ? u.website : `https://${u.website}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[#60a5fa] transition-colors">
                <ion-icon name="globe-outline" style={{ fontSize: '14px' }} />
                {u.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
            {joined && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="calendar-outline" style={{ fontSize: '14px' }} />
                Joined {joined.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* ── Social links ── */}
          {userLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {userLinks.filter(l => l.url?.trim()).map((link, i) => {
                const iconMap = { github: 'logo-github', twitter: 'logo-twitter', linkedin: 'logo-linkedin', mastodon: 'globe-outline', website: 'globe-outline' };
                const icon = iconMap[link.type] || 'link-outline';
                return (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-full text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all">
                    <ion-icon name={icon} style={{ fontSize: '14px' }} />
                    {link.label || link.type || 'Link'}
                  </a>
                );
              })}
            </div>
          )}

          {/* ── Followers / Following ── */}
          <div className="flex items-center gap-5 text-[14px] text-[var(--text-muted)] mt-4 mb-6">
            <span><strong className="text-[var(--text-primary)]">{u.followers}</strong> Followers</span>
            <span><strong className="text-[var(--text-primary)]">{u.following}</strong> Following</span>
          </div>

          <div className="h-px bg-[var(--border-default)] mb-6" />

          {/* ── Published blogs ── */}
          <h2 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-4">
            Published {(data.blogs || []).length > 0 && <span className="text-[var(--text-muted)] ml-1">({(data.blogs || []).length})</span>}
          </h2>
          {(data.blogs || []).length > 0 ? (
            <div className="space-y-2.5">
              {data.blogs.map(b => (
                <Link key={b.id} href={`/${u.username}/${b.slug}`}
                  className="block p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group">
                  <div className="flex items-start gap-3">
                    {b.cover_image_r2_key && (
                      <img src={b.cover_image_r2_key} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] text-[var(--text-primary)] font-semibold group-hover:text-[var(--text-primary)] transition-colors leading-snug">
                        {b.page_emoji && <span className="mr-1.5">{b.page_emoji}</span>}
                        {b.title || 'Untitled'}
                      </p>
                      {b.subtitle && <p className="text-[13px] text-[var(--text-muted)] mt-1 line-clamp-1">{b.subtitle}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-faint)]">
                        {b.read_time_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            <ion-icon name="time-outline" style={{ fontSize: '12px' }} />
                            {b.read_time_minutes} min read
                          </span>
                        )}
                        {b.published_at && (
                          <span>{new Date(b.published_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
              <ion-icon name="document-text-outline" style={{ fontSize: '36px', color: '#2d3a4d' }} />
              <p className="text-[var(--text-faint)] text-[14px] mt-3">No published blogs yet</p>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // ── Org profile ──
  if (data.type === 'org') {
    const org = data.org;
    const owner = data.owner;
    const members = data.members || [];
    const collections = data.collections || [];
    const blogs = data.blogs || [];
    const logoSrc = org.logo_url || generatePixelAvatar(org.slug);
    const links = (() => { try { return JSON.parse(org.links || '[]'); } catch { return []; } })();
    const founded = org.created_at ? new Date(org.created_at * 1000) : null;

    // Check if current user can manage this org (admin or maintain role)
    const currentMember = currentUser ? members.find(m => m.id === currentUser.id) : null;
    const canManage = currentMember && ['admin', 'maintain'].includes(currentMember.role);

    const roleBadge = (role) => {
      const styles = {
        admin: 'bg-[#9b7bf7]/15 text-[#c4b5fd] border-[#9b7bf7]/30',
        maintain: 'bg-[#60a5fa]/15 text-[#93c5fd] border-[#60a5fa]/30',
        write: 'bg-[#4ade80]/15 text-[#86efac] border-[#4ade80]/30',
        read: 'bg-[#9ca3af]/10 text-[var(--text-muted)] border-[#9ca3af]/20',
        member: 'bg-[#9ca3af]/10 text-[var(--text-muted)] border-[#9ca3af]/20',
      };
      return styles[role] || styles.member;
    };

    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* ── Logo + Header ── */}
          <div className="flex items-start gap-5 mb-6">
            <img
              src={logoSrc}
              alt={org.name}
              className="h-[88px] w-[88px] rounded-2xl border-[3px] border-[var(--border-default)] object-cover shadow-lg shadow-black/20 shrink-0"
            />
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-[26px] font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">{org.name}</h1>
                  <p className="text-[var(--text-muted)] text-[15px] mt-0.5 font-medium">@{org.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {org.visibility === 'private' && (
                    <span className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                      <ion-icon name="lock-closed" style={{ fontSize: '11px' }} />
                      Private
                    </span>
                  )}
                  {canManage && (
                    <Link
                      href={`/settings/org/${org.slug}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#9b7bf7]/50 hover:bg-[#9b7bf7]/10 transition-all"
                      title="Manage organization"
                    >
                      <ion-icon name="settings-outline" style={{ fontSize: '14px' }} />
                      Manage
                    </Link>
                  )}
                </div>
              </div>
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-[13px] text-[#60a5fa] hover:text-[#93c5fd] transition-colors"
                >
                  <ion-icon name="globe-outline" style={{ fontSize: '13px' }} />
                  {org.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
          </div>

          {/* ── Description / Bio ── */}
          {(org.description || org.bio) && (
            <div className="mt-4 space-y-1.5">
              {org.description && <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed">{org.description}</p>}
              {org.bio && org.bio !== org.description && (
                <p className="text-[var(--text-muted)] text-[14px] leading-relaxed">{org.bio}</p>
              )}
            </div>
          )}

          {/* ── Meta info row ── */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-[13px] text-[var(--text-muted)]">
            {org.location && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="location-outline" style={{ fontSize: '14px' }} />
                {org.location}
              </span>
            )}
            {org.timezone && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="time-outline" style={{ fontSize: '14px' }} />
                {org.timezone.replace(/_/g, ' ')}
              </span>
            )}
            {org.contact_email && (
              <a href={`mailto:${org.contact_email}`} className="flex items-center gap-1.5 hover:text-[#60a5fa] transition-colors">
                <ion-icon name="mail-outline" style={{ fontSize: '14px' }} />
                {org.contact_email}
              </a>
            )}
            {founded && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="calendar-outline" style={{ fontSize: '14px' }} />
                Founded {founded.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <ion-icon name="people-outline" style={{ fontSize: '14px' }} />
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            {blogs.length > 0 && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="document-text-outline" style={{ fontSize: '14px' }} />
                {blogs.length} post{blogs.length !== 1 ? 's' : ''}
              </span>
            )}
            {collections.length > 0 && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="folder-outline" style={{ fontSize: '14px' }} />
                {collections.length} collection{collections.length !== 1 ? 's' : ''}
              </span>
            )}
            {org.visibility === 'public' && (
              <span className="flex items-center gap-1.5">
                <ion-icon name="earth-outline" style={{ fontSize: '14px' }} />
                Public
              </span>
            )}
          </div>

          {/* ── Social links ── */}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {links.filter(l => l.url?.trim()).map((link, i) => {
                const iconMap = { github: 'logo-github', twitter: 'logo-twitter', linkedin: 'logo-linkedin', discord: 'logo-discord', youtube: 'logo-youtube', website: 'globe-outline' };
                const icon = iconMap[link.type] || 'link-outline';
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-full text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
                  >
                    <ion-icon name={icon} style={{ fontSize: '14px' }} />
                    {link.label || link.type || 'Link'}
                  </a>
                );
              })}
            </div>
          )}

          <div className="h-px bg-[var(--border-default)] mt-7 mb-7" />

          {/* ── Owner card ── */}
          {owner && (
            <div className="mb-7">
              <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">Owned by</h3>
              <Link
                href={`/${owner.username}`}
                className="flex items-center gap-3.5 p-3.5 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
              >
                {owner.avatar_url ? (
                  <img src={owner.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-[#9b7bf7]/30" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-lg text-[var(--text-muted)] font-bold ring-2 ring-[#9b7bf7]/30">
                    {(owner.display_name || owner.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-[var(--text-primary)] font-semibold group-hover:text-[#c4b5fd] transition-colors truncate">
                    {owner.display_name || owner.username}
                  </p>
                  <p className="text-[13px] text-[var(--text-muted)]">@{owner.username}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${roleBadge('admin')}`}>
                  Owner
                </span>
              </Link>
            </div>
          )}

          {/* ── Members (excluding owner, already shown above) ── */}
          {members.filter(m => !owner || m.id !== owner.id).length > 0 && (
            <div className="mb-7">
              <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">Members</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {members.filter(m => !owner || m.id !== owner.id).map(m => (
                  <Link
                    key={m.id}
                    href={`/${m.username}`}
                    className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
                  >
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-sm text-[var(--text-muted)] font-bold">
                        {(m.display_name || m.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] text-[var(--text-primary)] font-medium group-hover:text-[var(--text-primary)] transition-colors truncate">
                        {m.display_name || m.username}
                      </p>
                      <p className="text-[12px] text-[var(--text-faint)]">@{m.username}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${roleBadge(m.role)}`}>
                      {m.id === org.owner_id ? 'Owner' : m.role}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Collections ── */}
          {collections.length > 0 && (
            <div className="mb-7">
              <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">Collections</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {collections.map(c => (
                  <Link
                    key={c.id}
                    href={`/${org.slug}/${c.slug}`}
                    className="p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                        <ion-icon name="folder" style={{ fontSize: '18px', color: '#60a5fa' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] text-[var(--text-primary)] font-medium group-hover:text-[var(--text-primary)] transition-colors truncate">{c.name}</p>
                        {c.description && <p className="text-[12px] text-[var(--text-faint)] truncate">{c.description}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Published blogs ── */}
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-widest mb-3">
              Published {blogs.length > 0 && <span className="text-[var(--text-muted)] ml-1">({blogs.length})</span>}
            </h3>
            {blogs.length > 0 ? (
              <div className="space-y-2.5">
                {blogs.map(b => (
                  <Link
                    key={b.id}
                    href={`/${org.slug}/${b.slug}`}
                    className="block p-4 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-default)] transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {b.cover_image_r2_key && (
                        <img src={b.cover_image_r2_key} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] text-[var(--text-primary)] font-semibold group-hover:text-[var(--text-primary)] transition-colors leading-snug">
                          {b.page_emoji && <span className="mr-1.5">{b.page_emoji}</span>}
                          {b.title || 'Untitled'}
                        </p>
                        {b.subtitle && <p className="text-[13px] text-[var(--text-muted)] mt-1 line-clamp-1">{b.subtitle}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-faint)]">
                          {b.read_time_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              <ion-icon name="time-outline" style={{ fontSize: '12px' }} />
                              {b.read_time_minutes} min read
                            </span>
                          )}
                          {b.published_at && (
                            <span>{new Date(b.published_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--border-default)] rounded-xl">
                <ion-icon name="document-text-outline" style={{ fontSize: '36px', color: '#2d3a4d' }} />
                <p className="text-[var(--text-faint)] text-[14px] mt-3">No published blogs yet</p>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  return null;
}
