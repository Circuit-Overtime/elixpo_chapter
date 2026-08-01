"use client"

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useUIStore from '@/store/useUIStore'
import useSketchStore from '@/store/useSketchStore'
import useAuthStore from '@/store/useAuthStore'
import { triggerCloudSync, writeLocalScene } from '@/hooks/useAutoSave'
import { triggerDocCloudSync, persistLayoutMode } from '@/hooks/useDocAutoSave'
import { useTranslation } from '@/hooks/useTranslation'
// Issue #38 follow-up: swatches are paired per theme. The light set
// pairs with the soothing warm-off-white canvas; the dark set restores
// the original night palette. The menu picks the matching list at render
// time based on the active theme.
const CANVAS_BACKGROUNDS_LIGHT = [
  { color: '#ffffff', label: 'menu.canvasBg.white' },
  { color: '#fbf9fd', label: 'menu.canvasBg.cream' },
  { color: '#f5f3ed', label: 'menu.canvasBg.paper' },
  { color: '#f0f5fb', label: 'menu.canvasBg.skyTint' },
  { color: '#f0f5ef', label: 'menu.canvasBg.sageTint' },
]
const CANVAS_BACKGROUNDS_DARK = [
  { color: '#000000', label: 'menu.canvasBg.black' },
  { color: '#161718', label: 'menu.canvasBg.darkGray' },
  { color: '#15111f', label: 'menu.canvasBg.blueBlack' },
  { color: '#181605', label: 'menu.canvasBg.darkYellow' },
  { color: '#1B1615', label: 'menu.canvasBg.darkBrown' },
]

