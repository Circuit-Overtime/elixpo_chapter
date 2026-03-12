"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'

const VIEW_MODE_ITEMS = [
  { tool: TOOLS.PAN, icon: 'bxs-hand', title: 'Pan (H)', key: 'H' },
]

const TOOL_ITEMS = [
  { tool: TOOLS.PAN, icon: 'bxs-hand', title: 'Pan (H)', key: 'H' },
  { tool: TOOLS.SELECT, icon: 'bxs-pointer', title: 'Select (V)', key: 'V' },
  'spacer',
  { tool: TOOLS.RECTANGLE, icon: 'bx-square', title: 'Rectangle (R)', key: 'R' },
  { tool: TOOLS.CIRCLE, icon: 'bx-circle', title: 'Circle (O)', key: 'O' },
  { tool: TOOLS.LINE, icon: 'bx-minus', title: 'Line (L)', key: 'L' },
  { tool: TOOLS.ARROW, icon: 'bx-right-arrow-alt', title: 'Arrow (A)', rotate: true, key: 'A' },
  { tool: TOOLS.TEXT, icon: 'bx-text', title: 'Text (T)', key: 'T' },
  { tool: TOOLS.FREEHAND, icon: 'bx-pen', title: 'Freehand (P)', key: 'P' },
  { tool: TOOLS.IMAGE, icon: 'bx-image-alt', title: 'Image (9)', key: '9' },
  { tool: TOOLS.ICON, icon: 'bx-wink-smile', title: 'Icon (I)', key: 'I' },
  'spacer',
  { tool: TOOLS.FRAME, icon: 'bx-crop', title: 'Frame (F)', key: 'F' },
  { tool: TOOLS.LASER, icon: 'bxs-magic-wand', title: 'Laser (K)', key: 'K' },
  { tool: TOOLS.ERASER, icon: 'bxs-eraser', title: 'Eraser (E)', key: 'E' },
  { tool: 'ai', icon: null, title: 'AI', isAI: true },
]

export default function Toolbar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const setActiveTool = useSketchStore((s) => s.setActiveTool)
  const viewMode = useSketchStore((s) => s.viewMode)
  const toolLock = useSketchStore((s) => s.toolLock)
  const toggleToolLock = useSketchStore((s) => s.toggleToolLock)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)

  const items = viewMode ? VIEW_MODE_ITEMS : TOOL_ITEMS

  return (
    <>
    <div className={`fixed left-2.5 top-1/2 -translate-y-1/2 w-[46px] rounded-xl bg-surface z-[1000] flex flex-col items-center py-1.5 gap-0.5 font-[lixFont] max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar`}>
      {/* Tool lock button at the top */}
      {!viewMode && (
        <>
          <button
            title="Tool Lock (Q)"
            onClick={toggleToolLock}
            className={`relative w-[33px] h-[30px] flex items-center justify-center rounded-lg transition-all duration-200 ${
              toolLock
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'text-text-dim hover:text-text-muted hover:bg-surface-hover'
            }`}
          >
            <i className={`bx ${toolLock ? 'bxs-lock-alt' : 'bx-lock-alt'} text-lg`} />
            <span className="absolute bottom-0.5 right-[-1px] text-[10px] leading-none opacity-50">Q</span>
          </button>
          <div className="w-6 h-px bg-border-light my-0.5" />
        </>
      )}

      {items.map((item, idx) => {
        if (item === 'spacer') {
          return (
            <div
              key={`spacer-${idx}`}
              className="w-6 h-px bg-border-light my-0.5"
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
              className="w-[33px] h-[31px] flex items-center justify-center rounded-lg text-text-muted hover:text-accent hover:bg-surface-hover transition-all duration-200"
            >
              <svg
                width="20"
                height="20"
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
            className={`relative w-[33px] h-[31px] flex items-center justify-center rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-surface-active text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <i
              className={`bx ${item.icon} text-xl`}
              style={item.rotate ? { transform: 'rotate(-45deg)' } : undefined}
            />
            {item.key && (
              <span className={`absolute bottom-0.5 right-[-1px] text-[10px] leading-none ${isActive ? 'opacity-60' : 'opacity-35'}`}>
                {item.key}
              </span>
            )}
          </button>
        )
      })}
    </div>
    {viewMode && (
      <div className="absolute top-16 left-2.5 w-[46px] z-[1000] flex justify-center font-[lixFont]">
        <span className="text-text-dim text-[9px] text-center leading-tight">
          View<br/>Mode<br/>
          <kbd className="text-[8px] text-text-muted">Esc</kbd>
        </span>
      </div>
    )}
    </>
  )
}
