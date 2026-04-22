"use client"

import useUIStore from '@/store/useUIStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useMemo } from 'react'

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
  const { t } = useTranslation()
  const shortcutsModalOpen = useUIStore((s) => s.shortcutsModalOpen)
  const toggleShortcutsModal = useUIStore((s) => s.toggleShortcutsModal)

  const TOOL_SHORTCUTS = useMemo(() => [
    { keys: 'H', action: t('shortcuts.pan') },
    { keys: 'V / 1', action: t('shortcuts.selection') },
    { keys: 'R / 2', action: t('shortcuts.rectangle') },
    { keys: '3', action: t('shortcuts.diamond') },
    { keys: 'O / 4', action: t('shortcuts.circle') },
    { keys: 'A / 5', action: t('shortcuts.arrow') },
    { keys: 'L / 6', action: t('shortcuts.line') },
    { keys: 'P / 7', action: t('shortcuts.freehand') },
    { keys: 'T / 8', action: t('shortcuts.text') },
    { keys: '9', action: t('shortcuts.image') },
    { keys: 'E / 0', action: t('shortcuts.eraser') },
    { keys: 'F', action: t('shortcuts.frame') },
    { keys: 'K', action: t('shortcuts.laser') },
  ], [t])

  const ACTION_SHORTCUTS = useMemo(() => [
    { keys: 'Ctrl+A', action: t('shortcuts.selectAll') },
    { keys: 'Ctrl+G', action: t('shortcuts.group') },
    { keys: 'Ctrl+Shift+G', action: t('shortcuts.ungroup') },
    { keys: 'Ctrl+D', action: t('shortcuts.duplicate') },
    { keys: 'Ctrl+S', action: t('shortcuts.quickSave') },
    { keys: 'Ctrl+Shift+S', action: t('shortcuts.saveShare') },
    { keys: 'Ctrl+F', action: t('shortcuts.findOnCanvas') },
    { keys: 'Ctrl+C', action: t('shortcuts.copy') },
    { keys: 'Ctrl+V', action: t('shortcuts.paste') },
    { keys: 'Ctrl+Z', action: t('shortcuts.undo') },
    { keys: 'Ctrl+Shift+Z', action: t('shortcuts.redo') },
    { keys: 'Esc', action: t('shortcuts.deselect') },
    { keys: 'Del', action: t('shortcuts.delete') },
    { keys: 'Space', action: t('shortcuts.holdToPan') },
    { keys: 'Shift', action: t('shortcuts.straightDraw') },
  ], [t])

  const VIEW_SHORTCUTS = useMemo(() => [
    { keys: 'Ctrl++', action: t('shortcuts.zoomIn') },
    { keys: 'Ctrl+-', action: t('shortcuts.zoomOut') },
    { keys: 'Ctrl+0', action: t('shortcuts.resetZoom') },
    { keys: "Ctrl+'", action: t('shortcuts.toggleGrid') },
    { keys: 'Ctrl+/', action: t('shortcuts.shortcutsHelp') },
  ], [t])

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
            {t('shortcuts.title')}
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
          <ShortcutSection title={t('shortcuts.tools')} shortcuts={TOOL_SHORTCUTS} />

          {/* Right column - Actions + View */}
          <div className="flex flex-col gap-4">
            <ShortcutSection title={t('shortcuts.actions')} shortcuts={ACTION_SHORTCUTS} />
            <ShortcutSection title={t('shortcuts.view')} shortcuts={VIEW_SHORTCUTS} />
          </div>
        </div>
      </div>
    </div>
  )
}
