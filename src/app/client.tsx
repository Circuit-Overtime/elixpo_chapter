'use client'
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react'

const Client = () => {
  const trpc = useTRPC();
  const {data} = useSuspenseQuery(trpc.hello.queryOptions({text: "subhro pre"}));

  useEffect(() => {
    },[])
    const [ ] = useState();
  return (
    <div>{JSON.stringify(data)}</div>
  )
}

export default Client