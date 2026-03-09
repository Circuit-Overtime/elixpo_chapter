"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'

const TOOL_ITEMS = [
  { tool: TOOLS.PAN, icon: 'bxs-hand', title: 'Pan (H)' },
  { tool: TOOLS.SELECT, icon: 'bxs-pointer', title: 'Select (V)' },
  'spacer',
  { tool: TOOLS.RECTANGLE, icon: 'bx-square', title: 'Rectangle (R)' },
  { tool: TOOLS.CIRCLE, icon: 'bx-circle', title: 'Circle (O)' },
  { tool: TOOLS.LINE, icon: 'bx-minus', title: 'Line (L)' },
  { tool: TOOLS.ARROW, icon: 'bx-right-arrow-alt', title: 'Arrow (A)', rotate: true },
  { tool: TOOLS.TEXT, icon: 'bx-text', title: 'Text (T)' },
  { tool: TOOLS.FREEHAND, icon: 'bx-pen', title: 'Freehand (P)' },
  { tool: TOOLS.IMAGE, icon: 'bx-image-alt', title: 'Image (9)' },
  { tool: TOOLS.ICON, icon: 'bx-wink-smile', title: 'Icon' },
  'spacer',
  { tool: TOOLS.FRAME, icon: 'bx-crop', title: 'Frame (F)' },
  { tool: TOOLS.LASER, icon: 'bxs-magic-wand', title: 'Laser (K)' },
  { tool: TOOLS.ERASER, icon: 'bxs-eraser', title: 'Eraser (E)' },
  { tool: 'ai', icon: null, title: 'AI', isAI: true },
]

export default function Toolbar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const setActiveTool = useSketchStore((s) => s.setActiveTool)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)

  return (
    <div className="absolute top-[60px] left-2.5 w-[46px] rounded-xl bg-surface z-[1000] flex flex-col items-center py-1.5 gap-0.5 font-[lixFont]">
      {TOOL_ITEMS.map((item, idx) => {
        if (item === 'spacer') {
          return (
            <div
              key={`spacer-${idx}`}
              className="w-6 h-px bg-border-light my-1"
            />
          )
        }

        const isActive = activeTool === item.tool

        if (item.isAI) {
          return (
            <button
              key="ai"
              title={item.title}
              onClick={toggleAIModal}
              className="w-[38px] h-[38px] flex items-center justify-center rounded-lg text-text-muted hover:text-accent hover:bg-surface-hover transition-all duration-200"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
              </svg>
            </button>
          )
        }

        return (
          <button
            key={item.tool}
            title={item.title}
            onClick={() => setActiveTool(item.tool)}
            className={`w-[33px] h-[33px] flex items-center justify-center rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-surface-active text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <i
              className={`bx ${item.icon} text-xl`}
              style={item.rotate ? { transform: 'rotate(-45deg)' } : undefined}
            />
          </button>
        )
      })}
    </div>
  )
}
