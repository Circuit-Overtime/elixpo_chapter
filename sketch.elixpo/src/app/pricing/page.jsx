'use client'

/**
 * Pricing is hidden behind a coming-soon screen. All current users
 * remain on the Free tier server-side (worker enforces this regardless
 * of any `users.tier` value). When premium tiers ship, restore the
 * previous version of this file from git history.
 */

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-text-primary font-[lixFont] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-xl w-full text-center flex flex-col items-center gap-7"
      >
        <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center">
          <i className="bx bx-diamond text-3xl text-accent-blue" />
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-3xl">Pricing</h1>
          <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
            Coming soon
          </span>
        </div>

        <p className="text-text-muted text-sm leading-relaxed max-w-md">
          We&apos;re still figuring out the right shape for paid plans.
          Until then, every feature available today is free for everyone —
          no credit card, no signup wall, no quotas beyond fair use.
        </p>

        <div className="w-full bg-surface/60 border border-border-light rounded-2xl p-6 text-left flex flex-col gap-3">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <i className="bx bx-check-circle text-green-400" />
            All shape, drawing, and frame tools
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <i className="bx bx-check-circle text-green-400" />
            Live document editor with markdown
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <i className="bx bx-check-circle text-green-400" />
            End-to-end encrypted cloud storage
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <i className="bx bx-check-circle text-green-400" />
            PNG, SVG, and PDF export
          </div>
          <div className="flex items-center gap-2 text-text-dim text-sm">
            <i className="bx bx-time text-yellow-400/80" />
            AI assistant — coming soon
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-5 py-2 bg-accent-blue hover:bg-accent-blue-hover rounded-lg text-sm transition-all duration-200"
          >
            Start sketching
          </Link>
        </div>

        <p className="text-text-dim text-[11px] mt-2">
          Existing free-tier limits apply (1 cloud workspace, 1 active share link).
        </p>
      </motion.div>
    </div>
  )
}
