"use client"

import { useEffect } from 'react'
import useSketchStore, { TOOLS, SHORTCUT_MAP } from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'

export default function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e) {
      const key = e.key.toLowerCase()

      // Global Ctrl shortcuts (work even when typing)
      if (e.ctrlKey || e.metaKey) {
        if (key === 's') {
          e.preventDefault()
          useUIStore.getState().toggleSaveModal()
          return
        }
        if (key === '/') {
          e.preventDefault()
          useUIStore.getState().toggleShortcutsModal()
          return
        }
      }

      // Skip if user is typing in an input, textarea, or contenteditable
      const tag = e.target.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return
      if (document.querySelector('.text-edit-overlay:not(.hidden)')) return

      const store = useSketchStore.getState()

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (key === 'a' && !e.shiftKey) {
          e.preventDefault()
          store.setActiveTool(TOOLS.SELECT)
          // Select all will be handled by engine
          return
        }
        if (key === 'g' && !e.shiftKey) {
          e.preventDefault()
          // Group — handled by engine
          return
        }
        if (key === 'g' && e.shiftKey) {
          e.preventDefault()
          // Ungroup — handled by engine
          return
        }
        if (key === 'd') {
          e.preventDefault()
          // Duplicate — handled by engine
          return
        }
        return
      }

      // Tool switching shortcuts (no modifier keys)
      if (!e.shiftKey && !e.altKey) {
        const tool = SHORTCUT_MAP[key]
        if (tool) {
          e.preventDefault()
          store.setActiveTool(tool)
          return
        }

        if (e.key === 'Escape') {
          const uiStore = useUIStore.getState()
          if (uiStore.shortcutsModalOpen) {
            uiStore.toggleShortcutsModal()
            return
          }
          if (uiStore.saveModalOpen) {
            uiStore.toggleSaveModal()
            return
          }
          if (uiStore.menuOpen) {
            uiStore.closeMenu()
            return
          }
          // Deselect all — handled by engine
          store.setCurrentShape(null)
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
