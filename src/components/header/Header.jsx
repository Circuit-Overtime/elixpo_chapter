"use client"

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import useUIStore, { MAX_WORKSPACE_NAME_LENGTH } from '@/store/useUIStore'
import useSketchStore from '@/store/useSketchStore'
import useAuthStore from '@/store/useAuthStore'
import { useProfileStore } from '@/hooks/useGuestProfile'
import { persistLayoutMode } from '@/hooks/useDocAutoSave'
import { triggerCloudSync } from '@/hooks/useAutoSave'
import { generateKey, encrypt, decrypt } from '@/utils/encryption'
import { showToast } from '@/utils/toast'

function LayoutModeToggle() {
  const layoutMode = useSketchStore((s) => s.layoutMode)
  const setLayoutMode = useSketchStore((s) => s.setLayoutMode)

  const modes = [
    { key: 'canvas', icon: 'bx-pen', label: 'Canvas', title: 'Canvas only' },
    { key: 'split', icon: 'bx-layout', label: 'Split', title: 'Split: canvas + docs' },
    { key: 'docs', icon: 'bxs-notepad', label: 'Docs', title: 'Document only' },
  ]

  const onPick = (key) => {
    if (key === layoutMode) return
    setLayoutMode(key)
    persistLayoutMode(key)
  }

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-surface/80 backdrop-blur-md rounded-lg border border-border-light p-0.5"
      role="tablist"
      aria-label="Layout mode"
    >
      {modes.map((m) => {
        const active = layoutMode === m.key
        return (
          <button
            key={m.key}
            onClick={() => onPick(m.key)}
            title={m.title}
            aria-selected={active}
            role="tab"
            className={`group flex items-center gap-1.5 h-7 px-2.5 rounded-md transition-all duration-150 cursor-pointer ${
              active
                ? 'bg-accent-blue text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <i className={`bx ${m.icon} text-base leading-none`} />
            <span className="text-[11px] font-medium tracking-wide hidden md:inline">
              {m.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ProfileStatusAvatar({ avatar }) {
  const saveStatus = useUIStore((s) => s.saveStatus)
  const [pulsing, setPulsing] = useState(false)

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

  const synced = saveStatus === 'cloud'
  const statusTitle = {
    cloud: 'Synced to cloud — Ctrl+S to force sync',
    local: 'Saved locally — waiting for cloud sync',
    failed: 'Cloud sync failed — canvas remains stored locally',
    idle: 'Not synced yet',
  }[saveStatus] || 'Not synced yet'
  const statusBorder = synced ? 'border-green-400' : 'border-yellow-400'

  return avatar ? (
    <img
      src={avatar}
      alt=""
      title={statusTitle}
      className={`w-7 h-7 rounded-md border-[3px] ${statusBorder} transition-colors duration-300 ${pulsing ? 'animate-pulse' : ''}`}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      title={statusTitle}
      className={`w-7 h-7 rounded-md border-[3px] ${statusBorder} bg-accent-blue/20 flex items-center justify-center transition-colors duration-300 ${pulsing ? 'animate-pulse' : ''}`}
    >
      <i className="bx bx-user text-xs text-accent-blue" />
    </div>
  )
}

function ProfileDropdown() {
  const profile = useProfileStore((s) => s.profile)
  const setDisplayName = useProfileStore((s) => s.setDisplayName)
  const regenerateProfile = useProfileStore((s) => s.regenerateProfile)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authUser = useAuthStore((s) => s.user)
  const closeMenu = useUIStore((s) => s.closeMenu)
  const [open, setOpen] = useState(false)
  const [testingE2E, setTestingE2E] = useState(false)
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

  const toggleProfileDropdown = () => {
    if (!open) closeMenu()
    setOpen((current) => !current)
  }

  if (!profile && !isAuthenticated) return null

  const testE2E = async () => {
    if (testingE2E) return
    setTestingE2E(true)
    try {
      const probe = `lixsketch-e2e-${Date.now()}`
      const key = await generateKey()
      const ciphertext = await encrypt(probe, key)
      const plaintext = await decrypt(ciphertext, key)
      if (plaintext !== probe || ciphertext === probe) throw new Error('Encryption round trip failed')
      showToast('E2E encryption test passed', { tone: 'success', duration: 2200 })
    } catch (error) {
      console.error('[E2E Test] failed:', error)
      showToast('E2E encryption test failed', { tone: 'warn', duration: 2600 })
    } finally {
      setTestingE2E(false)
    }
  }

  return (
    <div ref={ref} className="relative flex items-center rounded-lg border border-border-light bg-surface/70">
      <button
        onClick={toggleProfileDropdown}
        className="flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 rounded-l-lg hover:bg-surface-hover transition-all duration-200 cursor-pointer"
        title={`${displayName} · canvas and encryption status`}
      >
        <ProfileStatusAvatar avatar={avatar} />
        <span className="e2e-badge flex items-center gap-0.5 px-1.5 py-0.5 rounded border select-none" title="End-to-end encryption enabled">
          <i className="bx bxs-shield text-[11px]" />
          <span className="text-[9px] font-medium">E2E</span>
        </span>
        <i className={`bx bx-chevron-down text-text-dim text-xs transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <span className="w-px h-6 bg-border-light shrink-0" aria-hidden="true" />

      <button
        onClick={testE2E}
        disabled={testingE2E}
        className="h-8 px-2 flex items-center justify-center gap-1 rounded-r-lg text-text-muted hover:text-accent hover:bg-surface-hover transition-all cursor-pointer disabled:cursor-wait disabled:opacity-50"
        title="Test E2E encryption"
        aria-label="Test E2E encryption"
      >
        <i className={`bx ${testingE2E ? 'bx-loader-alt animate-spin' : 'bx-lock-alt'} text-sm`} />
        <span className="text-[10px] hidden lg:inline">Test</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[244px] overflow-hidden bg-surface/95 backdrop-blur-xl border border-border-light rounded-xl p-2 z-[1002] font-[lixFont] shadow-2xl shadow-black/35">
          <div className="flex items-center gap-3 px-2 py-2">
            {avatar ? (
              <img src={avatar} alt="" className="w-11 h-11 rounded-xl border border-border-light" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-11 h-11 rounded-xl border border-border-light bg-accent-blue/15 flex items-center justify-center">
                <i className="bx bx-user text-xl text-accent" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {isGuest ? (
                <input
                  type="text"
                  value={profile?.displayName || ''}
                  onChange={(e) => setDisplayName(e.target.value)}
                  aria-label="Profile display name"
                  className="w-full bg-transparent text-text-primary text-sm outline-none border-b border-transparent focus:border-accent transition-colors cursor-text"
                  spellCheck={false}
                />
              ) : (
                <p className="text-text-primary text-sm truncate" title={displayName}>{displayName}</p>
              )}
              <span className="mt-1 inline-flex items-center rounded-full border border-border-light bg-surface-hover/70 px-1.5 py-0.5 text-text-dim text-[9px] uppercase tracking-wider">
                {isGuest ? 'Guest' : 'Signed in'}
              </span>
              {!isGuest && authUser?.email && (
                <p className="mt-1 text-text-dim text-[10px] truncate" title={authUser.email}>{authUser.email}</p>
              )}
            </div>
          </div>

          <div className="mt-1 border-t border-border-light">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-text-secondary text-xs hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
            >
              <i className="bx bx-user text-base text-text-muted" />
              Profile & Usage
            </Link>
          </div>

          {isGuest && (
            <div className="border-t border-border-light">
              <button
                onClick={() => { regenerateProfile(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-text-secondary text-xs hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
              >
                <i className="bx bx-refresh text-base text-text-muted" />
                New identity
              </button>
            </div>
          )}

          <div className="border-t border-border-light">
            {isGuest ? (
              <button
                onClick={() => { useAuthStore.getState().login(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-accent text-xs hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <i className="bx bx-log-in text-base" />
                Sign in
              </button>
            ) : (
              <button
                onClick={() => { useAuthStore.getState().logout(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-red-400/80 text-xs hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
              >
                <i className="bx bx-log-out text-base" />
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const workspaceName = useUIStore((s) => s.workspaceName)
  const setWorkspaceName = useUIStore((s) => s.setWorkspaceName)
  const workspaceNameAtFocus = useRef(workspaceName)
  const toggleMenu = useUIStore((s) => s.toggleMenu)
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)
  const viewMode = useSketchStore((s) => s.viewMode)
  const zenMode = useSketchStore((s) => s.zenMode)

  const finishWorkspaceNameEdit = () => {
    if (workspaceName === workspaceNameAtFocus.current) return
    workspaceNameAtFocus.current = workspaceName
    useUIStore.getState().setSaveStatus('local')
    void triggerCloudSync()
    showToast('Workspace name updated', { tone: 'success', duration: 1800 })
  }

  // View mode or Zen mode: only show the menu button floating in top-right
  if (viewMode || zenMode) {
    return (
      <div className="fixed top-3 right-4 z-[1001] font-[lixFont]">
        <button
          onClick={toggleMenu}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200 cursor-pointer"
        >
          <i className="bx bx-menu text-xl" />
        </button>
      </div>
    )
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-surface-dark border-b border-border-light z-[1001] flex items-center justify-between px-3 font-[lixFont]">
      {/* Centered layout-mode toggle (canvas / split / docs) */}
      <LayoutModeToggle />
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
          className="w-[26px] h-[26px] rounded-md bg-contain bg-no-repeat bg-center cursor-pointer"
          style={{ backgroundImage: "url('/icon.png')" }}
        />
        {/* Divider */}
        <div className="w-px h-5 bg-border-light" />

        {/* Workspace name */}
        <label className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-hover/50 focus-within:bg-surface-hover/50 transition-all duration-200 cursor-pointer" title="Edit workspace name">
          <i className="bx bx-pencil text-sm text-text-dim pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={workspaceName}
            maxLength={MAX_WORKSPACE_NAME_LENGTH}
            onChange={(e) => setWorkspaceName(e.target.value)}
            onFocus={() => { workspaceNameAtFocus.current = workspaceName }}
            onBlur={finishWorkspaceNameEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            className="bg-transparent text-text-secondary text-sm border-none outline-none w-40 px-0.5 py-0.5 font-[lixFont] cursor-pointer focus:cursor-text"
            aria-label="Workspace name"
            spellCheck={false}
          />
        </label>

      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Profile pill owns identity, save state, and E2E status. */}
        <ProfileDropdown />

        {/* Command palette */}
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface hover:bg-surface-hover text-text-muted text-sm rounded-lg border border-border transition-all duration-200 font-[lixFont] cursor-pointer"
          title="Open command center"
          aria-label="Open command center (Ctrl + /)"
        >
          <i className="bx bx-command text-base" aria-hidden="true" />
          <span>Ctrl + /</span>
        </button>

        {/* Share */}
        <button
          onClick={toggleSaveModal}
          className="px-3.5 py-1.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-sm rounded-lg transition-all duration-200 font-[lixFont] cursor-pointer"
        >
          Share
        </button>

        {/* Hamburger is the far-right control. */}
        <button
          onClick={toggleMenu}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200 cursor-pointer"
        >
          <i className="bx bx-menu text-xl" />
        </button>
      </div>
    </header>
  )
}
