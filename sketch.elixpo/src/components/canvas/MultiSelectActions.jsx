"use client"

import { useState, useEffect } from 'react'

export default function MultiSelectActions() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Poll multi-selection state (lightweight — only checks a Set size)
    const interval = setInterval(() => {
      const ms = window.multiSelection
      const n = ms ? ms.selectedShapes.size : 0
      setCount((prev) => (prev !== n ? n : prev))
    }, 200)
    return () => clearInterval(interval)
  }, [])

  if (count < 2) return null

  const handleFrame = () => {
    if (window.frameSelectedShapes) {
      window.frameSelectedShapes()
      setCount(0)
    }
  }

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[1000] font-[lixFont]">
      <div className="flex items-center gap-2 bg-surface/90 backdrop-blur-lg border border-border-light rounded-xl px-3 py-1.5 shadow-lg">
        <span className="text-text-muted text-xs">
          {count} selected
        </span>
        <div className="w-px h-4 bg-border-light" />
        <button
          onClick={handleFrame}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-accent-blue hover:bg-accent-blue/10 transition-all duration-150"
        >
          <i className="bx bx-crop text-sm" />
          Frame it
        </button>
      </div>
    </div>
  )
}
