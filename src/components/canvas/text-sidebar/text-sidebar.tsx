import { cn } from '@/lib/utils'
import React from 'react'
interface Props {
     isOpen: boolean
}
const TextSideBar = ({
    isOpen
}: Props) => {
  return (
    <div className={
        cn(
            'fixed right-5 top-1/2 transform -translate-y-1/2 w-80 backdrop:blur-xl bg-white/[0.08] border border-white/[0.12] p-3 gap-2 saturate-150 rounded-lg z-15 transition-transform duration-300',
            isOpen  ? 'translate-x-0' : 'translate-x-full'
        )
    }>
  hhhh
    
    </div>
  )
}

export default TextSideBar