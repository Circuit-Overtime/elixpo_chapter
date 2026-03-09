import { create } from 'zustand'

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
  setTheme: (theme) => set({ theme }),
}))

export default useUIStore
