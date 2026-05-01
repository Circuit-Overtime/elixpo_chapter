"use client"

import { useState } from 'react'
import useUIStore from '@/store/useUIStore'

const TOOL_SHORTCUTS = [
  { keys: 'H', action: 'Pan' },
  { keys: 'V / 1', action: 'Selection' },
  { keys: 'R / 2', action: 'Rectangle' },
  { keys: '3', action: 'Diamond' },
  { keys: 'O / 4', action: 'Circle' },
  { keys: 'A / 5', action: 'Arrow' },
  { keys: 'L / 6', action: 'Line' },
  { keys: 'P / 7', action: 'Freehand' },
  { keys: 'T / 8', action: 'Text' },
  { keys: '9', action: 'Image' },
  { keys: 'E / 0', action: 'Eraser' },
  { keys: 'F', action: 'Frame' },
  { keys: 'K', action: 'Laser' },
]

const ACTION_SHORTCUTS = [
  { keys: 'Ctrl+A', action: 'Select All' },
  { keys: 'Ctrl+G', action: 'Group' },
  { keys: 'Ctrl+Shift+G', action: 'Ungroup' },
  { keys: 'Ctrl+D', action: 'Duplicate' },
  { keys: 'Ctrl+S', action: 'Quick Save (canvas + doc)' },
  { keys: 'Ctrl+C', action: 'Copy' },
  { keys: 'Ctrl+V', action: 'Paste' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Shift+Z', action: 'Redo' },
  { keys: 'Esc', action: 'Deselect' },
  { keys: 'Del / Backspace', action: 'Delete' },
  { keys: 'Space (hold)', action: 'Pan' },
  { keys: 'Shift (hold)', action: 'Straight Draw' },
]

const VIEW_SHORTCUTS = [
  { keys: 'Ctrl++', action: 'Zoom In' },
  { keys: 'Ctrl+-', action: 'Zoom Out' },
  { keys: 'Ctrl+0', action: 'Reset Zoom' },
  { keys: "Ctrl+'", action: 'Toggle Grid' },
  { keys: 'Ctrl+/', action: 'Command Palette' },
]

// ── Doc editor shortcuts ──────────────────────────────────────────
// Markdown shortcuts auto-convert when typed at the start of a line.
const DOC_BLOCK_SHORTCUTS = [
  { keys: '# Space', action: 'Heading 1' },
  { keys: '## Space', action: 'Heading 2' },
  { keys: '### Space', action: 'Heading 3' },
  { keys: '> Space', action: 'Quote' },
  { keys: '- Space', action: 'Bulleted list' },
  { keys: '1. Space', action: 'Numbered list' },
  { keys: '[] Space', action: 'Checklist' },
  { keys: '``` Space', action: 'Code block' },
  { keys: '--- Enter', action: 'Divider' },
  { keys: '/', action: 'Block menu' },
]

const DOC_INLINE_SHORTCUTS = [
  { keys: 'Ctrl+B', action: 'Bold' },
  { keys: 'Ctrl+I', action: 'Italic' },
  { keys: 'Ctrl+U', action: 'Underline' },
  { keys: 'Ctrl+Shift+S', action: 'Strikethrough' },
  { keys: 'Ctrl+E', action: 'Inline code' },
  { keys: 'Tab', action: 'Indent block' },
  { keys: 'Shift+Tab', action: 'Outdent block' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Shift+Z', action: 'Redo' },
]

const TABS = [
  { id: 'canvas', label: 'Canvas', icon: 'bx-pen' },
  { id: 'docs', label: 'Document', icon: 'bxs-notepad' },
]

function ShortcutRow({ keys, action }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-text-secondary text-xs">{action}</span>
      <div className="flex items-center gap-1">
        {keys.split('+').map((key, i) => (
          <span key={i}>
            {i > 0 && <span className="text-text-dim text-xs mx-0.5">+</span>}
            <kbd className="px-1.5 py-0.5 bg-surface-dark rounded text-text-muted text-xs border border-border font-[lixFont]">
              {key.trim()}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  )
}

function ShortcutSection({ title, shortcuts }) {
  return (
    <div>
      <h3 className="text-text-dim text-xs uppercase tracking-wider mb-2">{title}</h3>
      {shortcuts.map((s) => (
        <ShortcutRow key={s.action} keys={s.keys} action={s.action} />
      ))}
    </div>
  )
}

export default function HelpModal() {
  const open = useUIStore((s) => s.helpModalOpen)
  const toggleHelpModal = useUIStore((s) => s.toggleHelpModal)
  const [activeTab, setActiveTab] = useState('canvas')

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
      onClick={toggleHelpModal}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative bg-surface-card border border-border-light rounded-2xl w-full max-w-[800px] mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-text-primary text-base font-medium">Shortcuts</h2>
          <button
            onClick={toggleHelpModal}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover/50'
              }`}
            >
              <i className={`bx ${tab.icon} text-sm`} />
              {tab.label}
            </button>
          ))}
        </div>

        <hr className="border-border-light mx-6" />

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
          {activeTab === 'canvas' && (
            <div className="grid grid-cols-2 gap-6">
              <ShortcutSection title="Tools" shortcuts={TOOL_SHORTCUTS} />
              <div className="flex flex-col gap-4">
                <ShortcutSection title="Actions" shortcuts={ACTION_SHORTCUTS} />
                <ShortcutSection title="View" shortcuts={VIEW_SHORTCUTS} />
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="grid grid-cols-2 gap-6">
              <ShortcutSection title="Block markdown" shortcuts={DOC_BLOCK_SHORTCUTS} />
              <ShortcutSection title="Formatting" shortcuts={DOC_INLINE_SHORTCUTS} />
            </div>
          )}
        </div>

        {/* Footer links */}
        <hr className="border-border-light mx-6" />
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
          <a
            href="/docs"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/20 text-accent-blue text-xs transition-all duration-200"
          >
            <i className="bx bx-book-open text-sm" />
            Documentation
          </a>
          <a
            href="https://github.com/elixpo/lixsketch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary text-xs transition-all duration-200"
          >
            <i className="bx bxl-github text-sm" />
            View Repository
          </a>
          <a
            href="https://github.com/elixpo/lixsketch/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary text-xs transition-all duration-200"
          >
            <i className="bx bx-bug text-sm" />
            Report An Issue
          </a>
        </div>
      </div>
    </div>
  )
}
