
import { Tool } from '@/redux/slices/shapes'
import { ArrowRight, Circle, Ellipsis, Eraser, Hash, Minus, MousePointer, Pencil, RectangleCircle, Type } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'



const ToolbarShapes = () => {
  const options: Array<{
     id: Tool
     label: string
     icon: React.ReactNode
     description: string
  }> = [
    {
      id: 'frame',
      label: 'Frames',
      icon: <Hash className='w-4 h-4'/>,
      description: 'Draw a fram container'
    },
    {
      id: 'select',
      label: "Select",
      icon: <MousePointer className='w-4 h-5' />,
      description: 'Select and move shapes'
    },
    {
      id: 'rect',
      label: "Rectangle",
      icon: <RectangleCircle className='w-4 h-4' />,
      description: 'Draw a rectangle'
    },
    {
      id: 'ellipse',
      label: "Ellipse",
      icon: <Ellipsis className='w-4 h-4' />,
      description: "Draw a ellipse"
    },
    {
      id: 'freedraw',
      label: "FreeDraw",
      icon: <Pencil className='w-4 h-4' />,
      description: "Draw freehand lines"
    },
    {
      id: 'line',
      label: "Line",
      icon: <Minus className='w-4 h-4' />,
      description: 'Draw Straight line'
    },
    {
      id: 'text',
      label: "Text",
      icon: <Type className='w-4 h-4' />,
      description: 'Add a text block'
    },
    {
      id: 'arrow',
      label: 'Arrow',
      icon: <ArrowRight className='w-4 h-4'/>,
      description: 'Draw Arrow with direction'
    },
    {
      id: 'eraser',
      label: "Eraser",
      icon: <Eraser className='w-4 h-4' />,
      description: "Remove shapes"
    }
  ]
  return (
    <div className='col-span-1 flex justify-center items-center'>
        <div className='flex backdrop-blur-2xl items-center backdrop-[url("#displacementFilter")] bg-white/[0.08] border border-white/[0.12] gap-2 rounded-full p-2 saturate-150 '>
          {
            options.map((tool) =>(
                <Button 
                 title={`${tool.label} - ${tool.description}`}
                 variant={'ghost'}
                 key={tool.id}
                 className={
                    cn(
                        'rounded-full p-3 cursor-pointer'
                    )
                 }
                >
                    {tool.icon}
                </Button>
            ))
          }
        </div>  
    </div>
  )
}

export default ToolbarShapes