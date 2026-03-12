"use client"

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
  { keys: 'Ctrl+S', action: 'Quick Save' },
  { keys: 'Ctrl+Shift+S', action: 'Save & Share' },
  { keys: 'Ctrl+F', action: 'Find on Canvas' },
  { keys: 'Ctrl+C', action: 'Copy' },
  { keys: 'Ctrl+V', action: 'Paste' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Shift+Z', action: 'Redo' },
  { keys: 'Esc', action: 'Deselect' },
  { keys: 'Del', action: 'Delete' },
  { keys: 'Space', action: 'Hold to Pan' },
  { keys: 'Shift', action: 'Straight Draw' },
]

const VIEW_SHORTCUTS = [
  { keys: 'Ctrl++', action: 'Zoom In' },
  { keys: 'Ctrl+-', action: 'Zoom Out' },
  { keys: 'Ctrl+0', action: 'Reset Zoom' },
  { keys: "Ctrl+'", action: 'Toggle Grid' },
  { keys: 'Ctrl+/', action: 'Shortcuts' },
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

export default function ShortcutsModal() {
  const shortcutsModalOpen = useUIStore((s) => s.shortcutsModalOpen)
  const toggleShortcutsModal = useUIStore((s) => s.toggleShortcutsModal)

  if (!shortcutsModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
      onClick={toggleShortcutsModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-surface-card border border-border-light rounded-2xl p-6 max-w-[600px] w-full mx-4 max-h-[80vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary text-base font-medium">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={toggleShortcutsModal}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left column - Tools */}
          <ShortcutSection title="Tools" shortcuts={TOOL_SHORTCUTS} />

          {/* Right column - Actions + View */}
          <div className="flex flex-col gap-4">
            <ShortcutSection title="Actions" shortcuts={ACTION_SHORTCUTS} />
            <ShortcutSection title="View" shortcuts={VIEW_SHORTCUTS} />
          </div>
        </div>
      </div>
    </div>
  )
}
