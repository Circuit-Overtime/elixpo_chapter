'use client'

import { useParams } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { getBlogPost, blogPosts } from '@/content/blog'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'

// Raw markdown imports
import e2eEncryption from '@/content/blog/e2e-encryption.md'
import websocketCollaboration from '@/content/blog/websocket-collaboration.md'
import lixscriptDsl from '@/content/blog/lixscript-dsl.md'
import roughjsCanvas from '@/content/blog/roughjs-canvas.md'

const contentMap = {
  'e2e-encryption': e2eEncryption,
  'websocket-collaboration': websocketCollaboration,
  'lixscript-dsl': lixscriptDsl,
  'roughjs-canvas': roughjsCanvas,
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = getBlogPost(slug)
  const content = contentMap[slug]

  if (!post || !content) {
    return (
      <div className="min-h-screen bg-surface-dark text-text-primary font-[lixFont] flex items-center justify-center">
        <div className="text-center">
          <i className="bx bx-error-circle text-4xl text-text-dim mb-3" />
          <h1 className="text-xl font-medium mb-2">Post Not Found</h1>
          <p className="text-text-dim text-sm mb-6">This blog post doesn't exist.</p>
          <Link href="/docs" className="text-accent-blue text-sm hover:underline">Back to Docs</Link>
        </div>
      </div>
    )
  }

  // Find prev/next posts
  const currentIndex = blogPosts.findIndex(p => p.slug === slug)
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-surface-dark text-text-primary font-[lixFont]">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-dark/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/Images/logo.png" alt="LixSketch" className="w-7 h-7" />
              <span className="text-text-primary font-medium">LixSketch</span>
            </Link>
            <span className="text-text-dim">/</span>
            <Link href="/docs" className="text-text-muted hover:text-text-primary transition-colors">Docs</Link>
            <span className="text-text-dim">/</span>
            <span className="text-text-muted">Blog</span>
          </div>
          <Link href="/docs" className="text-text-muted text-sm hover:text-text-primary transition-colors">
            <i className="bx bx-arrow-back mr-1" />
            Back to Docs
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto pt-20 pb-16 px-6">
        {/* Post header — distinct from body */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
              <i className={`${post.icon} text-xl text-accent-blue`} />
            </div>
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-[10px] rounded-md bg-accent-blue/8 border border-accent-blue/15 text-accent-blue/70 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-4 leading-tight">{post.title}</h1>
          <p className="text-text-secondary text-lg leading-relaxed">{post.description}</p>
          <p className="text-text-dim text-xs mt-4">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <hr className="border-white/[0.06] mb-10" />

        {/* Content */}
        <MarkdownRenderer content={content} />

        {/* Prev / Next navigation */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prevPost ? (
            <Link
              href={`/docs/blog/${prevPost.slug}`}
              className="group p-4 rounded-xl border border-white/[0.06] hover:border-accent-blue/30 transition-all"
            >
              <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Previous</p>
              <p className="text-text-secondary text-sm group-hover:text-accent-blue transition-colors">{prevPost.title}</p>
            </Link>
          ) : <div />}
          {nextPost ? (
            <Link
              href={`/docs/blog/${nextPost.slug}`}
              className="group p-4 rounded-xl border border-white/[0.06] hover:border-accent-blue/30 transition-all text-right"
            >
              <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Next</p>
              <p className="text-text-secondary text-sm group-hover:text-accent-blue transition-colors">{nextPost.title}</p>
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  )
}
