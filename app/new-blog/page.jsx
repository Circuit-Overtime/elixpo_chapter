'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function generateBlogId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default function New() {
  const router = useRouter();

  // /new-blog is a launcher only — it never hosts the editor itself, because a
  // slugid generated here wouldn't be in the URL and a reload would mint a new
  // one (losing the draft). Resolve to a stable /edit/[slugid] URL instead.
  useEffect(() => {
    fetch('/api/blogs/list?status=draft')
      .then(r => r.ok ? r.json() : { blogs: [] })
      .then(d => {
        const drafts = d.blogs || [];
        if (drafts.length > 0) {
          router.replace('/stories');
        } else {
          router.replace(`/edit/${generateBlogId()}`);
        }
      })
      .catch(() => router.replace(`/edit/${generateBlogId()}`));
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#9b7bf7] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
