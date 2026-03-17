import { create } from 'zustand'

/**
 * Swap black↔white colors on all shapes when theme changes.
 * prevTheme / nextTheme are resolved ('dark' | 'light').
 */
function invertShapeColors(prevResolved, nextResolved) {
  if (prevResolved === nextResolved) return
  const shapes = window.shapes
  if (!shapes || shapes.length === 0) return

  // Going light → dark: #000 → #fff.  Going dark → light: #fff → #000.
  const from = nextResolved === 'light' ? '#ffffff' : '#000000'
  const to   = nextResolved === 'light' ? '#000000' : '#ffffff'

  const normalize = (c) => {
    if (!c || c === 'transparent' || c === 'none') return c
    const lower = c.toLowerCase().trim()
    if (lower === '#fff' || lower === '#ffffff' || lower === 'white') return '#ffffff'
    if (lower === '#000' || lower === '#000000' || lower === 'black') return '#000000'
    return lower
  }

  for (const shape of shapes) {
    let changed = false
    if (shape.options) {
      if (normalize(shape.options.stroke) === from) {
        shape.options.stroke = to
        changed = true
      }
      if (normalize(shape.options.fill) === from) {
        shape.options.fill = to
        changed = true
      }
    }
    // Text shapes store color directly
    if (shape.color !== undefined && normalize(shape.color) === from) {
      shape.color = to
      changed = true
    }
    if (shape.strokeColor !== undefined && normalize(shape.strokeColor) === from) {
      shape.strokeColor = to
      changed = true
    }
    if (changed && typeof shape.draw === 'function') {
      shape.draw()
    }
  }
}

function applyTheme(theme) {
  const html = document.documentElement
  let resolved = theme
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  html.classList.remove('dark', 'light')
  html.classList.add(resolved)

  if (resolved === 'light') {
    html.style.setProperty('--color-surface', '#f0f0f5')
    html.style.setProperty('--color-surface-hover', '#e0e0ea')
    html.style.setProperty('--color-surface-active', '#d0d0e0')
    html.style.setProperty('--color-surface-dark', '#e8e8f0')
    html.style.setProperty('--color-surface-card', '#ffffff')
    html.style.setProperty('--color-text-primary', '#1a1a2e')
    html.style.setProperty('--color-text-secondary', '#2a2a40')
    html.style.setProperty('--color-text-muted', '#6a6a80')
    html.style.setProperty('--color-text-dim', '#9090a0')
    html.style.setProperty('--color-border', '#d0d0dd')
    html.style.setProperty('--color-border-light', '#c0c0d0')
    html.style.setProperty('--color-border-accent', '#8080c0')
    document.body.style.background = '#e8e8f0'
    // Update SVG canvas background
    const svgEl = window.svg
    if (svgEl) svgEl.style.background = '#e8e8f0'
  } else {
    html.style.setProperty('--color-surface', '#232329')
    html.style.setProperty('--color-surface-hover', '#343448')
    html.style.setProperty('--color-surface-active', '#444480')
    html.style.setProperty('--color-surface-dark', '#1a1a20')
    html.style.setProperty('--color-surface-card', '#1e1e28')
    html.style.setProperty('--color-text-primary', '#fff')
    html.style.setProperty('--color-text-secondary', '#e8e8ee')
    html.style.setProperty('--color-text-muted', '#a0a0b0')
    html.style.setProperty('--color-text-dim', '#787888')
    html.style.setProperty('--color-border', '#333')
    html.style.setProperty('--color-border-light', '#3a3a50')
    html.style.setProperty('--color-border-accent', '#5555a0')
    document.body.style.background = '#000'
    const svgEl = window.svg
    if (svgEl) svgEl.style.background = ''
  }
}

const useUIStore = create((set, get) => ({
  // --- Modals ---
  shortcutsModalOpen: false,
  saveModalOpen: false,
  aiModalOpen: false,
  commandPaletteOpen: false,
  helpModalOpen: false,
  exportImageModalOpen: false,
  findBarOpen: false,
  canvasPropertiesOpen: false,
  imageGenerateModalOpen: false,

  toggleShortcutsModal: () =>
    set((s) => ({ shortcutsModalOpen: !s.shortcutsModalOpen })),
  toggleSaveModal: () =>
    set((s) => ({ saveModalOpen: !s.saveModalOpen })),
  toggleAIModal: () =>
    set((s) => ({ aiModalOpen: !s.aiModalOpen })),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleHelpModal: () =>
    set((s) => ({ helpModalOpen: !s.helpModalOpen })),
  toggleExportImageModal: () =>
    set((s) => ({ exportImageModalOpen: !s.exportImageModalOpen })),
  toggleFindBar: () =>
    set((s) => ({ findBarOpen: !s.findBarOpen })),
  closeFindBar: () =>
    set({ findBarOpen: false }),
  toggleCanvasProperties: () =>
    set((s) => ({ canvasPropertiesOpen: !s.canvasPropertiesOpen })),
  toggleImageGenerateModal: () =>
    set((s) => ({ imageGenerateModalOpen: !s.imageGenerateModalOpen })),
  closeImageGenerateModal: () =>
    set({ imageGenerateModalOpen: false }),
  closeAllModals: () =>
    set({ shortcutsModalOpen: false, saveModalOpen: false, aiModalOpen: false, commandPaletteOpen: false, helpModalOpen: false, exportImageModalOpen: false, findBarOpen: false, canvasPropertiesOpen: false, imageGenerateModalOpen: false }),

  // --- Menu ---
  menuOpen: false,
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),

  // --- Workspace ---
  workspaceName: '',
  setWorkspaceName: (name) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lixsketch-workspace-name', name)
    }
    set({ workspaceName: name })
  },

  // --- Save Status ---
  // 'idle' | 'local' | 'cloud'
  saveStatus: 'idle',
  setSaveStatus: (status) => set({ saveStatus: status }),

  // --- Session / Encryption ---
  // Key is persisted in localStorage keyed by session ID so it survives page refreshes.
  // This ensures re-saving a workspace uses the same key, keeping old share links valid.
  sessionEncryptionKey: null,
  setSessionEncryptionKey: (key, sessionId) => {
    if (typeof window !== 'undefined' && sessionId) {
      localStorage.setItem(`lixsketch-enc-key-${sessionId}`, key)
    }
    set({ sessionEncryptionKey: key })
  },
  loadEncryptionKeyForSession: (sessionId) => {
    if (typeof window !== 'undefined' && sessionId) {
      const stored = localStorage.getItem(`lixsketch-enc-key-${sessionId}`)
      if (stored) {
        set({ sessionEncryptionKey: stored })
        return stored
      }
    }
    return null
  },
  clearEncryptionKeyForSession: (sessionId) => {
    if (typeof window !== 'undefined' && sessionId) {
      localStorage.removeItem(`lixsketch-enc-key-${sessionId}`)
    }
    set({ sessionEncryptionKey: null })
  },

  // --- Canvas Loading ---
  canvasLoading: false,
  canvasLoadingMessage: 'Loading canvas...',
  setCanvasLoading: (loading, message) => set({ canvasLoading: loading, canvasLoadingMessage: message || 'Loading canvas...' }),

  // --- Theme ---
  theme: 'dark',
  setTheme: (newTheme) => {
    const prev = get().theme
    const resolve = (t) => t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t
    invertShapeColors(resolve(prev), resolve(newTheme))
    applyTheme(newTheme)
    set({ theme: newTheme })
  },
}))

export default useUIStore
