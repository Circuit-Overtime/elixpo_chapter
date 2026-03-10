"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'
import ShapeSidebar, { ToolbarButton, Divider } from './ShapeSidebar'
import { useState, useCallback, useEffect } from 'react'

export default function FrameSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const selectedShapeSidebar = useSketchStore((s) => s.selectedShapeSidebar)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)
  const [frameName, setFrameName] = useState('Frame 1')

  // Sync name from the actual selected frame when sidebar opens
  useEffect(() => {
    if (selectedShapeSidebar === 'frame' || activeTool === TOOLS.FRAME) {
      const shape = window.currentShape
      if (shape && shape.shapeName === 'frame' && shape.frameName) {
        setFrameName(shape.frameName)
      }
    }
  }, [selectedShapeSidebar, activeTool])

  const updateName = useCallback((e) => {
    const name = e.target.value
    setFrameName(name)
    // Update the actual selected frame
    const shape = window.currentShape
    if (shape && shape.shapeName === 'frame') {
      shape.frameName = name
      shape.draw()
    }
  }, [])

  const resizeToFit = useCallback(() => {
    const shape = window.currentShape
    if (shape && shape.shapeName === 'frame' && typeof shape.resizeToFitContents === 'function') {
      shape.resizeToFitContents()
    }
  }, [])

  const handleAIEdit = useCallback(() => {
    const shape = window.currentShape
    if (shape && shape.shapeName === 'frame') {
      // Store the frame reference so AIModal knows we're editing this frame
      window.__aiEditTargetFrame = shape
      toggleAIModal()
    }
  }, [toggleAIModal])

  return (
    <ShapeSidebar visible={activeTool === TOOLS.FRAME || selectedShapeSidebar === 'frame'}>
      <ToolbarButton icon="bxs-rename" tooltip="Frame name">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Name</p>
        <input
          type="text"
          value={frameName}
          onChange={updateName}
          className="w-32 px-2.5 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-xs outline-none focus:border-[#5B57D1]/50 transition-all duration-150 font-[lixFont]"
          spellCheck={false}
        />
      </ToolbarButton>

      <Divider />

      <ToolbarButton icon="bxs-expand" tooltip="Actions">
        <button onClick={resizeToFit} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-secondary text-xs hover:bg-white/[0.06] hover:text-white transition-all duration-100">
          <i className="bx bxs-expand text-sm" />
          Resize to Fit
        </button>
      </ToolbarButton>

      <Divider />

      {/* AI Edit — opens AI modal pre-seeded for editing this frame's diagram */}
      <button
        onClick={handleAIEdit}
        title="AI Edit"
        className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-text-muted hover:text-[#FFD700] hover:bg-white/[0.06] transition-all duration-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
        </svg>
      </button>
    </ShapeSidebar>
  )
}
