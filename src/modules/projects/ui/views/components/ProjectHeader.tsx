import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTRPC } from '@/trpc/client'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import Image from 'next/image'
import React from 'react'
import { logos } from '../../../../../../public/assets/images/images'
import { ChevronDown, ChevronLeftIcon, SunMoonIcon } from 'lucide-react'
import Link from 'next/link'
import { DropdownMenuRadioGroup } from '@radix-ui/react-dropdown-menu'
import { useTheme } from 'next-themes'


interface ProjectHeaderProps {
     projectId: string
}
const ProjectHeader = (props: ProjectHeaderProps) => {
  const trpc = useTRPC()
  const {data:project} = useSuspenseQuery(trpc.projects.getOne.queryOptions({id: props.projectId}))
  const {setTheme,theme} = useTheme()
  return (
   <header className='flex justify-between bg-sidebar  p-2  border-b'>
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
           <Button
           size='sm'
           variant='ghost'
           className='focus-visible:ring-0 hover:bg-transparent hover:opacity-75 transition-opacity pl-2'>
            <Image alt='Fing' src={logos.logo2}  className='w-6 h-6 object-contain' />
            <span className='text-md font-mono'>{project.name}</span>
            <ChevronDown />
           </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='bottom'>
           <DropdownMenuItem asChild >
               <Link href="/">
               <ChevronLeftIcon/>
               <span className='font-mono'>Go to Home</span>
               </Link>
           </DropdownMenuItem>
           <DropdownMenuSeparator/>
           <DropdownMenuSub>
            <DropdownMenuSubTrigger className='gap-2'>
                <SunMoonIcon className='size-4 text-muted-foreground'/>
                <span className='text-xs font-mono'>Appearance</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                         <DropdownMenuRadioItem value='light'>
                             <span className='font-mono text-xs'>
                                Light
                             </span>
                         </DropdownMenuRadioItem>
                         <DropdownMenuRadioItem value='dark'>
                             <span className='font-mono text-xs'>
                                Dark
                             </span>
                         </DropdownMenuRadioItem>
                         <DropdownMenuRadioItem value='system'>
                             <span className='font-mono text-xs'>
                                system
                             </span>
                         </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
           </DropdownMenuSub>
        </DropdownMenuContent>
    </DropdownMenu>
   </header>
  )
}

export default ProjectHeader