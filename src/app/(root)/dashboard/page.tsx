"use client"
import { Button } from '@/components/ui/button'
import { UseAuth } from '@/hooks/use-auth'
import React from 'react'

const Page = () => {
  const { handleSignOut } = UseAuth();
  return (
    <Button
    onClick={handleSignOut}
    variant={"destructive"} >
        Logout
    </Button>
  )
}

export default Page