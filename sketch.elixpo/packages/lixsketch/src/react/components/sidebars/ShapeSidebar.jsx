"use client"

import { useState, useRef, useEffect } from 'react'
import useSketchStore from '../../store/useSketchStore'

/**
 * A toolbar button that opens a popover panel above it on click.
 * Shows an icon (or custom preview) in the bar, popover shows full options.
 */
export function ToolbarButton({ icon, preview, children, tooltip }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen(!open)}
        title={tooltip}
        className={`h-9 flex items-center gap-1.5 px-3 rounded-lg transition-all duration-100 ${
          open
            ? 'bg-surface-active text-text-primary'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
        }`}
      >
        {preview || (icon && <i className={`bx ${icon} text-base`} />)}
        <svg className={`w-2 h-2 opacity-40 transition-transform duration-100 ${open ? 'rotate-180' : ''}`} viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-20">
          <div className="bg-surface-card border border-border-light rounded-xl p-3 shadow-xl shadow-black/10 min-w-max">
            {children}
          </div>
          {/* Arrow pointer */}
          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-surface-card border-r border-b border-border-light" />
        </div>
      )}
    </div>
  )
}

/**
 * Simple toolbar divider
 */
function Divider() {
  return <div className="w-px h-5 bg-surface-hover mx-0.5 shrink-0" />
}

/**
 * Bottom toolbar container - appears when tool/shape is active
 */
export default function ShapeSidebar({ visible, children }) {
  const viewMode = useSketchStore((s) => s.viewMode)
  const show = visible && !viewMode

  return (
    <div
      className={`absolute bottom-14 left-1/2 -translate-x-1/2 bg-surface border border-border-light rounded-xl px-2 py-1.5 z-[999] font-[lixFont] transition-all duration-200 ${
        show
          ? 'opacity-100 pointer-events-auto translate-y-0'
          : 'opacity-0 pointer-events-none translate-y-2'
      }`}
    >
      <div className="flex items-center gap-0.5">
        {children}
      </div>
    </div>
  )
}

/**
 * Layer ordering controls - add to any shape sidebar
 */
import { useTranslation } from '../../hooks/useTranslation'

function LayerControls() {
  const { t } = useTranslation()
  const doLayer = (method) => {
    const shape = window.currentShape
    if (!shape || !window.__layerOrder) return
    window.__layerOrder[method](shape)
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => doLayer('sendToBack')}
        title={t('sidebar.sendToBack', { defaultValue: 'Send to back' })}
        className="h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100"
      >
        <i className="bx bx-chevrons-down text-base" />
      </button>
      <button
        onClick={() => doLayer('sendBackward')}
        title={t('sidebar.sendBackward')}
        className="h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100"
      >
        <i className="bx bx-chevron-down text-base" />
      </button>
      <button
        onClick={() => doLayer('bringForward')}
        title={t('sidebar.bringForward')}
        className="h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100"
      >
        <i className="bx bx-chevron-up text-base" />
      </button>
      <button
        onClick={() => doLayer('bringToFront')}
        title={t('sidebar.bringToFront', { defaultValue: 'Bring to front' })}
        className="h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100"
      >
        <i className="bx bx-chevrons-up text-base" />
      </button>
    </div>
  )
}

export { Divider, LayerControls }
