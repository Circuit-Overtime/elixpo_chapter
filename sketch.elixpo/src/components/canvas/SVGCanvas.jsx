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
    setViewBox(`0 0 ${window.innerWidth} ${window.innerHeight}`)
    setSvgReady(true)

    const onResize = () => {
      setViewBox(`0 0 ${window.innerWidth} ${window.innerHeight}`)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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
