'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/store/useAuthStore'

function OpenCanvasButton({ className }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const handleClick = () => {
    if (isAuthenticated) {
      router.push('/profile')
    } else {
      const id = `lx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      router.push(`/c/${id}?new=1`)
    }
  }

  return (
    <button onClick={handleClick} className={className}>
      {isAuthenticated ? 'My Canvases' : 'Open Canvas'}
    </button>
  )
}

const resourceLinks = [
  { href: '/resources/how-to-start', label: 'How to start', icon: 'bx bx-rocket' },
  { href: '/resources/community', label: 'Community', icon: 'bx bx-group' },
  { href: '/resources/use-cases', label: 'Use Cases', icon: 'bx bx-bulb' },
  { href: '/resources/security', label: 'Security', icon: 'bx bx-shield' },
  { href: '/docs', label: 'Docs', icon: 'bx bx-book-open' },
]

export default function LandingNav() {
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setResourcesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
    >
      <div className="backdrop-blur-xl bg-[#13171C]/80 px-6 py-3 flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img src="/Images/logo.png" alt="LixSketch" className="w-7 h-7 invert" />
          <span className="text-lg tracking-wide text-text-secondary">LixSketch</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-text-muted">
          <Link href="/pricing" className="hover:text-text-primary transition-colors">
            Pricing
          </Link>
          <Link href="/teams" className="hover:text-text-primary transition-colors">
            Teams
          </Link>
          <Link href="/roadmap" className="hover:text-text-primary transition-colors">
            Roadmap
          </Link>
          <Link href="/docs#blog" className="hover:text-text-primary transition-colors">
            Blog
          </Link>

          {/* Resources dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
            >
              Resources
              <i className={`bx bx-chevron-down text-base transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {resourcesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-52 bg-surface-card border border-border-light rounded-xl overflow-hidden shadow-2xl shadow-black/40"
                >
                  {resourceLinks.map((item) => {
                    const Tag = item.external ? 'a' : Link
                    const extraProps = item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
                    return (
                      <Tag
                        key={item.href}
                        href={item.href}
                        onClick={() => setResourcesOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-150 text-sm"
                        {...extraProps}
                      >
                        <i className={`${item.icon} text-base text-text-dim`} />
                        {item.label}
                        {item.external && <i className="bx bx-link-external text-xs text-text-dim ml-auto" />}
                      </Tag>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/elixpo/lixsketch"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted hover:text-text-primary border border-border-light hover:border-white/20 rounded-lg transition-all duration-200"
          >
            <i className="bx bxl-github text-lg" />
            <i className="bx bx-star text-sm" />
            <span className="hidden lg:inline">GitHub</span>
          </a>

          <OpenCanvasButton className="px-4 py-2 cursor-pointer bg-accent-blue hover:bg-accent-blue-hover text-white text-sm rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-accent-blue/20" />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <i className={`bx ${mobileOpen ? 'bx-x' : 'bx-menu'} text-2xl`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden backdrop-blur-xl bg-[#13171C]/95 border-b border-white/5 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {[
                { href: '/pricing', label: 'Pricing' },
                { href: '/teams', label: 'Teams' },
                { href: '/roadmap', label: 'Roadmap' },
                { href: '/docs#blog', label: 'Blog' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 text-text-muted hover:text-text-primary transition-colors text-sm"
                >
                  {item.label}
                </Link>
              ))}

              <div className="py-2 text-text-dim text-xs uppercase tracking-wider mt-2">Resources</div>
              {resourceLinks.map((item) => {
                const Tag = item.external ? 'a' : Link
                const extraProps = item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
                return (
                  <Tag
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 py-2 text-text-muted hover:text-text-primary transition-colors text-sm pl-1"
                    {...extraProps}
                  >
                    <i className={`${item.icon} text-sm text-text-dim`} />
                    {item.label}
                    {item.external && <i className="bx bx-link-external text-xs text-text-dim ml-1" />}
                  </Tag>
                )
              })}

              <a
                href="https://github.com/elixpo/lixsketch"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-2.5 text-text-muted hover:text-text-primary transition-colors text-sm mt-2 border-t border-white/5 pt-3"
              >
                <i className="bx bxl-github text-base" />
                <i className="bx bx-star text-sm" />
                Star us on GitHub
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
