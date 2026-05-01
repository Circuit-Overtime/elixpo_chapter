"use client"

import { useRef, useState, useEffect, useCallback } from 'react'
import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import useSketchEngine from '@/hooks/useSketchEngine'

const GRID_SIZE = 20

export default function SVGCanvas() {
  const [svgReady, setSvgReady] = useState(false)
  const svgRef = useRef(null)
  const canvasBackground = useSketchStore((s) => s.canvasBackground)
  const gridEnabled = useSketchStore((s) => s.gridEnabled)
  const getCursor = useSketchStore((s) => s.getCursor)
  const cursor = getCursor()

  const [viewBox, setViewBox] = useState('0 0 1920 1080')

  useEffect(() => {
    // Track the SVG element's *actual rendered size* and keep both the
    // viewBox attribute AND the engine's `window.currentViewBox` in sync
    // with it. This is what makes split mode work:
    //
    //  - With `preserveAspectRatio` defaults, a viewBox whose aspect
    //    doesn't match the element's gets letterboxed inside the element.
    //    The package's pointer math (`mouseX / rect.width * viewBox.width`)
    //    does NOT compensate for the letterbox — clicks map to wrong SVG
    //    coords. Matching viewBox to rect avoids the letterbox entirely.
    //
    //  - The engine's freehand tool (and others) read `currentViewBox`
    //    directly. If we change the viewBox attribute without updating
    //    that global, freehand's pointer math drifts.
    //
    //  - `preserveAspectRatio="none"` is a belt-and-suspenders against
    //    any future viewBox/element aspect mismatch (e.g. mid-zoom).
    const applyImperative = (w, h) => {
      // Preserve zoom: viewBox width/height represent canvas-units that
      // span the element. At zoom=1 they equal element pixels; at zoom=2
      // they're half (smaller viewBox = magnified content).
      const zoom = window.currentZoom || 1
      const cv = window.currentViewBox || { x: 0, y: 0 }
      const vbW = w / zoom
      const vbH = h / zoom
      const x = cv.x || 0
      const y = cv.y || 0

      window.currentViewBox = { x, y, width: vbW, height: vbH }

      // Imperatively write the SVG attr so we don't fight the engine's
      // own setAttribute calls on subsequent zoom/pan operations.
      const el = svgRef.current
      if (el) el.setAttribute('viewBox', `${x} ${y} ${vbW} ${vbH}`)
    }

    const sync = () => {
      const el = svgRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      applyImperative(w, h)
    }

    // Initial React-state value (used only for the very first render
    // before we take over imperatively).
    {
      const rect = svgRef.current?.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect?.width || window.innerWidth))
      const h = Math.max(1, Math.round(rect?.height || window.innerHeight))
      setViewBox(`0 0 ${w} ${h}`)
    }

    sync()
    setSvgReady(true)

    window.addEventListener('resize', sync)

    let ro
    if (typeof ResizeObserver !== 'undefined' && svgRef.current) {
      ro = new ResizeObserver(sync)
      ro.observe(svgRef.current)
    }

    return () => {
      window.removeEventListener('resize', sync)
      if (ro) ro.disconnect()
    }
  }, [])

  // Close icon sidebar when clicking on canvas without an icon ready to place
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleCanvasClick = () => {
      const activeTool = useSketchStore.getState().activeTool
      // If icon tool is active but no icon is queued for placement, close the sidebar
      if (activeTool === TOOLS.ICON && !window.isIconToolActive) {
        useSketchStore.getState().setActiveTool(TOOLS.SELECT)
      }
    }

    svg.addEventListener('pointerdown', handleCanvasClick)
    return () => svg.removeEventListener('pointerdown', handleCanvasClick)
  }, [svgReady])

  // Initialize the imperative sketch engine on this SVG element
  useSketchEngine(svgRef, svgReady)

  // Expose grid state to engine
  useEffect(() => {
    window.__gridEnabled = gridEnabled
  }, [gridEnabled])

  return (
    <svg
      id="freehand-canvas"
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{
        background: canvasBackground,
        cursor,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
      viewBox={viewBox}
      preserveAspectRatio="none"
      suppressHydrationWarning
    >
      {gridEnabled && (
        <defs>
          <pattern
            id="grid-small"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="grid-large"
            width={GRID_SIZE * 5}
            height={GRID_SIZE * 5}
            patternUnits="userSpaceOnUse"
          >
            <rect width={GRID_SIZE * 5} height={GRID_SIZE * 5} fill="url(#grid-small)" />
            <path
              d={`M ${GRID_SIZE * 5} 0 L 0 0 0 ${GRID_SIZE * 5}`}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
      )}
      {gridEnabled && (
        <rect
          x="-100000"
          y="-100000"
          width="200000"
          height="200000"
          fill="url(#grid-large)"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  )
}
