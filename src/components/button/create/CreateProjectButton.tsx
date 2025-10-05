'use client'
import { Button } from '@/components/ui/button';
import { UseProjectCreation } from '@/hooks/use-project';
import { PlusIcon } from 'lucide-react';
import React from 'react'

type Props = {
    label: string;
    onClick: () => void;


}

const CreateProjectButton = (props: Partial<Props>) => {
 /*  const {canCreate,createProject,isCreating} = UseProjectCreation() */
  return (
    <Button 
    className='font-mono text-xs rounded-full' 
    variant={"default"}>
        <PlusIcon className='size-3' />
         New Project
    </Button>
  )
}

export default CreateProjectButton