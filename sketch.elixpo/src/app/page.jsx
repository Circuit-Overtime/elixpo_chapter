'use client'

import Script from 'next/script'
import Header from '@/components/header/Header'
import Toolbar from '@/components/toolbar/Toolbar'
import Footer from '@/components/footer/Footer'
import AppMenu from '@/components/menu/AppMenu'
import ShortcutsModal from '@/components/modals/ShortcutsModal'
import SaveModal from '@/components/modals/SaveModal'
import RectangleSidebar from '@/components/sidebars/RectangleSidebar'
import CircleSidebar from '@/components/sidebars/CircleSidebar'
import LineSidebar from '@/components/sidebars/LineSidebar'
import ArrowSidebar from '@/components/sidebars/ArrowSidebar'
import PaintbrushSidebar from '@/components/sidebars/PaintbrushSidebar'
import TextSidebar from '@/components/sidebars/TextSidebar'
import FrameSidebar from '@/components/sidebars/FrameSidebar'
import SVGCanvas from '@/components/canvas/SVGCanvas'
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts'

export default function Home() {
  useKeyboardShortcuts()

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* CDN libraries needed by canvas engine */}
      <Script src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js" type="module" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js" noModule strategy="beforeInteractive" />
      <Script src="https://unpkg.com/boxicons@2.1.4/dist/boxicons.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js" strategy="beforeInteractive" />

      {/* UI Shell */}
      <Header />
      <Toolbar />

      {/* Sidebars */}
      <RectangleSidebar />
      <CircleSidebar />
      <LineSidebar />
      <ArrowSidebar />
      <PaintbrushSidebar />
      <TextSidebar />
      <FrameSidebar />

      {/* Canvas */}
      <SVGCanvas />

      {/* Overlays */}
      <Footer />
      <AppMenu />
      <ShortcutsModal />
      <SaveModal />

      {/* Canvas engine scripts (imperative SVG manipulation — will be migrated to engine module later) */}
      <Script src="/JS/imports.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/sketchGeneric.js" strategy="afterInteractive" />
      <Script src="/JS/eventListeners.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/drawCircle.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/drawSquare.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/imageTool.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/lineTool.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/canvasStroke.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/writeText.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/writeCode.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/drawArrow.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/frameHolder.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/icons.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/undoAndRedo.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/copyAndPaste.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/zoomFunction.js" strategy="afterInteractive" />
      <Script src="/JS/selection.js" type="module" strategy="afterInteractive" />
      <Script src="/JS/laserTool.js" strategy="afterInteractive" />
      <Script src="/JS/eraserTrail.js" strategy="afterInteractive" />
      <Script src="/JS/eraserTool.js" strategy="afterInteractive" />
    </div>
  )
}
