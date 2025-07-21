'use client'
import prisma from '@/lib/db'
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'
import React, { Suspense } from 'react'
import {ResizableHandle,ResizablePanel,ResizablePanelGroup} from "@/components/ui/resizable"
import MesssageContainer from './components/message-container'
interface Props {
     projectId: string
}

const ProjectView =  ({projectId}: Props) => {
  /* const trpc = useTRPC()
  const {data: projects} =  useSuspenseQuery(trpc.projects.getOne.queryOptions({
     id: projectId
  })) */
  
  return (
    <div className='h-screen'>
     <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel
         defaultSize={35}
         minSize={25}
         className='flex flex-col px-2 min-h-0'
        >
         <Suspense fallback={<div>Loading...</div>}>
             <MesssageContainer projectId={projectId}/>
         </Suspense>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
         defaultSize={65}
         minSize={50}
        >
          TODO Preview
        </ResizablePanel>
     </ResizablePanelGroup>
    </div>
  )
}

export default ProjectView 