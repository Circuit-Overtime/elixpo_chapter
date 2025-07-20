'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTRPC } from '@/trpc/client'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'

const page = () => {
  const [value,setValue] = useState("")
  const trpc = useTRPC();
  const router = useRouter();
  
  const createProject = useMutation(trpc.projects.create.mutationOptions({
    onSuccess: (data) => {
        router.push(`/projects/${data.id}`)
    },
    onError: () => {
       toast.error("fuck not happend")
    }
  }))
  return (
   <div className='px-10'>
    <Input
     className='mt-10 py-8 px-5 bg-[#ddd] text-black'
     placeholder='Enter Your fucking prompt'
     value={value}
     onChange={(e) => setValue(e.target.value)}
    />
    <Button disabled={createProject.isPending} onClick={() => createProject.mutate({prompt: value})} variant='ghost' className='text-black mt-5 ml-4 bg-white p-2 px-5 rounded-md'>
      Background job Invoke
    </Button>
   </div>
  )
}

export default page