"use client"

import useUIStore from '@/store/useUIStore'
import useSketchStore from '@/store/useSketchStore'

const CANVAS_BACKGROUNDS = [
  { color: '#000', label: 'Black' },
  { color: '#161718', label: 'Dark Gray' },
  { color: '#13171C', label: 'Blue Black' },
  { color: '#181605', label: 'Dark Yellow' },
  { color: '#1B1615', label: 'Dark Brown' },
]

const MENU_ITEMS = [
  { label: 'Open', shortcut: 'Ctrl+O', icon: 'bx-folder-open' },
  { label: 'Save As', shortcut: 'Ctrl+S', icon: 'bx-save', action: 'save' },
  { label: 'Commands', shortcut: 'Ctrl+/', icon: 'bx-command' },
  { label: 'Find Text', shortcut: 'Ctrl+F', icon: 'bx-search' },
  { label: 'Help', icon: 'bx-help-circle' },
  { label: 'Reset The Canvas', icon: 'bx-reset', action: 'reset' },
]

const LINKS = [
  { label: 'GitHub', icon: 'bxl-github', href: '#' },
  { label: 'Report An Issue', icon: 'bx-bug', href: '#' },
  { label: 'Follow Us', icon: 'bxl-twitter', href: '#' },
]

export default function AppMenu() {
  const menuOpen = useUIStore((s) => s.menuOpen)
  const closeMenu = useUIStore((s) => s.closeMenu)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const canvasBackground = useSketchStore((s) => s.canvasBackground)
  const setCanvasBackground = useSketchStore((s) => s.setCanvasBackground)
  const clearShapes = useSketchStore((s) => s.clearShapes)
  const clearHistory = useSketchStore((s) => s.clearHistory)

  const handleItemClick = (item) => {
    if (item.action === 'save') {
      toggleSaveModal()
      closeMenu()
    } else if (item.action === 'reset') {
      clearShapes()
      clearHistory()
      closeMenu()
    }
  }

  return (
    <div
      className={`absolute top-14 right-4 w-[220px] bg-surface/75 backdrop-blur-lg rounded-2xl z-[1000] border border-border-light p-2 font-[lixFont] transition-all duration-200 ${
        menuOpen
          ? 'opacity-100 blur-0 pointer-events-auto'
          : 'opacity-0 blur-[20px] pointer-events-none'
      }`}
    >
      {/* Menu items */}
      {MENU_ITEMS.map((item) => (
        <button
          key={item.label}
          onClick={() => handleItemClick(item)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <i className={`bx ${item.icon} text-sm`} />
            {item.label}
          </span>
          {item.shortcut && (
            <span className="text-text-dim text-xs">{item.shortcut}</span>
          )}
        </button>
      ))}

      <hr className="border-border-light my-1.5" />

      {/* Links */}
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover transition-all duration-200"
        >
          <i className={`bx ${link.icon} text-sm`} />
          {link.label}
        </a>
      ))}

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
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs transition-all duration-200 ${
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
              className={`w-7 h-7 rounded-full border-2 transition-all duration-200 ${
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
  )
}
