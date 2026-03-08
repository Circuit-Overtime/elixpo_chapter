"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar from './ShapeSidebar'
import { useState } from 'react'

export default function FrameSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [frameName, setFrameName] = useState('Frame 1')

  return (
    <ShapeSidebar visible={activeTool === TOOLS.FRAME} title="Frame">
      {/* Frame name */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Name</p>
        <input
          type="text"
          value={frameName}
          onChange={(e) => setFrameName(e.target.value)}
          className="w-full px-2 py-1.5 bg-surface-dark border border-border rounded-lg text-text-secondary text-xs outline-none focus:border-border-accent transition-all duration-200 font-[lixFont]"
          spellCheck={false}
        />
      </div>

      {/* Resize to fit */}
      <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-text-muted text-xs hover:bg-surface-hover hover:text-text-primary transition-all duration-200">
        <i className="bx bx-expand text-sm" />
        Resize to Fit
      </button>
    </ShapeSidebar>
  )
}
