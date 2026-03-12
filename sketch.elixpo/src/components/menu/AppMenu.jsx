"use client"

import { useState } from 'react'
import useUIStore from '@/store/useUIStore'
import useSketchStore from '@/store/useSketchStore'
import useAuthStore from '@/store/useAuthStore'

const CANVAS_BACKGROUNDS = [
  { color: '#000', label: 'Black' },
  { color: '#161718', label: 'Dark Gray' },
  { color: '#13171C', label: 'Blue Black' },
  { color: '#181605', label: 'Dark Yellow' },
  { color: '#1B1615', label: 'Dark Brown' },
]

const LINKS = [
  { label: 'Documentation', icon: 'bx-book-open', href: '/docs' },
  { label: 'GitHub', icon: 'bxl-github', href: 'https://github.com/elixpo/lixsketch' },
  { label: 'Report An Issue', icon: 'bx-bug', href: 'https://github.com/elixpo/lixsketch/issues' },
]

const PREFERENCE_ITEMS = [
  { label: 'Tool lock', shortcut: 'Q', id: 'toolLock' },
  { label: 'Snap to objects', shortcut: 'Alt+S', id: 'snapObjects' },
  { label: 'Toggle grid', shortcut: "Ctrl+'", id: 'toggleGrid' },
  { label: 'Zen mode', shortcut: 'Alt+Z', id: 'zenMode' },
  { label: 'View mode', shortcut: 'Alt+R', id: 'viewMode' },
  { label: 'Canvas & Shape properties', shortcut: 'Alt+/', id: 'properties' },
  { label: 'Arrow binding', id: 'arrowBinding', toggle: true },
  { label: 'Snap to midpoints', id: 'snapMidpoints', toggle: true },
]

