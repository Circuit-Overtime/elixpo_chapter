"use client"

import { useState, useEffect, useRef } from 'react'
import useUIStore from '@/store/useUIStore'
import useSketchStore, { TOOLS } from '@/store/useSketchStore'

const COMMANDS = [
  // --- App ---
  { label: 'Library', icon: 'bx-library', section: 'App' },
  { label: 'Find on canvas', icon: 'bx-search', section: 'App', shortcut: 'Ctrl+F', action: 'findOnCanvas' },
  { label: 'Live collaboration...', icon: 'bx-group', section: 'App' },
  { label: 'Share', icon: 'bx-share-alt', section: 'App' },
  { label: 'Toggle theme', icon: 'bx-sun', section: 'App', action: 'toggleTheme' },

  // --- Export ---
  { label: 'Export image...', icon: 'bx-image', section: 'Export', shortcut: 'Ctrl+Shift+E', action: 'exportImage' },
  { label: 'Save to disk', icon: 'bx-download', section: 'Export', shortcut: 'Ctrl+S', action: 'save' },
  { label: 'Copy to clipboard as PNG', icon: 'bx-clipboard', section: 'Export', shortcut: 'Shift+Alt+C', action: 'copyPNG' },
  { label: 'Copy to clipboard as SVG', icon: 'bx-code-alt', section: 'Export', shortcut: null, action: 'copySVG' },
  { label: 'Open scene file', icon: 'bx-folder-open', section: 'Export', shortcut: 'Ctrl+O', action: 'load' },

  // --- Editor ---
  { label: 'Undo', icon: 'bx-undo', section: 'Editor', action: 'undo' },
  { label: 'Redo', icon: 'bx-redo', section: 'Editor', action: 'redo' },
  { label: 'Zoom in', icon: 'bx-plus', section: 'Editor', shortcut: 'Ctrl++' },
  { label: 'Zoom out', icon: 'bx-minus', section: 'Editor', shortcut: 'Ctrl+-' },
  { label: 'Reset zoom', icon: 'bx-reset', section: 'Editor', shortcut: 'Ctrl+0' },
  { label: 'Zoom to fit all elements', icon: 'bx-fullscreen', section: 'Editor', shortcut: 'Shift+1' },
  { label: 'Toggle grid', icon: 'bx-grid-alt', section: 'Editor', shortcut: "Ctrl+'", action: 'toggleGrid' },
  { label: 'Shortcuts & help', icon: 'bx-help-circle', section: 'Editor', shortcut: '?', action: 'help' },
  { label: 'Select all', icon: 'bx-select-multiple', section: 'Editor', shortcut: 'Ctrl+A', action: 'selectAll' },
  { label: 'Reset canvas', icon: 'bx-trash', section: 'Editor', shortcut: 'Ctrl+Delete', action: 'resetCanvas' },
  { label: 'Canvas background', icon: 'bx-palette', section: 'Editor', action: 'openMenu' },

  // --- Tools ---
  { label: 'Hand (panning tool)', icon: 'bx-hand', section: 'Tools', shortcut: 'H', action: 'tool:pan' },
  { label: 'Selection', icon: 'bx-pointer', section: 'Tools', shortcut: 'V', action: 'tool:select' },
  { label: 'Rectangle', icon: 'bx-rectangle', section: 'Tools', shortcut: 'R', action: 'tool:rectangle' },
  { label: 'Diamond', icon: 'bx-diamond', section: 'Tools', shortcut: 'D', action: 'tool:diamond' },
  { label: 'Circle', icon: 'bx-circle', section: 'Tools', shortcut: 'O', action: 'tool:circle' },
  { label: 'Arrow', icon: 'bx-right-arrow-alt', section: 'Tools', shortcut: 'A', action: 'tool:arrow' },
  { label: 'Line', icon: 'bx-minus', section: 'Tools', shortcut: 'L', action: 'tool:line' },
  { label: 'Draw', icon: 'bx-pencil', section: 'Tools', shortcut: 'P', action: 'tool:freehand' },
  { label: 'Text', icon: 'bx-text', section: 'Tools', shortcut: 'T', action: 'tool:text' },
  { label: 'Insert image', icon: 'bx-image-add', section: 'Tools', shortcut: '9', action: 'tool:image' },
  { label: 'Eraser', icon: 'bx-eraser', section: 'Tools', shortcut: 'E', action: 'tool:eraser' },
  { label: 'Laser pointer', icon: 'bxs-magic-wand', section: 'Tools', shortcut: 'K', action: 'tool:laser' },
  { label: 'Frame tool', icon: 'bx-border-all', section: 'Tools', shortcut: 'F', action: 'tool:frame' },
  // AI entries removed — feature is hidden behind a coming-soon screen.
  // Restore "Text to diagram..." / "Mermaid to diagram..." here when the
  // assistant ships.

  // --- Links ---
  { label: 'GitHub', icon: 'bxl-github', section: 'Links', action: 'link:github' },
  { label: 'Report an issue', icon: 'bx-bug', section: 'Links', action: 'link:issues' },
]

