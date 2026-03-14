"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import useUIStore from '@/store/useUIStore'
import useSketchStore from '@/store/useSketchStore'

export default function ImageSourcePicker() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 300 })
  const ref = useRef(null)
  const toggleImageGenerateModal = useUIStore((s) => s.toggleImageGenerateModal)
  const setActiveTool = useSketchStore((s) => s.setActiveTool)

  const close = useCallback(() => {
    setVisible(false)
  }, [])

  const handleGenerateAI = useCallback(() => {
    close()
    setActiveTool('select')
    toggleImageGenerateModal()
  }, [close, setActiveTool, toggleImageGenerateModal])

  const handleUpload = useCallback(() => {
    close()
    if (window.openImageFilePicker) {
      window.openImageFilePicker()
    }
  }, [close])

  // Register the global bridge function
  useEffect(() => {
    window.__showImageSourcePicker = () => {
      // Find the image tool button in the toolbar by its title
      const imageBtn = document.querySelector('button[title="Image (9)"]')
      if (imageBtn) {
        const rect = imageBtn.getBoundingClientRect()
        setPosition({ x: rect.right + 10, y: rect.top - 10 })
      } else {
        setPosition({ x: 65, y: window.innerHeight / 2 - 50 })
      }
      setVisible(true)
    }

    return () => {
      delete window.__showImageSourcePicker
    }
  }, [])

  // Close on outside click & keybinds
  useEffect(() => {
    if (!visible) return

    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        close()
        setActiveTool('select')
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        close()
        setActiveTool('select')
      }
      // G = Generate with AI
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        e.stopPropagation()
        handleGenerateAI()
      }
      // U = Upload from device
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        e.stopPropagation()
        handleUpload()
      }
    }

    // Delay to avoid catching the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKeyDown, true)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [visible, close, setActiveTool, handleGenerateAI, handleUpload])

  if (!visible) return null

  return (
    <div
      ref={ref}
      className="fixed z-[1100] font-[lixFont]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-surface-card border border-border-light rounded-xl p-1.5 shadow-2xl shadow-black/40 flex flex-col gap-1 min-w-[200px]">
        <button
          onClick={handleGenerateAI}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-surface-hover transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center group-hover:bg-accent-blue/20 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-blue">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Generate with AI</div>
            <div className="text-[10px] text-text-dim">10 generations &middot; 5 edits free</div>
          </div>
          <kbd className="text-[10px] text-text-dim bg-surface-dark px-1.5 py-0.5 rounded">G</kbd>
        </button>

        <div className="h-px bg-white/[0.06] mx-2" />

        <button
          onClick={handleUpload}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center group-hover:bg-surface-active transition-all">
            <i className="bx bx-upload text-lg" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Upload from device</div>
            <div className="text-[10px] text-text-dim">PNG, JPG, SVG, WebP</div>
          </div>
          <kbd className="text-[10px] text-text-dim bg-surface-dark px-1.5 py-0.5 rounded">U</kbd>
        </button>
      </div>
    </div>
  )
}
