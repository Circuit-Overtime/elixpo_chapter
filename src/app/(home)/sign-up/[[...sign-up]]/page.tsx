"use client"
import React from 'react'
import { SignUp } from '@clerk/nextjs'
import AuthLayout from '@/components/AuthLayout'
const page = () => {
  return (
    <AuthLayout>
        <section className="flex justify-center items-center h-screen bg-dot-black/[0.4]">
      <SignUp
       
      />
    </section>
    </AuthLayout>
  )
}

export default page