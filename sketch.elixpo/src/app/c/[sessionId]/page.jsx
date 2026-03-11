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
import RectangleSidebar from '@/components/sidebars/RectangleSidebar'
import CircleSidebar from '@/components/sidebars/CircleSidebar'
import LineSidebar from '@/components/sidebars/LineSidebar'
import ArrowSidebar from '@/components/sidebars/ArrowSidebar'
import PaintbrushSidebar from '@/components/sidebars/PaintbrushSidebar'
import TextSidebar from '@/components/sidebars/TextSidebar'
import FrameSidebar from '@/components/sidebars/FrameSidebar'
import IconSidebar from '@/components/sidebars/IconSidebar'
import SVGCanvas from '@/components/canvas/SVGCanvas'
import MultiSelectActions from '@/components/canvas/MultiSelectActions'
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts'
import useSessionID from '@/hooks/useSessionID'
import useGuestProfile from '@/hooks/useGuestProfile'
import useAuth from '@/hooks/useAuth'
import useAutoSave from '@/hooks/useAutoSave'

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
      <Script src="https://unpkg.com/boxicons@2.1.4/dist/boxicons.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js" strategy="beforeInteractive" />

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
    </div>
  )
}
