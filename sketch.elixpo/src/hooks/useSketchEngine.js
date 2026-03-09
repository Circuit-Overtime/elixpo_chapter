"use client"

import { useEffect, useRef } from 'react'
import useSketchStore from '@/store/useSketchStore'

/**
 * Hook that initializes the SketchEngine on the provided SVG element
 * and bridges Zustand activeTool changes to the engine's window flags.
 */
export default function useSketchEngine(svgRef, ready = true) {
  const engineRef = useRef(null)

  useEffect(() => {
    if (!ready || !svgRef.current) return

    let cancelled = false

    async function initEngine() {
      try {
        // Expose Zustand store API on window BEFORE engine init
        // so SketchEngine globals can call into React state
        const storeState = useSketchStore.getState()
        window.__sketchStoreApi = {
          setSelectedShapeSidebar: (sidebar) => useSketchStore.getState().setSelectedShapeSidebar(sidebar),
          clearSelectedShapeSidebar: () => useSketchStore.getState().clearSelectedShapeSidebar(),
          setActiveTool: (tool) => useSketchStore.getState().setActiveTool(tool),
          setZoom: (zoom) => useSketchStore.setState({ zoom }),
        }

        const { SketchEngine } = await import('@/engine/SketchEngine')
        if (cancelled) return

        const engine = new SketchEngine(svgRef.current)
        await engine.init()
        engineRef.current = engine

        // Sync current tool immediately after init
        const currentTool = useSketchStore.getState().activeTool
        engine.setActiveTool(currentTool)
      } catch (err) {
        console.error('[useSketchEngine] Failed to initialize:', err)
      }
    }

    initEngine()

    return () => {
      cancelled = true
      if (engineRef.current) {
        engineRef.current.cleanup()
        engineRef.current = null
      }
    }
  }, [svgRef, ready])

  // Subscribe to Zustand activeTool changes and bridge to engine
  useEffect(() => {
    const unsub = useSketchStore.subscribe(
      (state, prevState) => {
        if (state.activeTool !== prevState?.activeTool && engineRef.current) {
          engineRef.current.setActiveTool(state.activeTool)
        }
      }
    )
    return unsub
  }, [])

  return engineRef
}
