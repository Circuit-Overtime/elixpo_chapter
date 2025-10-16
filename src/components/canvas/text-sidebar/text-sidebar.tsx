'use client'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { TextShape, updateShape } from '@/redux/slices/shapes'
import { useAppSelector } from '@/redux/store'
import React from 'react'
import { useDispatch } from 'react-redux'
interface Props {
     isOpen: boolean
}

const fontFamilies = [
  "'Inter', sans-serif",
  "'Poppins', sans-serif",
  "'Nunito', sans-serif",
  "'Fira Code', monospace",
  "'Roboto Mono', monospace",
  "'Playfair Display', serif",
  "'Merriweather', serif",
  "'Segoe UI', sans-serif",
  "'Montserrat Alternates', sans-serif",
  "'Space Grotesk', sans-serif"
];

const TextSideBar = ({
    isOpen
}: Props) => {
  const dispatch = useDispatch()
  const shapeEntities = useAppSelector((s) => s.shapes.shapes.entities)
  const selectedShapes = useAppSelector((s) => s.shapes.selected)

  const selectedTextShape = Object.keys(selectedShapes) 
    .map((id) => shapeEntities[id])
    .find((shape) => shape.type === 'text') as TextShape | undefined
  
  const updateTextShape = (property: keyof TextShape, value: any) => {
             if(!selectedTextShape) return
             dispatch(
                updateShape({
                     id: selectedTextShape.id,
                     patch: {[property]: value}
                })
             )
  }
  return (
    <div className={
        cn(
            'fixed right-5 top-1/2 transform -translate-y-1/2 w-80 backdrop:blur-xl bg-white/[0.08] border border-white/[0.12] p-3 gap-2 saturate-150 rounded-lg z-15 transition-transform duration-300',
            true  ? 'translate-x-0' : 'translate-x-full'
        )
    }>
   <div className='p-3 flex flex-col gap-10 overflow-y-auto max-h-[calc(100vh - 8rem)]'>
     <div className='space-y-2'>
        <Label className='font-mono text-xs'>Font Family</Label>
        <Select
         value={selectedTextShape?.fontFamily}
         onValueChange={(value) => updateTextShape('fontFamily', value)}
        >
            <SelectTrigger className='w-full'>
                <SelectValue/>
            </SelectTrigger>
            <SelectContent>
                {
                    fontFamilies.map((font) => (
                         <SelectItem
                          value={font}
                          key={font}
                         >
                            <span style={{fontFamily: font}}>{font.split(',')[0]} </span>
                         </SelectItem>
                    ))
                }
            </SelectContent>
        </Select>
     </div>
   </div>
    
    </div>
  )
}

export default TextSideBar