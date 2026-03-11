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
          useUIStore.getState().toggleCommandPalette()
          return
        }
        if (key === 'o') {
          e.preventDefault()
          const serializer = window.__sceneSerializer
          if (serializer) serializer.upload()
          return
        }
        if (key === 'e' && e.shiftKey) {
          e.preventDefault()
          useUIStore.getState().toggleExportImageModal()
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
          // Select all shapes via engine's multiSelection
          if (window.multiSelection && window.shapes) {
            window.multiSelection.clearSelection()
            window.shapes.forEach(shape => {
              window.multiSelection.addShape(shape)
            })
          }
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
        if (key === "'") {
          e.preventDefault()
          useSketchStore.getState().toggleGrid()
          return
        }
        return
      }

      // Delete / Backspace — delete selected shape(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()

        // Multi-selection delete
        if (window.multiSelection && window.multiSelection.selectedShapes && window.multiSelection.selectedShapes.size > 0) {
          if (typeof window.deleteSelectedShapes === 'function') {
            window.deleteSelectedShapes()
          }
          return
        }

        // Single shape delete via engine's currentShape
        if (window.currentShape) {
          const shape = window.currentShape
          const shapes = window.shapes

          // Remove from shapes array
          if (shapes) {
            const idx = shapes.indexOf(shape)
            if (idx !== -1) shapes.splice(idx, 1)
          }

          // Cleanup arrow attachments
          if (typeof window.cleanupAttachments === 'function') {
            window.cleanupAttachments(shape)
          }

          // Remove from parent frame
          if (shape.parentFrame && typeof shape.parentFrame.removeShapeFromFrame === 'function') {
            shape.parentFrame.removeShapeFromFrame(shape)
          }

          // Remove from DOM
          const el = shape.group || shape.element
          if (el && el.parentNode) {
            el.parentNode.removeChild(el)
          }

          // Push undo action
          if (typeof window.pushDeleteAction === 'function') {
            window.pushDeleteAction(shape)
          }

          window.currentShape = null
          if (typeof window.disableAllSideBars === 'function') {
            window.disableAllSideBars()
          }
        }
        return
      }

      // Alt shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (key === 'z') {
          e.preventDefault()
          useSketchStore.getState().toggleZenMode()
          return
        }
        if (key === 'r') {
          e.preventDefault()
          useSketchStore.getState().toggleViewMode()
          return
        }
        if (key === 's') {
          e.preventDefault()
          useSketchStore.getState().toggleSnapToObjects()
          return
        }
        return
      }

      // Tool switching shortcuts (no modifier keys)
      if (!e.shiftKey && !e.altKey) {
        if (key === 'q') {
          e.preventDefault()
          store.toggleToolLock()
          return
        }

        const tool = SHORTCUT_MAP[key]
        if (tool) {
          e.preventDefault()
          store.setActiveTool(tool)
          return
        }

        if (e.key === 'Escape') {
          // Exit view mode or zen mode first
          if (store.viewMode) {
            store.toggleViewMode()
            return
          }
          if (store.zenMode) {
            store.toggleZenMode()
            return
          }
          const uiStore = useUIStore.getState()
          if (uiStore.commandPaletteOpen) {
            uiStore.toggleCommandPalette()
            return
          }
          if (uiStore.exportImageModalOpen) {
            uiStore.toggleExportImageModal()
            return
          }
          if (uiStore.helpModalOpen) {
            uiStore.toggleHelpModal()
            return
          }
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

    // Prevent browser zoom on Ctrl+scroll — engine's ZoomPan.js handles actual zoom
    function handleWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    // Space held = temporary pan tool
    let spaceHeld = false
    let toolBeforeSpace = null

    function handleKeyUp(e) {
      if (e.code === 'Space' && spaceHeld) {
        spaceHeld = false
        if (toolBeforeSpace) {
          useSketchStore.getState().setActiveTool(toolBeforeSpace)
          toolBeforeSpace = null
        }
      }
    }

    function handleSpaceDown(e) {
      if (e.code === 'Space' && !spaceHeld) {
        const tag = e.target.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return
        e.preventDefault()
        spaceHeld = true
        const store = useSketchStore.getState()
        if (store.activeTool !== TOOLS.PAN) {
          toolBeforeSpace = store.activeTool
          store.setActiveTool(TOOLS.PAN)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleSpaceDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleSpaceDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])
}
