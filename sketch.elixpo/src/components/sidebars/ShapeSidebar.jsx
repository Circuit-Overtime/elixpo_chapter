"use client"

import { useState, useRef, useEffect } from 'react'

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
            ? 'bg-white/[0.12] text-white'
            : 'text-text-muted hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        {preview || (icon && <i className={`bx ${icon} text-base`} />)}
        <svg className={`w-2 h-2 opacity-40 transition-transform duration-100 ${open ? 'rotate-180' : ''}`} viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-20">
          <div className="bg-[#252525] border border-white/[0.1] rounded-xl p-3 shadow-xl shadow-black/50 min-w-max">
            {children}
          </div>
          {/* Arrow pointer */}
          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#252525] border-r border-b border-white/[0.1]" />
        </div>
      )}
    </div>
  )
}

/**
 * Simple toolbar divider
 */
function Divider() {
  return <div className="w-px h-5 bg-white/[0.08] mx-0.5 shrink-0" />
}

/**
 * Bottom toolbar container - appears when tool/shape is active
 */
export default function ShapeSidebar({ visible, children }) {
  return (
    <div
      className={`absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#1c1c1c] border border-white/[0.1] rounded-xl px-2 py-1.5 z-[999] font-[lixFont] transition-all duration-200 ${
        visible
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

export { Divider }
