"use client"

import useSketchStore from '@/store/useSketchStore'

export default function Footer() {
  const zoom = useSketchStore((s) => s.zoom)
  const setZoom = useSketchStore((s) => s.setZoom)

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="absolute bottom-2.5 right-5 flex items-center gap-2.5 z-[1000] font-[lixFont]">
      {/* Undo/Redo */}
      <div className="flex items-center bg-surface rounded-lg overflow-hidden">
        <button
          title="Undo (Ctrl+Z)"
          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-undo text-lg" />
        </button>
        <div className="w-px h-5 bg-border-light" />
        <button
          title="Redo (Ctrl+Shift+Z)"
          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-redo text-lg" />
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center bg-surface rounded-lg overflow-hidden">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          title="Zoom Out (Ctrl+-)"
          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-minus text-lg" />
        </button>
        <div className="w-px h-5 bg-border-light" />
        <button
          onClick={() => setZoom(1)}
          title="Reset Zoom (Ctrl+0)"
          className="min-w-[52px] h-9 flex items-center justify-center text-text-secondary text-xs px-2 hover:bg-surface-hover transition-all duration-200"
        >
          {zoomPercent}%
        </button>
        <div className="w-px h-5 bg-border-light" />
        <button
          onClick={() => setZoom(zoom + 0.1)}
          title="Zoom In (Ctrl++)"
          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          <i className="bx bx-plus text-lg" />
        </button>
      </div>
    </div>
  )
}
