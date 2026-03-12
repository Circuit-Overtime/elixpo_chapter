"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'
import ShapeSidebar, { ToolbarButton, Divider, LayerControls } from './ShapeSidebar'
import { useState, useCallback, useEffect } from 'react'

const FILL_STYLES = [
  { id: 'transparent', label: 'None', icon: 'bx-x' },
  { id: 'solid', label: 'Solid', icon: 'bxs-square' },
  { id: 'grid', label: 'Grid', icon: 'bx-grid-alt' },
]

const FILL_COLORS = [
  '#1e1e28',
  '#13171C',
  '#1a1a2e',
  '#0d1117',
  '#2d2d3a',
  '#ffffff',
]

export default function FrameSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const selectedShapeSidebar = useSketchStore((s) => s.selectedShapeSidebar)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)
  const [frameName, setFrameName] = useState('Frame 1')
  const [isGraph, setIsGraph] = useState(false)
  const [fillStyle, setFillStyle] = useState('transparent')
  const [fillColor, setFillColor] = useState('#1e1e28')

  // Sync state from the actual selected frame when sidebar opens
  useEffect(() => {
    if (selectedShapeSidebar === 'frame' || activeTool === TOOLS.FRAME) {
      const shape = typeof window !== 'undefined' ? window.currentShape : null
      if (shape && shape.shapeName === 'frame') {
        if (shape.frameName) setFrameName(shape.frameName)
        setIsGraph(shape._frameType === 'graph')
        setFillStyle(shape.fillStyle || 'transparent')
        setFillColor(shape.fillColor || '#1e1e28')
      } else {
        setIsGraph(false)
        setFillStyle('transparent')
        setFillColor('#1e1e28')
      }
    }
  }, [selectedShapeSidebar, activeTool])

  const updateName = useCallback((e) => {
    const name = e.target.value
    setFrameName(name)
    const shape = window.currentShape
    if (shape && shape.shapeName === 'frame') {
      shape.frameName = name
      shape.draw()
    }
  }, [])

  const updateFillStyle = useCallback((style) => {
    setFillStyle(style)
    const shape = window.currentShape
    if (shape && shape.shapeName === 'frame') {
      shape.fillStyle = style
      shape.draw()
    }
  }, [])

  const updateFillColor = useCallback((color) => {
    setFillColor(color)
    const shape = window.currentShape
    if (shape && shape.shapeName === 'frame') {
      shape.fillColor = color
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

      {/* Fill style */}
      <ToolbarButton icon="bxs-palette" tooltip="Fill style">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Background</p>
        <div className="flex gap-1 mb-2.5">
          {FILL_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => updateFillStyle(s.id)}
              title={s.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${
                fillStyle === s.id
                  ? 'bg-white/[0.12] text-white'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <i className={`bx ${s.icon} text-sm`} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Color picker — only show for solid/grid */}
        {fillStyle !== 'transparent' && (
          <>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1.5">Color</p>
            <div className="flex items-center gap-1.5">
              {FILL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateFillColor(c)}
                  title={c}
                  className={`w-6 h-6 rounded-md border-2 transition-all duration-100 ${
                    fillColor === c ? 'border-accent-blue scale-110' : 'border-white/10 hover:border-white/30'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="w-6 h-6 rounded-md border-2 border-white/10 hover:border-white/30 cursor-pointer overflow-hidden relative transition-all duration-100" title="Custom color">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => updateFillColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <i className="bx bx-palette text-xs text-text-muted absolute inset-0 flex items-center justify-center" />
              </label>
            </div>
          </>
        )}
      </ToolbarButton>

      <Divider />

      <ToolbarButton icon="bxs-expand" tooltip="Actions">
        <button onClick={resizeToFit} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-secondary text-xs hover:bg-white/[0.06] hover:text-white transition-all duration-100">
          <i className="bx bxs-expand text-sm" />
          Resize to Fit
        </button>
      </ToolbarButton>

      <Divider />

      {/* AI Edit / Graph Edit */}
      <button
        onClick={handleAIEdit}
        title={isGraph ? 'Edit Graph' : 'AI Edit'}
        className={`h-9 flex items-center gap-1.5 px-3 rounded-lg text-text-muted transition-all duration-100 ${
          isGraph
            ? 'hover:text-[#4A90D9] hover:bg-[#4A90D9]/10'
            : 'hover:text-[#FFD700] hover:bg-white/[0.06]'
        }`}
      >
        {isGraph ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
          </svg>
        )}
      </button>
      <Divider />
      <LayerControls />
    </ShapeSidebar>
  )
}
