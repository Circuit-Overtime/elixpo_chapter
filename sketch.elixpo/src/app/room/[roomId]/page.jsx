'use client'

import { useParams } from 'next/navigation'
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
<<<<<<< HEAD
import ImageSourcePicker from '@/components/canvas/ImageSourcePicker'
import ImageGenerateModal from '@/components/modals/ImageGenerateModal'
=======
>>>>>>> 7073836883f58aab478091470a92b25b3fc82a99
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts'
import useGuestProfile from '@/hooks/useGuestProfile'
import useAuth from '@/hooks/useAuth'
import useCollaboration from '@/hooks/useCollaboration'

export default function RoomPage() {
  const { roomId } = useParams()

  useAuth()
  useKeyboardShortcuts()
  useGuestProfile()
  useCollaboration(roomId)

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
<<<<<<< HEAD
      <ImageGenerateModal />
      <ImageSourcePicker />
=======
>>>>>>> 7073836883f58aab478091470a92b25b3fc82a99
    </div>
  )
}
