'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WritePage from '../../src/views/WritePage';

function generateBlogId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default function New() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [newSlugId, setNewSlugId] = useState(null);

  useEffect(() => {
    // Check if user has any drafts
    fetch('/api/blogs/list?status=draft')
      .then(r => r.ok ? r.json() : { blogs: [] })
      .then(d => {
        const drafts = d.blogs || [];
        if (drafts.length > 0) {
          // Has drafts — redirect to stories so they can pick
          router.replace('/stories');
        } else {
          // No drafts — generate new blog ID
          setNewSlugId(generateBlogId());
          setChecking(false);
        }
      })
      .catch(() => {
        // API failed — just create a new blog
        setNewSlugId(generateBlogId());
        setChecking(false);
      });
  }, [router]);

  if (checking || !newSlugId) {
    return (
      <div className="min-h-screen bg-[#131922] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#9b7bf7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <WritePage slugid={newSlugId} />;
}
