// components/enhanced-debug.tsx
'use client'
import { useInfiniteCastle } from '@/hooks/use-infinite-castle'
import { useState, useEffect } from 'react'

export const EnhancedDebug = () => {
  const { currentTool, selectTool, shapes, viewport, onPointerDown } = useInfiniteCastle()
  const [lastEvent, setLastEvent] = useState<string>('None')
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPointerPos({ x: e.clientX, y: e.clientY })
    }
    document.addEventListener('mousemove', handleMove)
    return () => document.removeEventListener('mousemove', handleMove)
  }, [])

  const testPointerDown = (e: React.PointerEvent) => {
    setLastEvent(`PointerDown - Button: ${e.button}, Tool: ${currentTool}`)
    console.log('🔴 Manual PointerDown:', {
      button: e.button,
      tool: currentTool,
      clientX: e.clientX,
      clientY: e.clientY,
      isSpacePressed: false // We'll check this too
    })
    //@ts-ignore
    onPointerDown(e)
  }

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded z-50 text-xs font-mono space-y-2">
      <div><strong>Current Tool:</strong> {currentTool}</div>
      <div><strong>Viewport Mode:</strong> <span className={viewport.mode !== 'idle' ? 'text-green-400' : 'text-red-400'}>{viewport.mode}</span></div>
      <div><strong>Shapes Count:</strong> {shapes.length}</div>
      <div><strong>Pointer:</strong> {pointerPos.x}, {pointerPos.y}</div>
      <div><strong>Last Event:</strong> {lastEvent}</div>
      
      {/* Test Area */}
      <div 
        className="mt-3 p-3 border border-dashed border-white/30 rounded cursor-crosshair"
        onPointerDown={testPointerDown}
        title="Click here to test pointer events"
      >
        <strong>TEST AREA - Click here:</strong>
        <div className="text-[10px] opacity-70">
          This will trigger onPointerDown with current tool: {currentTool}
        </div>
      </div>

      <div className="flex gap-2 mt-2 flex-wrap">
        <button onClick={() => selectTool('rect')} className="bg-blue-500 px-3 py-1 rounded text-xs">Rect</button>
        <button onClick={() => selectTool('select')} className="bg-green-500 px-3 py-1 rounded text-xs">Select</button>
        <button onClick={() => selectTool('ellipse')} className="bg-purple-500 px-3 py-1 rounded text-xs">Ellipse</button>
        <button onClick={() => selectTool('freedraw')} className="bg-orange-500 px-3 py-1 rounded text-xs">FreeDraw</button>
      </div>
    </div>
  )
}