"use client"

import { useEffect } from 'react'
import useUIStore from '@/store/useUIStore'

/**
 * AI features are temporarily disabled while we redesign the assistant.
 * The modal still opens (so existing UI buttons work) but renders a
 * coming-soon panel and never hits the worker. The /api/ai/* endpoints
 * are also gated server-side (returns 503).
 */
export default function AIModal() {
  const aiModalOpen = useUIStore((s) => s.aiModalOpen)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)

  useEffect(() => {
    if (!aiModalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') toggleAIModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aiModalOpen, toggleAIModal])

  if (!aiModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm font-[lixFont]"
      onClick={toggleAIModal}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[440px] max-w-[92vw] bg-surface-dark border border-border-light rounded-2xl p-7 shadow-2xl"
      >
        <button
          onClick={toggleAIModal}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          title="Close (Esc)"
        >
          <i className="bx bx-x text-2xl" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center">
            <i className="bx bx-bot text-3xl text-accent-blue" />
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-text-primary text-lg font-medium">AI Assistant</h2>
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
              Coming soon
            </span>
          </div>

          <p className="text-text-muted text-sm leading-relaxed max-w-[340px]">
            We&apos;re rebuilding the AI assistant with better diagram generation,
            smarter prompts, and tighter integration with your canvas. It&apos;ll
            ship in an upcoming release.
          </p>

          <div className="w-full h-px bg-border-light/60 my-1" />

          <div className="text-text-dim text-xs">
            Want a heads-up when it&apos;s ready?{' '}
            <a
              href="mailto:hello@elixpo.com?subject=Notify%20me%20when%20LixSketch%20AI%20launches"
              className="text-accent-blue hover:text-accent-blue-hover underline underline-offset-2"
            >
              Let us know
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