export default function AppMenu() {
  const { t, language } = useTranslation()

  const LINKS = [
    { label: t('links.documentation'), icon: 'bx-book-open', href: '/docs' },
    { label: t('links.github'), icon: 'bxl-github', href: 'https://github.com/elixpo/sketch.elixpo' },
    { label: t('links.reportIssue'), icon: 'bx-bug', href: 'https://github.com/elixpo/sketch.elixpo/issues' },
  ]

  const PREFERENCE_ITEMS = [
    { label: t('prefs.toolLock'), shortcut: 'Q', id: 'toolLock' },
    { label: t('prefs.snapObjects'), shortcut: 'Alt+S', id: 'snapObjects' },
    { label: t('prefs.toggleGrid'), shortcut: "Ctrl+'", id: 'toggleGrid' },
    { label: t('prefs.zenMode'), shortcut: 'Alt+Z', id: 'zenMode' },
    { label: t('prefs.viewMode'), shortcut: 'Alt+R', id: 'viewMode' },
    { label: t('prefs.canvasShapeProps'), shortcut: 'Alt+/', id: 'properties' },
    { label: t('prefs.arrowBinding'), id: 'arrowBinding', toggle: true },
    { label: t('prefs.snapMidpoints'), id: 'snapMidpoints', toggle: true },
  ]

  const menuOpen = useUIStore((s) => s.menuOpen)
  const closeMenu = useUIStore((s) => s.closeMenu)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette)
  const toggleHelpModal = useUIStore((s) => s.toggleHelpModal)
  const toggleExportImageModal = useUIStore((s) => s.toggleExportImageModal)
  const theme = useUIStore((s) => s.theme)
  const resolvedTheme = useUIStore((s) => s.resolvedTheme)
  const setTheme = useUIStore((s) => s.setTheme)
  const persistUIPrefs = useUIStore((s) => s.persistUIPrefs)
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

  const layoutMode = useSketchStore((s) => s.layoutMode)
  const setLayoutMode = useSketchStore((s) => s.setLayoutMode)
  const handleSetLayout = (mode) => {
    if (mode === layoutMode) return
    setLayoutMode(mode)
    persistLayoutMode(mode)
  }

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authUser = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)

  const [prefsOpen, setPrefsOpen] = useState(false)
  // Flyouts render through a portal so the vertically scrolling menu never
  // needs overflow-visible. This keeps its bottom edge inside the viewport.
  const [docOpen, setDocOpen] = useState(false)
  const [docFlyoutPosition, setDocFlyoutPosition] = useState({ top: 0, left: 0 })
  const [prefsFlyoutPosition, setPrefsFlyoutPosition] = useState({ top: 0, left: 0 })
  const docButtonRef = useRef(null)
  const prefsButtonRef = useRef(null)

  const flyoutPosition = (button, width, estimatedHeight) => {
    const rect = button?.getBoundingClientRect()
    if (!rect || typeof window === 'undefined') return { top: 8, left: 8 }
    return {
      top: Math.max(8, Math.min(rect.top, window.innerHeight - estimatedHeight - 8)),
      left: Math.max(8, rect.left - width - 8),
    }
  }

  const toggleDocumentFlyout = () => {
    const opening = !docOpen
    setPrefsOpen(false)
    setDocOpen(opening)
    if (opening) setDocFlyoutPosition(flyoutPosition(docButtonRef.current, 220, 126))
  }

  const togglePreferencesFlyout = () => {
    const opening = !prefsOpen
    setDocOpen(false)
    setPrefsOpen(opening)
    if (opening) setPrefsFlyoutPosition(flyoutPosition(prefsButtonRef.current, 240, Math.min(window.innerHeight * .6, 420)))
  }

  const preferenceIsActive = (item) =>
    (item.id === 'toolLock' && toolLock) ||
    (item.id === 'snapObjects' && snapToObjects) ||
    (item.id === 'toggleGrid' && gridEnabled) ||
    (item.id === 'zenMode' && zenMode) ||
    (item.id === 'viewMode' && viewMode) ||
    item.toggle

  const handlePreference = (item) => {
    if (item.id === 'toolLock') toggleToolLock()
    else if (item.id === 'snapObjects') toggleSnapToObjects()
    else if (item.id === 'toggleGrid') toggleGrid()
    else if (item.id === 'zenMode') { toggleZenMode(); closeMenu() }
    else if (item.id === 'viewMode') { toggleViewMode(); closeMenu() }
  }

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
          className="fixed inset-0 z-999"
          onClick={() => { closeMenu(); setPrefsOpen(false); setDocOpen(false) }}
        />
      )}
      <div
        onScroll={() => { setPrefsOpen(false); setDocOpen(false) }}
        className={`absolute top-14 right-4 w-[230px] max-h-[calc(100vh-72px)] overflow-y-auto overscroll-contain no-scrollbar bg-surface/75 backdrop-blur-lg rounded-2xl z-[1000] border border-border-light p-1.5 font-[lixFont] text-[13px] transition-all duration-200 ${
          menuOpen
            ? 'opacity-100 blur-0 pointer-events-auto'
            : 'opacity-0 blur-[20px] pointer-events-none'
        }`}
      >
        {/* Open */}
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-folder-open text-sm" />
            {t('menu.open')}
          </span>
          <span className="text-text-dim text-xs">Ctrl+O</span>
        </button>

        {/* Quick Save */}
        <button
          onClick={() => {
            const serializer = window.__sceneSerializer
            if (serializer) {
              const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
              const sceneData = serializer.save(workspaceName)
              const sessionId = window.__sessionID
              if (sessionId) {
                writeLocalScene(`lixsketch-autosave-${sessionId}`, sceneData)
              }
              useUIStore.getState().setSaveStatus('local')
              triggerCloudSync()
            }
            closeMenu()
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-check-circle text-sm" />
            {t('menu.quickSave')}
          </span>
          <span className="text-text-dim text-xs">Ctrl+S</span>
        </button>

        {/* Save & Share */}
        <button
          onClick={() => { toggleSaveModal(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-save text-sm" />
            {t('menu.saveShare')}
          </span>
          <span className="text-text-dim text-xs">Ctrl+Shift+S</span>
        </button>

        {/* Export Image */}
        <button
          onClick={() => { toggleExportImageModal(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-image text-sm" />
            {t('menu.exportImage')}
          </span>
          <span className="text-text-dim text-xs">Ctrl+Shift+E</span>
        </button>

        <hr className="border-border-light my-1" />

        {/* Commands - highlighted */}
        <button
          onClick={() => { toggleCommandPalette(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-command text-sm" />
            {t('menu.commands')}
          </span>
          <span className="text-text-dim text-xs">Ctrl+/</span>
        </button>

        {/* Find Text */}
        <button
          onClick={() => { useUIStore.getState().toggleFindBar(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-search text-sm" />
            {t('menu.findText')}
          </span>
          <span className="text-text-dim text-xs">Ctrl+F</span>
        </button>

        {/* Canvas Properties */}
        <button
          onClick={() => { useUIStore.getState().toggleCanvasProperties(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-info-circle text-sm" />
            {t('menu.canvasProperties')}
          </span>
        </button>

        {/* Help */}
        <button
          onClick={() => { toggleHelpModal(); closeMenu() }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-help-circle text-sm" />
            {t('menu.help')}
          </span>
        </button>

        <hr className="border-border-light my-1" />

        <div className="relative">
          {/* The flyout is portalled below so this menu remains scrollable. */}
          <button
            ref={docButtonRef}
            onClick={toggleDocumentFlyout}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200 ${docOpen ? 'bg-surface-hover' : ''}`}
          >
            <span className="flex items-center gap-2">
              <i className="bx bx-file-blank text-sm" />
              Document
            </span>
            <i className="bx bx-chevron-left text-sm text-text-dim" />
          </button>

        </div>

        {/* Sync doc now (Ctrl+S triggers both, but explicit action is useful from menu) */}
        <button
          onClick={() => {
            triggerCloudSync()
            triggerDocCloudSync()
            closeMenu()
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-cloud-upload text-sm" />
            Sync canvas + doc
          </span>
          <span className="text-text-dim text-xs">Ctrl+S</span>
        </button>

        <hr className="border-border-light my-1" />

        <div className="relative">
          <button
            ref={prefsButtonRef}
            onClick={togglePreferencesFlyout}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200 ${prefsOpen ? 'bg-surface-hover' : ''}`}
          >
            <span className="flex items-center gap-2">
              <i className="bx bx-cog text-sm" />
              {t('menu.preferences')}
            </span>
            <i className="bx bx-chevron-left text-sm text-text-dim" />
          </button>

        </div>

        {/* Grid toggle */}
        <button
          onClick={toggleGrid}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-grid-alt text-sm" />
            {t('menu.showGrid')}
          </span>
          <div className={`w-7 h-4 rounded-full transition-all duration-150 relative ${gridEnabled ? 'bg-accent-blue' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-150 ${gridEnabled ? 'left-3.5' : 'left-0.5'}`} />
          </div>
        </button>

        {/* Reset The Canvas */}
        <button
          onClick={() => {
            const serializer = window.__sceneSerializer
            if (serializer?.resetCanvas) serializer.resetCanvas()
            clearShapes(); clearHistory(); closeMenu()
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-red-400 text-xs hover:bg-red-500/10 cursor-pointer transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-reset text-sm" />
            {t('menu.resetCanvas')}
          </span>
        </button>

        <hr className="border-border-light my-1" />

        {/* Links */}
        {LINKS.map((link) => {
          const isExternal = link.href.startsWith('http')
          return (
            <a
              key={link.label}
              href={link.href}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={closeMenu}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
            >
              <i className={`bx ${link.icon} text-sm`} />
              {link.label}
            </a>
          )
        })}

        <hr className="border-border-light my-1" />

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
                {t('menu.signOut')}
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
              {t('menu.signIn')}
            </span>
            <span className="text-text-dim text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue">Elixpo</span>
          </button>
        )}

        <hr className="border-border-light my-1" />

        {/* Theme toggle */}
        <div className="px-3 py-2">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-2">
            {t('menu.theme')}
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
            {t('menu.canvasBackground')}
          </p>
          <div className="flex items-center gap-1.5">
            {(resolvedTheme === 'dark' ? CANVAS_BACKGROUNDS_DARK : CANVAS_BACKGROUNDS_LIGHT).map((bg) => (
              <button
                key={bg.color}
                onClick={() => setCanvasBackground(bg.color)}
                title={t(bg.label)}
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

      {menuOpen && typeof document !== 'undefined' && createPortal(
        <>
          {docOpen && (
            <div
              className="fixed w-[220px] bg-surface-card border border-border-light rounded-2xl p-1.5 shadow-2xl shadow-black/40 z-[1001] font-[lixFont]"
              style={docFlyoutPosition}
            >
              {[
                { key: 'canvas', icon: 'bx-pen', label: 'Canvas' },
                { key: 'split', icon: 'bx-layout', label: 'Split' },
                { key: 'docs', icon: 'bxs-notepad', label: 'Docs' },
              ].map((mode) => {
                const active = layoutMode === mode.key
                return (
                  <button
                    key={mode.key}
                    onClick={() => { handleSetLayout(mode.key); setDocOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[11px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
                  >
                    <span className="flex items-center gap-2">
                      {active && <i className="bx bx-check text-sm text-accent-blue" />}
                      <i className={`bx ${mode.icon} text-xs ${active ? 'text-accent-blue' : 'text-text-muted'}`} />
                      {mode.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {prefsOpen && (
            <div
              className="fixed w-[240px] max-h-[60vh] overflow-y-auto overscroll-contain no-scrollbar bg-surface-card border border-border-light rounded-2xl p-1.5 shadow-2xl shadow-black/40 z-[1001] font-[lixFont]"
              style={prefsFlyoutPosition}
            >
              <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[11px]">
                <span>{t('prefs.language')}</span>
                <select
                  className="bg-surface-hover text-text-primary text-[10px] rounded px-1 outline-none border border-border-light"
                  value={language}
                  onChange={(e) => persistUIPrefs({ language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="bg">Български</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              {PREFERENCE_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handlePreference(item)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[11px] hover:bg-surface-hover cursor-pointer transition-all duration-200"
                >
                  <span className="flex items-center gap-2">
                    {preferenceIsActive(item) && <i className="bx bx-check text-sm text-accent-blue" />}
                    {item.label}
                  </span>
                  {item.shortcut && <span className="text-text-dim text-[10px]">{item.shortcut}</span>}
                </button>
              ))}
            </div>
          )}
        </>,
        document.body,
      )}
    </>
  )
}
