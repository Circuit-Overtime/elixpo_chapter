/* "use client" */
import { getQueryClient, trpc } from '@/trpc/server';
import { dehydrate, HydrationBoundary, useQueryClient } from '@tanstack/react-query';
import React from 'react'
import PlaygroundLayout from './PlaygroundLayout';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';


interface Props {
   params: Promise<{
     playgroundId: string
   }>
}


const Page = async ({params}: Props) => {
  const {playgroundId} = await params;
  const qureyClient = getQueryClient();
  void qureyClient.prefetchQuery(trpc.playground.getPlayground.queryOptions({
     id: playgroundId
  }))
  return (
   <HydrationBoundary
    state={dehydrate(qureyClient)}
   >
   <PlaygroundLayout>
     <TooltipProvider>
     <>
     {/* TODO: Template tree */}
     <SidebarInset>
      <header>
        <SidebarTrigger className='ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
      </header>
     </SidebarInset>
     </>
   </TooltipProvider>
   </PlaygroundLayout>
   </HydrationBoundary>
  )
}

export default Page