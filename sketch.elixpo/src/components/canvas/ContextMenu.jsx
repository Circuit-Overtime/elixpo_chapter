"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import useSketchStore from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'

// ── Helpers ──────────────────────────────────────────────────

function getCleanSVG() {
  const svgEl = window.svg
  if (!svgEl) return null
  const clone = svgEl.cloneNode(true)
  clone.querySelectorAll(
    '[data-selection], .selection-handle, .resize-handle, .rotation-handle, .anchor, .rotate-anchor, .resize-anchor, .rotation-anchor, .selection-outline'
  ).forEach((el) => el.remove())
  return clone
}

function renderToCanvas(clone, scale, bgColor) {
  return new Promise((resolve) => {
    const svgData = new XMLSerializer().serializeToString(clone)
    const vb = window.svg.viewBox.baseVal
    const canvas = document.createElement('canvas')
    canvas.width = vb.width * scale
    canvas.height = vb.height * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    const img = new Image()
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      if (bgColor) {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, vb.width, vb.height)
      }
      ctx.drawImage(img, 0, 0, vb.width, vb.height)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

function getShapeAtPoint(x, y) {
  const shapes = window.shapes
  if (!shapes) return null
  // Walk backwards (topmost first)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i]
    const el = shape.group || shape.element
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return shape
    }
  }
  return null
}

// ── Menu item components ─────────────────────────────────────

