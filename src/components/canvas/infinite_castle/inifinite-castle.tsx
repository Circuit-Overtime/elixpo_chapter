'use client'
import { useInfiniteCastle } from '@/hooks/use-infinite-castle'
import React from 'react'
import TextSideBar from '../text-sidebar/text-sidebar'

const InfiniteCastle = () => {
  const inifiniteCastle = useInfiniteCastle()
  return (
   <>
    <TextSideBar isOpen={inifiniteCastle.isSidebarOpen && inifiniteCastle.hasSelectedText} />
   </>
  )
}

export default InfiniteCastle