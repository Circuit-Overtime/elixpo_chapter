'use client'
import { Button } from '@/components/ui/button'
import { useTRPC } from '@/trpc/client'
import { trpc } from '@/trpc/server'
import { useMutation } from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'

const page = () => {
  const trpc = useTRPC();
  const invoke = useMutation(trpc.invoke.mutationOptions({
    onSuccess: () => {
       toast.success("fuck it happend")
    }
  }))
  return (
    <>
    <Button onClick={() => invoke.mutate({text: "lexi luna"})} variant='ghost' className='text-black mt-5 ml-4 bg-white p-2 px-5 rounded-md'>
      Background job Invoke
    </Button>
    </>
  )
}

export default page