'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTRPC } from '@/trpc/client'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'
import Layout from './layout'
import Navbar from './components/Navbar'
import Hero from './components/Hero'

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
   <Layout>
    <Navbar/>
    <Hero/>
   </Layout>
  )
}

export default page