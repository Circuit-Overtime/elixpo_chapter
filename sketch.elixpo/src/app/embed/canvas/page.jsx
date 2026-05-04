'use client'

import { useEffect, useRef } from 'react'
import Toolbar from '@/components/toolbar/Toolbar'
import Footer from '@/components/footer/Footer'
import RectangleSidebar from '@/components/sidebars/RectangleSidebar'
import CircleSidebar from '@/components/sidebars/CircleSidebar'
import LineSidebar from '@/components/sidebars/LineSidebar'
import ArrowSidebar from '@/components/sidebars/ArrowSidebar'
import PaintbrushSidebar from '@/components/sidebars/PaintbrushSidebar'
import TextSidebar from '@/components/sidebars/TextSidebar'
import FrameSidebar from '@/components/sidebars/FrameSidebar'
import IconSidebar from '@/components/sidebars/IconSidebar'
import ImageSidebar from '@/components/sidebars/ImageSidebar'
import SVGCanvas from '@/components/canvas/SVGCanvas'
import MultiSelectActions from '@/components/canvas/MultiSelectActions'
import ContextMenu from '@/components/canvas/ContextMenu'
import FindBar from '@/components/canvas/FindBar'
import CanvasLoadingOverlay from '@/components/canvas/CanvasLoadingOverlay'
import ShortcutsModal from '@/components/modals/ShortcutsModal'
import CommandPalette from '@/components/modals/CommandPalette'
import ExportImageModal from '@/components/modals/ExportImageModal'
import CanvasPropertiesModal from '@/components/modals/CanvasPropertiesModal'
import { installEngineShortcuts } from '@elixpo/lixsketch'
import useEmbedBridge, { postExitToHost } from '@/hooks/useEmbedBridge'
import useSketchStore from '@/store/useSketchStore'

// Embedded canvas — strips out the app shell (Header, AppMenu, SaveModal,
// AIModal, HelpModal, ImageGenerateModal, DocsPanel, auth) and replaces
// the URL-based session manager + autosave with a postMessage bridge to
// the host application.
export default function EmbedCanvasPage() {
  const shortcutsInstalledRef = useRef(false)

  useEffect(() => {
    document.body.classList.add('canvas-mode', 'embed-mode')
    return () => {
      document.body.classList.remove('canvas-mode', 'embed-mode')
    }
  }, [])

  // Engine-local shortcuts ship with the @elixpo/lixsketch package. We install
  // them here once the engine is mounted and bridge tool changes through the
  // sketch store so the toolbar stays in sync.
  useEffect(() => {
    let uninstall = null
    let timer = null
    function tryInstall() {
      if (shortcutsInstalledRef.current) return
      const engine = window.__sketchEngine
      if (!engine) {
        timer = setTimeout(tryInstall, 200)
        return
      }
      uninstall = installEngineShortcuts(engine, {
        skipWhen: (e) => {
          // Defer to host overlays (e.g. command palette, find bar) by checking
          // for any focused element with a non-empty data-shortcut-skip attr.
          const t = e.target
          return !!t?.closest?.('[data-shortcut-skip]')
        },
      })
      shortcutsInstalledRef.current = true
    }
    tryInstall()
    return () => {
      if (timer) clearTimeout(timer)
      if (uninstall) uninstall()
      shortcutsInstalledRef.current = false
    }
  }, [])

  // Bridge engine tool changes back to the React store so the toolbar UI
  // reflects the active tool when shortcuts switch it.
  useEffect(() => {
    function syncToolFromEngine() {
      const tool = window.__sketchEngine?.activeTool
      if (tool && useSketchStore.getState().activeTool !== tool) {
        useSketchStore.setState({ activeTool: tool })
      }
    }
    const interval = setInterval(syncToolFromEngine, 200)
    return () => clearInterval(interval)
  }, [])

  useEmbedBridge()

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <SVGCanvas />
      <Toolbar />
      <RectangleSidebar />
      <CircleSidebar />
      <LineSidebar />
      <ArrowSidebar />
      <PaintbrushSidebar />
      <TextSidebar />
      <FrameSidebar />
      <IconSidebar />
      <ImageSidebar />
      <MultiSelectActions />
      <Footer />

      <ShortcutsModal />
      <CommandPalette />
      <ExportImageModal />
      <CanvasPropertiesModal />
      <ContextMenu />
      <FindBar />
      <CanvasLoadingOverlay />

      {/* Exit-to-host button (top-right). The host app routes back to the
          editor when it receives 'lixsketch:exit'. */}
      <button
        type="button"
        onClick={postExitToHost}
        className="fixed top-3 right-3 z-[10000] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/85 backdrop-blur-md border border-border-light text-text-secondary text-xs hover:text-text-primary hover:border-accent-blue/40 transition-colors"
        title="Exit to editor"
      >
        <i className="bx bx-x text-base" />
        Exit
      </button>

      <div
        id="save-toast"
        className="hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-xl bg-surface/80 backdrop-blur-md border border-border-light text-text-secondary text-xs font-[lixFont] pointer-events-none animate-fade-in"
      >
        <i className="bx bx-check text-green-400 mr-1.5" />
        Saved
      </div>
    </div>
  )
}