const TOOL_ACTION_MAP = {
  'tool:pan': TOOLS.PAN,
  'tool:select': TOOLS.SELECT,
  'tool:rectangle': TOOLS.RECTANGLE,
  'tool:diamond': TOOLS.RECTANGLE, // diamond is a rectangle variant
  'tool:circle': TOOLS.CIRCLE,
  'tool:arrow': TOOLS.ARROW,
  'tool:line': TOOLS.LINE,
  'tool:freehand': TOOLS.FREEHAND,
  'tool:text': TOOLS.TEXT,
  'tool:image': TOOLS.IMAGE,
  'tool:eraser': TOOLS.ERASER,
  'tool:laser': TOOLS.LASER,
  'tool:frame': TOOLS.FRAME,
}

export default function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll selected item into view
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, open])

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!open) return null

  const filtered = query
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS

  // Group into sections preserving order
  const sectionOrder = []
  const sections = {}
  filtered.forEach((c) => {
    if (!sections[c.section]) {
      sections[c.section] = []
      sectionOrder.push(c.section)
    }
    sections[c.section].push(c)
  })

  const handleCommand = (cmd) => {
    toggleCommandPalette()
    const action = cmd.action

    if (!action) return

    // Tool switching
    if (action.startsWith('tool:')) {
      const tool = TOOL_ACTION_MAP[action]
      if (tool) useSketchStore.getState().setActiveTool(tool)
      return
    }

    // Links
    if (action === 'link:github') {
      window.open('https://github.com/elixpo/lixsketch', '_blank')
      return
    }
    if (action === 'link:issues') {
      window.open('https://github.com/elixpo/lixsketch/issues', '_blank')
      return
    }

    const serializer = window.__sceneSerializer

    switch (action) {
      case 'toggleTheme': {
        const store = useUIStore.getState()
        store.setTheme(store.theme === 'dark' ? 'light' : 'dark')
        break
      }
      case 'toggleGrid':
        useSketchStore.getState().toggleGrid()
        break
      case 'save': {
        const name = useUIStore.getState().workspaceName || 'Untitled'
        serializer?.download(name)
        break
      }
      case 'load':
        serializer?.upload()
        break
      case 'exportImage':
        useUIStore.getState().toggleExportImageModal()
        break
      case 'copyPNG':
        serializer?.copyAsPNG()
        break
      case 'copySVG':
        serializer?.copyAsSVG()
        break
      case 'undo':
        if (typeof window.undo === 'function') window.undo()
        break
      case 'redo':
        if (typeof window.redo === 'function') window.redo()
        break
      case 'selectAll':
        useSketchStore.getState().setActiveTool(TOOLS.SELECT)
        if (window.multiSelection && window.shapes) {
          window.multiSelection.clearSelection()
          window.shapes.forEach(shape => window.multiSelection.addShape(shape))
        }
        break
      case 'resetCanvas': {
        const serializer = window.__sceneSerializer
        if (serializer?.resetCanvas) {
          serializer.resetCanvas()
        }
        useSketchStore.getState().clearShapes()
        useSketchStore.getState().clearHistory()
        break
      }
      case 'findOnCanvas':
        useUIStore.getState().toggleFindBar()
        break
      case 'help':
        useUIStore.getState().toggleHelpModal()
        break
      case 'aiModal':
        useUIStore.getState().toggleAIModal()
        break
      case 'openMenu':
        useUIStore.getState().toggleMenu()
        break
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      toggleCommandPalette()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      handleCommand(filtered[selectedIndex])
    }
  }

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] font-[lixFont]"
      onClick={toggleCommandPalette}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative bg-surface-card border border-border-light rounded-2xl w-full max-w-[540px] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light">
          <i className="bx bx-search text-text-muted text-lg" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-dim font-[lixFont]"
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto no-scrollbar py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-text-dim text-xs">
              No commands found
            </div>
          )}

          {sectionOrder.map((section) => (
            <div key={section}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-text-dim text-xs uppercase tracking-wider">
                  {section}
                </span>
              </div>
              {sections[section].map((cmd) => {
                flatIndex++
                const idx = flatIndex
                return (
                  <button
                    key={cmd.label}
                    data-index={idx}
                    onClick={() => handleCommand(cmd)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-text-secondary text-xs transition-all duration-100 ${
                      idx === selectedIndex
                        ? 'bg-surface-hover text-text-primary'
                        : 'hover:bg-surface-hover/60'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <i className={`bx ${cmd.icon} text-base text-text-muted`} />
                      {cmd.label}
                    </span>
                    {cmd.shortcut && (
                      <div className="flex items-center gap-0.5">
                        {cmd.shortcut.split('+').map((key, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-text-dim text-xs mx-0.5">+</span>}
                            <kbd className="px-1.5 py-0.5 bg-surface-dark rounded text-text-dim text-xs border border-border">
                              {key.trim()}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
