"use client"

import { useRef } from 'react'
import useSketchStore from '@/store/useSketchStore'

export default function SVGCanvas() {
  const svgRef = useRef(null)
  const canvasBackground = useSketchStore((s) => s.canvasBackground)
  const getCursor = useSketchStore((s) => s.getCursor)

  const cursor = getCursor()

  return (
    <svg
      ref={svgRef}
      className="w-full h-full relative"
      style={{
        background: canvasBackground,
        cursor,
      }}
    >
      {/* Canvas content will be rendered here by the sketch engine */}
    </svg>
  )
}