function MenuItem({ label, shortcut, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors duration-100 ${
        disabled
          ? 'text-text-dim cursor-default'
          : danger
            ? 'text-red-400 hover:bg-red-500/15 cursor-pointer'
            : 'text-text-secondary hover:bg-surface-hover cursor-pointer'
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-text-dim text-[10px] ml-6">{shortcut}</span>}
    </button>
  )
}

function CheckMenuItem({ label, shortcut, checked, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors duration-100"
    >
      <span className="flex items-center gap-2">
        {checked && <i className="bx bx-check text-sm text-accent-blue -ml-0.5" />}
        {!checked && <span className="w-[14px]" />}
        {label}
      </span>
      {shortcut && <span className="text-text-dim text-[10px] ml-6">{shortcut}</span>}
    </button>
  )
}

function Separator() {
  return <hr className="border-border-light my-1" />
}

// ── Main component ───────────────────────────────────────────

export default function ContextMenu() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [targetShape, setTargetShape] = useState(null)
  const menuRef = useRef(null)

  const gridEnabled = useSketchStore((s) => s.gridEnabled)
  const snapToObjects = useSketchStore((s) => s.snapToObjects)
  const zenMode = useSketchStore((s) => s.zenMode)
  const viewMode = useSketchStore((s) => s.viewMode)

  const close = useCallback(() => {
    setVisible(false)
    setTargetShape(null)
  }, [])

  // Context menu handler
  useEffect(() => {
    const handleContextMenu = (e) => {
      const svg = document.getElementById('freehand-canvas')
      if (!svg) return

      // Only handle right-clicks on or within the SVG canvas
      if (!svg.contains(e.target) && e.target !== svg) return

      e.preventDefault()
      const shape = getShapeAtPoint(e.clientX, e.clientY)

      // Also check if there's a currentShape selected
      const current = window.currentShape || null

      setTargetShape(shape || current)
      setPosition({ x: e.clientX, y: e.clientY })
      setVisible(true)
    }

    const handleClick = () => close()
    const handleKeyDown = (e) => { if (e.key === 'Escape') close() }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close])

  // Adjust position so menu doesn't overflow viewport
  useEffect(() => {
    if (!visible || !menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let { x, y } = position
    if (x + rect.width > vw - 8) x = vw - rect.width - 8
    if (y + rect.height > vh - 8) y = vh - rect.height - 8
    if (x !== position.x || y !== position.y) setPosition({ x, y })
  }, [visible, position])

  if (!visible) return null

  // ── Action handlers ────────────────────────────────────────

  const handlePaste = () => {
    if (typeof window.pasteClipboard === 'function') window.pasteClipboard()
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }))
    close()
  }

  const handleCopy = () => {
    if (typeof window.copySelected === 'function') window.copySelected()
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }))
    close()
  }

  const handleCut = () => {
    handleCopy()
    handleDeleteShape()
  }

  const handleSelectAll = () => {
    useSketchStore.getState().setActiveTool('select')
    if (window.multiSelection && window.shapes) {
      window.multiSelection.clearSelection()
      window.shapes.forEach((s) => window.multiSelection.addShape(s))
    }
    close()
  }

  const handleCopyPNG = async () => {
    const clone = getCleanSVG()
    if (!clone) { close(); return }
    const canvas = await renderToCanvas(clone, 2, '#121212')
    if (!canvas) { close(); return }
    canvas.toBlob((blob) => {
      if (blob) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).catch(() => {})
    }, 'image/png')
    close()
  }

  const handleCopySVG = () => {
    const clone = getCleanSVG()
    if (!clone) { close(); return }
    const svgData = new XMLSerializer().serializeToString(clone)
    navigator.clipboard.writeText(svgData).catch(() => {})
    close()
  }

  const handleToggleGrid = () => {
    useSketchStore.getState().toggleGrid()
    close()
  }

  const handleToggleSnap = () => {
    useSketchStore.getState().toggleSnapToObjects()
    close()
  }

  const handleZenMode = () => {
    useSketchStore.getState().toggleZenMode()
    close()
  }

  const handleViewMode = () => {
    useSketchStore.getState().toggleViewMode()
    close()
  }

  const handleDeleteShape = () => {
    // Multi-selection delete
    if (window.multiSelection?.selectedShapes?.size > 0) {
      if (typeof window.deleteSelectedShapes === 'function') window.deleteSelectedShapes()
      close()
      return
    }
    const shape = targetShape || window.currentShape
    if (!shape) { close(); return }
    const shapes = window.shapes
    if (shapes) {
      const idx = shapes.indexOf(shape)
      if (idx !== -1) shapes.splice(idx, 1)
    }
    if (typeof window.cleanupAttachments === 'function') window.cleanupAttachments(shape)
    if (shape.parentFrame && typeof shape.parentFrame.removeShapeFromFrame === 'function') {
      shape.parentFrame.removeShapeFromFrame(shape)
    }
    const el = shape.group || shape.element
    if (el && el.parentNode) el.parentNode.removeChild(el)
    if (typeof window.pushDeleteAction === 'function') window.pushDeleteAction(shape)
    window.currentShape = null
    if (typeof window.disableAllSideBars === 'function') window.disableAllSideBars()
    close()
  }

  const handleDuplicate = () => {
    // Copy then paste
    if (typeof window.copySelected === 'function') window.copySelected()
    setTimeout(() => {
      if (typeof window.pasteClipboard === 'function') window.pasteClipboard()
    }, 50)
    close()
  }

  // Layer order
  const handleLayerAction = (action) => {
    const shape = targetShape || window.currentShape
    if (!shape || !window.__layerOrder) { close(); return }
    window.__layerOrder[action](shape)
    close()
  }

  // Flip (transform via scale)
  const handleFlip = (axis) => {
    const shape = targetShape || window.currentShape
    if (!shape) { close(); return }
    const el = shape.group || shape.element
    if (!el) { close(); return }
    const current = el.getAttribute('transform') || ''
    const bbox = el.getBBox()
    const cx = bbox.x + bbox.width / 2
    const cy = bbox.y + bbox.height / 2
    const scaleStr = axis === 'h'
      ? `translate(${cx * 2}, 0) scale(-1, 1)`
      : `translate(0, ${cy * 2}) scale(1, -1)`
    el.setAttribute('transform', current + ' ' + scaleStr)
    close()
  }

  // Wrap selection in frame
  const handleWrapInFrame = () => {
    // Simulate the frame wrap if engine supports it
    close()
  }

  const handleCanvasProperties = () => {
    // Toggle shape sidebar / properties via Alt+/
    close()
  }

  // ── Render ─────────────────────────────────────────────────

  const isShape = !!targetShape

  return (
    <div
      ref={menuRef}
      className="fixed z-9999 min-w-[220px] py-1.5 bg-surface/90 backdrop-blur-xl rounded-xl border border-border-light shadow-2xl font-[lixFont] select-none"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {isShape ? (
        /* ── Shape context menu ── */
        <>
          <MenuItem label="Cut" shortcut="Ctrl+X" onClick={handleCut} />
          <MenuItem label="Copy" shortcut="Ctrl+C" onClick={handleCopy} />
          <MenuItem label="Paste" shortcut="Ctrl+V" onClick={handlePaste} />

          <Separator />
          <MenuItem label="Wrap selection in frame" onClick={handleWrapInFrame} />

          <Separator />
          <MenuItem label="Copy to clipboard as PNG" shortcut="Shift+Alt+C" onClick={handleCopyPNG} />
          <MenuItem label="Copy to clipboard as SVG" onClick={handleCopySVG} />

          <Separator />
          <MenuItem label="Send backward" shortcut="Ctrl+[" onClick={() => handleLayerAction('sendBackward')} />
          <MenuItem label="Bring forward" shortcut="Ctrl+]" onClick={() => handleLayerAction('bringForward')} />
          <MenuItem label="Send to back" shortcut="Ctrl+Shift+[" onClick={() => handleLayerAction('sendToBack')} />
          <MenuItem label="Bring to front" shortcut="Ctrl+Shift+]" onClick={() => handleLayerAction('bringToFront')} />

          <Separator />
          <MenuItem label="Flip horizontal" shortcut="Shift+H" onClick={() => handleFlip('h')} />
          <MenuItem label="Flip vertical" shortcut="Shift+V" onClick={() => handleFlip('v')} />

          <Separator />
          <MenuItem label="Duplicate" shortcut="Ctrl+D" onClick={handleDuplicate} />
          <MenuItem label="Delete" danger onClick={handleDeleteShape} />
        </>
      ) : (
        /* ── Canvas context menu ── */
        <>
          <MenuItem label="Paste" shortcut="Ctrl+V" onClick={handlePaste} />
          <MenuItem label="Copy to clipboard as PNG" shortcut="Shift+Alt+C" onClick={handleCopyPNG} />
          <MenuItem label="Copy to clipboard as SVG" onClick={handleCopySVG} />

          <Separator />
          <MenuItem label="Select all" shortcut="Ctrl+A" onClick={handleSelectAll} />

          <Separator />
          <CheckMenuItem label="Toggle grid" shortcut="Ctrl+'" checked={gridEnabled} onClick={handleToggleGrid} />
          <CheckMenuItem label="Snap to objects" shortcut="Alt+S" checked={snapToObjects} onClick={handleToggleSnap} />

          <Separator />
          <MenuItem label="Zen mode" shortcut="Alt+Z" onClick={handleZenMode} />
          <MenuItem label="View mode" shortcut="Alt+R" onClick={handleViewMode} />
          <MenuItem label="Canvas & Shape properties" shortcut="Alt+/" onClick={handleCanvasProperties} />
        </>
      )}
    </div>
  )
}