export default function AppMenu() {
  const menuOpen = useUIStore((s) => s.menuOpen)
  const closeMenu = useUIStore((s) => s.closeMenu)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette)
  const toggleHelpModal = useUIStore((s) => s.toggleHelpModal)
  const toggleExportImageModal = useUIStore((s) => s.toggleExportImageModal)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const canvasBackground = useSketchStore((s) => s.canvasBackground)
  const setCanvasBackground = useSketchStore((s) => s.setCanvasBackground)
  const clearShapes = useSketchStore((s) => s.clearShapes)
  const clearHistory = useSketchStore((s) => s.clearHistory)
  const gridEnabled = useSketchStore((s) => s.gridEnabled)
  const toggleGrid = useSketchStore((s) => s.toggleGrid)

  const viewMode = useSketchStore((s) => s.viewMode)
  const zenMode = useSketchStore((s) => s.zenMode)
  const toolLock = useSketchStore((s) => s.toolLock)
  const snapToObjects = useSketchStore((s) => s.snapToObjects)
  const toggleViewMode = useSketchStore((s) => s.toggleViewMode)
  const toggleZenMode = useSketchStore((s) => s.toggleZenMode)
  const toggleToolLock = useSketchStore((s) => s.toggleToolLock)
  const toggleSnapToObjects = useSketchStore((s) => s.toggleSnapToObjects)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authUser = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)

  const [prefsOpen, setPrefsOpen] = useState(false)

  // Menu is always accessible (via floating button in view/zen mode)

  const handleOpen = () => {
    const serializer = window.__sceneSerializer
    if (serializer) {
      serializer.upload().then((result) => {
        if (result && result.success) closeMenu()
        else if (result && result.error) {
          console.warn('[Open] Invalid scene file:', result.error)
        }
      })
    }
    closeMenu()
  }

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-[999]"
          onClick={() => { closeMenu(); setPrefsOpen(false) }}
        />
      )}
      <div
        className={`absolute top-14 right-4 w-[220px] max-h-[calc(100vh-70px)] overflow-y-auto no-scrollbar bg-surface/75 backdrop-blur-lg rounded-2xl z-[1000] border border-border-light p-2 font-[lixFont] transition-all duration-200 ${
          menuOpen
            ? 'opacity-100 blur-0 pointer-events-auto'
            : 'opacity-0 blur-[20px] pointer-events-none'
        }`}
      >
        {/* Open */}
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-folder-open text-sm" />
            Open
          </span>
          <span className="text-text-dim text-xs">Ctrl+O</span>
        </button>

        {/* Save & Share */}
        <button
          onClick={() => { toggleSaveModal(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-save text-sm" />
            Save &amp; Share
          </span>
          <span className="text-text-dim text-xs">Ctrl+Shift+S</span>
        </button>

        {/* Export Image */}
        <button
          onClick={() => { toggleExportImageModal(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-image text-sm" />
            Export Image
          </span>
          <span className="text-text-dim text-xs">Ctrl+Shift+E</span>
        </button>

        <hr className="border-border-light my-1.5" />

        {/* Commands - highlighted */}
        <button
          onClick={() => { toggleCommandPalette(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-command text-sm" />
            Commands
          </span>
          <span className="text-text-dim text-xs">Ctrl+/</span>
        </button>

        {/* Find Text */}
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-search text-sm" />
            Find Text
          </span>
          <span className="text-text-dim text-xs">Ctrl+F</span>
        </button>

        {/* Help */}
        <button
          onClick={() => { toggleHelpModal(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-help-circle text-sm" />
            Help
          </span>
        </button>

        <hr className="border-border-light my-1.5" />

        {/* Preferences - inline expandable */}
        <button
          onClick={() => setPrefsOpen((p) => !p)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200 ${prefsOpen ? 'bg-surface-hover' : ''}`}
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-cog text-sm" />
            Preferences
          </span>
          <i className={`bx bx-chevron-down text-sm text-text-dim transition-transform duration-150 ${prefsOpen ? 'rotate-180' : ''}`} />
        </button>

        {prefsOpen && (
          <div className="ml-2 border-l border-border-light pl-1">
            {PREFERENCE_ITEMS.map((item) => {
              const isActive =
                (item.id === 'toolLock' && toolLock) ||
                (item.id === 'snapObjects' && snapToObjects) ||
                (item.id === 'toggleGrid' && gridEnabled) ||
                (item.id === 'zenMode' && zenMode) ||
                (item.id === 'viewMode' && viewMode) ||
                (item.toggle) // arrow binding, snap midpoints default on

              const handleClick = () => {
                if (item.id === 'toolLock') toggleToolLock()
                else if (item.id === 'snapObjects') toggleSnapToObjects()
                else if (item.id === 'toggleGrid') toggleGrid()
                else if (item.id === 'zenMode') { toggleZenMode(); closeMenu() }
                else if (item.id === 'viewMode') { toggleViewMode(); closeMenu() }
              }

              return (
                <button
                  key={item.id}
                  onClick={handleClick}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[11px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
                >
                  <span className="flex items-center gap-2">
                    {isActive && (
                      <i className="bx bx-check text-sm text-accent-blue" />
                    )}
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <span className="text-text-dim text-[10px]">{item.shortcut}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Grid toggle */}
        <button
          onClick={toggleGrid}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-grid-alt text-sm" />
            Show Grid
          </span>
          <div className={`w-7 h-4 rounded-full transition-all duration-150 relative ${gridEnabled ? 'bg-accent-blue' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-150 ${gridEnabled ? 'left-3.5' : 'left-0.5'}`} />
          </div>
        </button>

        {/* Reset The Canvas */}
        <button
          onClick={() => { clearShapes(); clearHistory(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-reset text-sm" />
            Reset The Canvas
          </span>
        </button>

        <hr className="border-border-light my-1.5" />

        {/* Links */}
        {LINKS.map((link) => {
          const isExternal = link.href.startsWith('http')
          return (
            <a
              key={link.label}
              href={link.href}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={closeMenu}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover cursor-pointer transition-all duration-200"
            >
              <i className={`bx ${link.icon} text-sm`} />
              {link.label}
            </a>
          )
        })}

        <hr className="border-border-light my-1.5" />

        {/* Sign In / Sign Out */}
        {isAuthenticated ? (
          <>
            <div className="px-3 py-2 flex items-center gap-2">
              {authUser?.avatar ? (
                <img src={authUser.avatar} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <i className="bx bx-user-circle text-sm text-accent-blue" />
              )}
              <span className="text-text-secondary text-xs truncate flex-1">{authUser?.displayName || authUser?.email}</span>
            </div>
            <button
              onClick={() => { logout(); closeMenu() }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 text-red-400 hover:bg-red-500/10 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <i className="bx bx-log-out text-sm" />
                Sign Out
              </span>
            </button>
          </>
        ) : (
          <button
            onClick={() => { login(); closeMenu() }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 text-text-secondary hover:bg-surface-hover"
          >
            <span className="flex items-center gap-2">
              <i className="bx bx-log-in text-sm" />
              Sign In
            </span>
            <span className="text-text-dim text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue">Elixpo</span>
          </button>
        )}

        <hr className="border-border-light my-1.5" />

        {/* Theme toggle */}
        <div className="px-3 py-2">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2">
            Theme
          </p>
          <div className="flex items-center gap-1">
            {[
              { value: 'light', icon: 'bxs-sun' },
              { value: 'dark', icon: 'bxs-moon' },
              { value: 'system', icon: 'bx-laptop' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-200 ${
                  theme === t.value
                    ? 'bg-accent text-text-primary'
                    : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                <i className={`bx ${t.icon} text-sm`} />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas background */}
        <div className="px-3 py-2">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2">
            Canvas Background
          </p>
          <div className="flex items-center gap-1.5">
            {CANVAS_BACKGROUNDS.map((bg) => (
              <button
                key={bg.color}
                onClick={() => setCanvasBackground(bg.color)}
                title={bg.label}
                className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-all duration-200 ${
                  canvasBackground === bg.color
                    ? 'border-accent scale-110'
                    : 'border-border hover:border-border-light'
                }`}
                style={{ backgroundColor: bg.color }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
