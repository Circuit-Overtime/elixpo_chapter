"use client"
import PlaygroundLayout from '@/app/playground/[playgroundId]/PlaygroundLayout'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { usePlayground } from '@/features/playground/hooks/usePlayground'

import React, { useEffect } from 'react'
import { useTRPC } from '@/trpc/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import TemplateTree from './components/templates-tree'
import CustomLoader from '@/components/loader/CustomLoader'

interface Props {
  playgroundId: string
}

const PlaygroundView = ({ playgroundId }: Props) => {
  const trpc = useTRPC()
 /*  const {data: data} = useSuspenseQuery(trpc.playground.getPlayground.queryOptions({id: playgroundId})) */
  const {
    playgroundData,
    templateData,
    isLoading,
    error,
    loadPlayground,
    saveTemplateData,
    isSaving
  } = usePlayground(playgroundId)

  useEffect(() => {
    if (playgroundId) {
      loadPlayground()
    }
  }, [playgroundId]) // Only depend on playgroundId
  console.log(playgroundData?.name)

  if (isLoading) {
    return (
     <div>
        <CustomLoader/>
     </div>
    )
  }

  if (error) {
    return (
      <PlaygroundLayout>
        <div className="p-4 text-red-500">
          Error loading playground: {error}
        </div>
      </PlaygroundLayout>
    )
  }

  return (
    <PlaygroundLayout>
      <TooltipProvider>
        <SidebarInset>
         {/*  <header className="flex items-center">
            <SidebarTrigger className='ml-1' />
            <Separator orientation='vertical' className='mr-2 h-4' />
            <div className='flex flex-1 items-center gap-2'>
              <div className='flex flex-col flex-1'>
                <h2 className="font-medium">
                  {playgroundData?.title || "react"}
                </h2>
                {isSaving && (
                  <span className="text-xs text-muted-foreground">Saving...</span>
                )}
              </div>
            </div>
          </header> */}
          
          {/* Add your template content here */}
          {templateData && (
            <div className="mt-4">
               <TemplateTree
               data={templateData}
               title={playgroundData?.title}
               />
              
            </div>
          )}
        </SidebarInset>
      </TooltipProvider>
    </PlaygroundLayout>
  )
}

export default PlaygroundView