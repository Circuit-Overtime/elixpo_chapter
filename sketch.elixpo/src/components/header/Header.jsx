"use client"

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import useUIStore from '@/store/useUIStore'
import useSketchStore from '@/store/useSketchStore'
import useAuthStore from '@/store/useAuthStore'
import { useProfileStore } from '@/hooks/useGuestProfile'

function ProfileDropdown() {
  const profile = useProfileStore((s) => s.profile)
  const setDisplayName = useProfileStore((s) => s.setDisplayName)
  const regenerateProfile = useProfileStore((s) => s.regenerateProfile)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authUser = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Use auth user if signed in, otherwise guest profile
  const displayName = isAuthenticated ? (authUser?.displayName || authUser?.email) : profile?.displayName
  const avatar = isAuthenticated ? authUser?.avatar : profile?.avatar
  const isGuest = !isAuthenticated

  if (!profile && !isAuthenticated) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-surface-hover transition-all duration-200"
        title={displayName}
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-6 h-6 rounded-md" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-6 h-6 rounded-md bg-accent-blue/20 flex items-center justify-center">
            <i className="bx bx-user text-xs text-accent-blue" />
          </div>
        )}
        <span className="text-text-muted text-xs max-w-[80px] truncate hidden sm:block">
          {displayName}
        </span>
        <i className={`bx bx-chevron-down text-text-dim text-xs transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[220px] bg-surface/90 backdrop-blur-lg border border-border-light rounded-xl p-3 z-[1002] font-[lixFont]">
          <div className="flex items-center gap-2.5 mb-3">
            {avatar ? (
              <img src={avatar} alt="" className="w-10 h-10 rounded-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                <i className="bx bx-user text-lg text-accent-blue" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {isGuest ? (
                <input
                  type="text"
                  value={profile?.displayName || ''}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-transparent text-text-primary text-sm outline-none border-b border-transparent focus:border-accent-blue transition-all"
                  spellCheck={false}
                />
              ) : (
                <p className="text-text-primary text-sm truncate">{displayName}</p>
              )}
              <span className="text-text-dim text-[10px]">
                {isGuest ? 'Guest' : 'Signed in'}
              </span>
              {!isGuest && authUser?.email && (
                <p className="text-text-dim text-[10px] truncate">{authUser.email}</p>
              )}
            </div>
          </div>

          <div className="border-t border-white/[0.06] mt-2 pt-2 flex flex-col gap-0.5">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover transition-all duration-200"
            >
              <i className="bx bx-user text-sm" />
              Profile & Usage
            </Link>

            {isGuest && (
              <button
                onClick={() => { regenerateProfile(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover transition-all duration-200"
              >
                <i className="bx bx-refresh text-sm" />
                New identity
              </button>
            )}

            {isGuest ? (
              <button
                onClick={() => { useAuthStore.getState().login(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-accent-blue text-xs hover:bg-accent-blue/10 transition-all duration-200"
              >
                <i className="bx bx-log-in text-sm" />
                Sign in
              </button>
            ) : (
              <button
                onClick={() => { useAuthStore.getState().logout(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-red-400/70 text-xs hover:bg-red-500/10 transition-all duration-200"
              >
                <i className="bx bx-log-out text-sm" />
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SaveStatusDot() {
  const saveStatus = useUIStore((s) => s.saveStatus)
  const [pulsing, setPulsing] = useState(false)

  // Listen for local save events to trigger a pulse
  useEffect(() => {
    let timer
    window.__onLocalSave = () => {
      setPulsing(true)
      clearTimeout(timer)
      timer = setTimeout(() => setPulsing(false), 800)
    }
    return () => {
      window.__onLocalSave = null
      clearTimeout(timer)
    }
  }, [])

  if (saveStatus === 'idle') return null

  const colorMap = {
    cloud: 'bg-green-400',
    local: 'bg-yellow-400',
    failed: 'bg-red-400',
  }
  const titleMap = {
    cloud: 'Synced to cloud — Ctrl+S to force sync',
    local: 'Saved locally — auto-syncs every 5min or press Ctrl+S',
    failed: 'Sync failed — will retry automatically',
  }
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${colorMap[saveStatus] || 'bg-yellow-400'} ${pulsing ? 'animate-pulse' : ''}`}
      title={titleMap[saveStatus] || ''}
    />
  )
}

export default function Header() {
  const workspaceName = useUIStore((s) => s.workspaceName)
  const setWorkspaceName = useUIStore((s) => s.setWorkspaceName)
  const toggleMenu = useUIStore((s) => s.toggleMenu)
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette)
  const toggleHelpModal = useUIStore((s) => s.toggleHelpModal)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)
  const viewMode = useSketchStore((s) => s.viewMode)
  const zenMode = useSketchStore((s) => s.zenMode)

  // View mode or Zen mode: only show the menu button floating in top-right
  if (viewMode || zenMode) {
    return (
      <div className="fixed top-3 right-4 z-[1001] font-[lixFont]">
        <button
          onClick={toggleMenu}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-menu text-xl" />
        </button>
      </div>
    )
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-surface-dark border-b border-[#2c2c35] z-[1001] flex items-center justify-between px-3 font-[lixFont]">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div
          onClick={() => {
            if (window.location.pathname === '/') {
              window.location.reload()
            } else {
              window.location.href = '/'
            }
          }}
          className="w-[26px] h-[26px] bg-contain bg-no-repeat bg-center cursor-pointer"
          style={{ backgroundImage: "url('/Images/logo.png')" }}
        />
        {/* Divider */}
        <div className="w-px h-5 bg-[#2c2c35]" />

        {/* Workspace name */}
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          className="bg-transparent text-text-secondary text-sm border-none outline-none w-40 px-1.5 py-1 rounded hover:bg-surface-hover/50 focus:bg-surface-hover/50 transition-all duration-200 font-[lixFont]"
          spellCheck={false}
        />

      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Save status dot */}
        <SaveStatusDot />
        {/* E2E Shield badge */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400/80 cursor-default select-none"
          title="End-to-end encrypted — your data never leaves your device unencrypted"
        >
          <i className="bx bxs-shield text-sm" />
          <span className="text-[10px] font-medium">E2E</span>
        </div>

        {/* Help icon */}
        <button
          onClick={toggleHelpModal}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-help-circle text-lg" />
        </button>

        {/* Share button */}
        <button
          onClick={toggleSaveModal}
          className="px-3.5 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-text-primary text-sm rounded-lg transition-all duration-200 font-[lixFont]"
        >
          Share
        </button>

        {/* Shortcuts button */}
        <button
          onClick={toggleCommandPalette}
          className="px-2.5 py-1.5 bg-surface hover:bg-surface-hover text-text-muted text-sm rounded-lg border border-border transition-all duration-200 font-[lixFont]"
        >
          Ctrl+/
        </button>

        {/* Profile */}
        <ProfileDropdown />

        {/* Hamburger menu */}
        <button
          onClick={toggleMenu}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-menu text-xl" />
        </button>
      </div>
    </header>
  )
}
