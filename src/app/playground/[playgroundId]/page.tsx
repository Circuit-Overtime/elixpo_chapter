import { getQueryClient, trpc } from '@/trpc/server';
import { dehydrate, HydrationBoundary, useQueryClient } from '@tanstack/react-query';
import React from 'react'

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
    <span>hey</span>
   </HydrationBoundary>
  )
}

export default Page