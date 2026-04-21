'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import Header from '@/components/header/Header'
import Toolbar from '@/components/toolbar/Toolbar'
import Footer from '@/components/footer/Footer'
import AppMenu from '@/components/menu/AppMenu'
import ShortcutsModal from '@/components/modals/ShortcutsModal'
import SaveModal from '@/components/modals/SaveModal'
import AIModal from '@/components/modals/AIModal'
import CommandPalette from '@/components/modals/CommandPalette'
import HelpModal from '@/components/modals/HelpModal'
import ExportImageModal from '@/components/modals/ExportImageModal'
import CanvasPropertiesModal from '@/components/modals/CanvasPropertiesModal'
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
import ImageSourcePicker from '@/components/canvas/ImageSourcePicker'
import ImageGenerateModal from '@/components/modals/ImageGenerateModal'
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts'
import useSessionID from '@/hooks/useSessionID'
import useGuestProfile from '@/hooks/useGuestProfile'
import useAuth from '@/hooks/useAuth'
import useAutoSave from '@/hooks/useAutoSave'
import CanvasLoadingOverlay from '@/components/canvas/CanvasLoadingOverlay'
import ContextMenu from '@/components/canvas/ContextMenu'
import FindBar from '@/components/canvas/FindBar'

export default function CanvasPage() {
  useEffect(() => {
    document.body.classList.add('canvas-mode')
    return () => document.body.classList.remove('canvas-mode')
  }, [])

  useAuth()
  useKeyboardShortcuts()
  useSessionID()
  useGuestProfile()
  useAutoSave()

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <Header />
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

      <SVGCanvas />

      <MultiSelectActions />
      <Footer />
      <AppMenu />
      <ShortcutsModal />
      <SaveModal />
      <AIModal />
      <CommandPalette />
      <HelpModal />
      <ExportImageModal />
      <CanvasPropertiesModal />
      <ImageSourcePicker />
      <ImageGenerateModal />
      <ContextMenu />
      <FindBar />
      <CanvasLoadingOverlay />

      {/* Quick-save toast — shown only on explicit Ctrl+S save */}
      <div
        id="save-toast"
        className="hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-9999 px-4 py-2 rounded-xl bg-surface/80 backdrop-blur-md border border-border-light text-text-secondary text-xs font-[lixFont] pointer-events-none animate-fade-in"
      >
        <i className="bx bx-check text-green-400 mr-1.5" />
        Saved
      </div>
    </div>
  )
}
