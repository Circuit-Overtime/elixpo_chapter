'use client';

import { use, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AppShell from '../../../src/components/AppShell';
import Link from 'next/link';

const BlogPreview = dynamic(() => import('../../../src/components/Editor/BlogPreview'), { ssr: false });

export default function BlogReader({ params }) {
  const { path } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse path segments
  const first = path?.[0] || '';
  const isHandle = first.startsWith('@');
  const handle = isHandle ? first.slice(1) : null;

  let slug = null;
  let collection = null;

  if (isHandle) {
    if (path.length === 2) slug = path[1];
    else if (path.length === 3) { collection = path[1]; slug = path[2]; }
  }

  useEffect(() => {
    if (!handle) { setLoading(false); setError('Not found'); return; }

    const params = new URLSearchParams({ name: handle });
    if (slug) params.set('slug', slug);
    if (collection) params.set('collection', collection);

    fetch(`/api/resolve?${params}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error || 'Not found'); }))
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [handle, slug, collection]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-48 rounded-xl bg-[#1a2030] animate-pulse mb-8" />
          <div className="h-8 bg-[#1a2030] animate-pulse rounded w-2/3 mb-4" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-[#1a2030] animate-pulse rounded" style={{ width: `${70 + Math.random() * 30}%` }} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className="text-6xl mb-4">404</p>
          <p className="text-[#9ca3af] text-[15px] mb-6">{error || 'Page not found'}</p>
          <Link href="/" className="text-[#9b7bf7] text-[13px] hover:text-[#b69aff]">Go home</Link>
        </div>
      </AppShell>
    );
  }

  // Blog view
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

  // User profile
  if (data.type === 'user') {
    const u = data.user;
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Banner placeholder */}
          <div className="w-full h-44 rounded-xl bg-[#1a2030] mb-16 relative">
            <div className="absolute -bottom-12 left-6">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-24 w-24 rounded-full border-4 border-[#131922] object-cover" />
              ) : (
                <div className="h-24 w-24 rounded-full border-4 border-[#131922] bg-[#232d3f] flex items-center justify-center text-3xl text-[#b0b0b0] font-bold">
                  {(u.display_name || u.username || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white">{u.display_name || u.username}</h1>
          <p className="text-[#9ca3af] text-sm mt-0.5">@{u.username}</p>

          {u.bio && <p className="text-[#c8c8c8] text-[15px] leading-relaxed mt-4 mb-4">{u.bio}</p>}

          <div className="flex items-center gap-6 text-[14px] text-[#9ca3af] mt-4 mb-8">
            <span><strong className="text-[#e0e0e0]">{u.followers}</strong> Followers</span>
            <span><strong className="text-[#e0e0e0]">{u.following}</strong> Following</span>
          </div>

          <div className="h-px bg-[#232d3f] mb-8" />

          {/* Published blogs */}
          <h2 className="text-[15px] font-semibold text-white mb-4">Published</h2>
          {(data.blogs || []).length > 0 ? (
            <div className="space-y-4">
              {data.blogs.map(b => (
                <Link key={b.id} href={`/@${u.username}/${b.slug}`} className="block p-4 bg-[#141a26] border border-[#232d3f] rounded-xl hover:border-[#333] transition-colors">
                  <p className="text-[15px] text-[#e0e0e0] font-medium">{b.page_emoji && `${b.page_emoji} `}{b.title || 'Untitled'}</p>
                  {b.subtitle && <p className="text-[13px] text-[#8896a8] mt-1">{b.subtitle}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-[#666]">
                    {b.read_time_minutes && <span>{b.read_time_minutes} min read</span>}
                    {b.published_at && <span>{new Date(b.published_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[#8896a8] text-[13px] text-center py-12">No published blogs yet.</p>
          )}
        </div>
      </AppShell>
    );
  }

  // Org profile
  if (data.type === 'org') {
    const org = data.org;
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Banner */}
          <div className="w-full h-44 rounded-xl bg-[#1a2030] mb-16 relative">
            <div className="absolute -bottom-12 left-6">
              {org.logo_url ? (
                <img src={org.logo_url} alt="" className="h-20 w-20 rounded-xl border-4 border-[#131922] object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-xl border-4 border-[#131922] bg-[#232d3f] flex items-center justify-center text-2xl text-[#b0b0b0] font-bold">
                  {(org.name || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{org.name}</h1>
              <p className="text-[#9ca3af] text-sm mt-0.5">@{org.slug}</p>
            </div>
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#60a5fa] hover:text-[#93c5fd]">
                {org.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {org.description && <p className="text-[#c8c8c8] text-[15px] mt-3">{org.description}</p>}
          {org.bio && <p className="text-[#b0b0b0] text-[14px] leading-relaxed mt-2 mb-4">{org.bio}</p>}

          {/* Members */}
          <div className="flex items-center gap-2 mt-4 mb-6">
            <div className="flex -space-x-2">
              {(data.members || []).slice(0, 5).map(m => (
                m.avatar_url ? (
                  <img key={m.id} src={m.avatar_url} alt="" className="w-7 h-7 rounded-full border-2 border-[#131922] object-cover" />
                ) : (
                  <div key={m.id} className="w-7 h-7 rounded-full border-2 border-[#131922] bg-[#232d3f] flex items-center justify-center text-[10px] text-[#9ca3af] font-bold">
                    {(m.display_name || m.username || '?')[0].toUpperCase()}
                  </div>
                )
              ))}
            </div>
            <span className="text-[12px] text-[#8896a8]">{(data.members || []).length} member{(data.members || []).length !== 1 ? 's' : ''}</span>
          </div>

          <div className="h-px bg-[#232d3f] mb-6" />

          {/* Collections */}
          {(data.collections || []).length > 0 && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">Collections</h3>
              <div className="flex flex-wrap gap-2">
                {data.collections.map(c => (
                  <span key={c.id} className="px-3 py-1.5 bg-[#141a26] border border-[#232d3f] rounded-lg text-[12px] text-[#e0e0e0]">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Blogs */}
          <h3 className="text-[15px] font-semibold text-white mb-4">Published</h3>
          {(data.blogs || []).length > 0 ? (
            <div className="space-y-4">
              {data.blogs.map(b => (
                <Link key={b.id} href={`/@${org.slug}/${b.slug}`} className="block p-4 bg-[#141a26] border border-[#232d3f] rounded-xl hover:border-[#333] transition-colors">
                  <p className="text-[15px] text-[#e0e0e0] font-medium">{b.page_emoji && `${b.page_emoji} `}{b.title || 'Untitled'}</p>
                  {b.subtitle && <p className="text-[13px] text-[#8896a8] mt-1">{b.subtitle}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-[#666]">
                    {b.read_time_minutes && <span>{b.read_time_minutes} min read</span>}
                    {b.published_at && <span>{new Date(b.published_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[#8896a8] text-[13px] text-center py-12">No published blogs yet.</p>
          )}
        </div>
      </AppShell>
    );
  }

  return null;
}
