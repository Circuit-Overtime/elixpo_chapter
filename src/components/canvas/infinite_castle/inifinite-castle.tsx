'use client'
import { useInfiniteCastle } from '@/hooks/use-infinite-castle'
import React from 'react'
import TextSideBar from '../text-sidebar/text-sidebar'
import { cn } from '@/lib/utils'
import ShapesRenderer from '../shapes/shapes-renderer'
import { EnhancedDebug } from '@/components/debug'

const InfiniteCastle = () => {
  const inifiniteCastle = useInfiniteCastle()
  return (
   <>
   <EnhancedDebug/>
    <TextSideBar isOpen={inifiniteCastle.isSidebarOpen} />
    {/* inspiration */}
    {/* chatwindow */}
    
     <div
     ref={inifiniteCastle.attachCanvasRef}
     role='application'
     aria-label='Inifinite drawing canvas'
     onPointerDown={inifiniteCastle.onPointerDown}
     onPointerCancel={inifiniteCastle.onPointerCancel}
     onPointerUp={inifiniteCastle.onPointerUp}
     onPointerMove={inifiniteCastle.onPointerMove}
     onContextMenu={(e) => e.preventDefault()}
     draggable={false}
     style={{touchAction: 'none'}}
     className={
        cn(
            'relative w-full h-full overflow-hidden select-none z-0',
            {
                'cursor-grabbing': inifiniteCastle.viewport.mode === 'panning',
                'cursor-grab': inifiniteCastle.viewport.mode === 'shiftPanning',
                'cursor-crosshair':
                 inifiniteCastle.currentTool !== 'select' && inifiniteCastle.viewport === 'idle',
                 'cursor-default': inifiniteCastle.currentTool === 'select' && inifiniteCastle.viewport === 'idle' 
            }
        )
     }
    >   
        <div 
        style={{
            transform: `translate3d(${inifiniteCastle.viewport.translate.x}px, ${inifiniteCastle.viewport.translate.y}px,0) scale${inifiniteCastle.viewport.scale}`,
            transformOrigin: '0 0',
            willChange: 'transform'
        }}
        className='absolute origin-top-left pointer-events-none z-10'
        >
            {
                inifiniteCastle.shapes.map((shape) => (
                    <ShapesRenderer
                     key={shape.id}
                     shape={shape}
                    />
                ))
            }

        </div>
    </div> 
   </>
  )
}

export default InfiniteCastle