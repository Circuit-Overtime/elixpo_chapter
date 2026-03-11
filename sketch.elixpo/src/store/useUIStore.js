import { create } from 'zustand'

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
  }
}

const useUIStore = create((set, get) => ({
  // --- Modals ---
  shortcutsModalOpen: false,
  saveModalOpen: false,
  aiModalOpen: false,

  toggleShortcutsModal: () =>
    set((s) => ({ shortcutsModalOpen: !s.shortcutsModalOpen })),
  toggleSaveModal: () =>
    set((s) => ({ saveModalOpen: !s.saveModalOpen })),
  toggleAIModal: () =>
    set((s) => ({ aiModalOpen: !s.aiModalOpen })),
  closeAllModals: () =>
    set({ shortcutsModalOpen: false, saveModalOpen: false, aiModalOpen: false }),

  // --- Menu ---
  menuOpen: false,
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),

  // --- Workspace ---
  workspaceName: 'Untitled',
  setWorkspaceName: (name) => set({ workspaceName: name }),

  // --- Theme ---
  theme: 'dark',
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
}))

export default useUIStore
