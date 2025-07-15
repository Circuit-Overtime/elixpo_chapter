import { getQueryClient, trpc } from '@/trpc/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Suspense } from 'react';
import Client from './client';


const page = async () => {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.hello.queryOptions({text: "subhro pre"}))
  return (
    <HydrationBoundary state={dehydrate(queryClient)} >
      <Suspense fallback={ <div>...loading</div> } >
        <Client/>
      </Suspense>
    </HydrationBoundary>
  )
}

export default page