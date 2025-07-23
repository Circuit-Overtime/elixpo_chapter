'use client'
import prisma from '@/lib/db'
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'
import React, { Suspense, useState } from 'react'
import {ResizableHandle,ResizablePanel,ResizablePanelGroup} from "@/components/ui/resizable"
import MesssageContainer from './components/message-container'
import { Fragment } from '@/generated/prisma'
import ProjectHeader from './components/ProjectHeader'
import FragmentView from './components/FragmentView'
import { Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Braces, CrownIcon, EyeIcon } from 'lucide-react'
import CodeView from '@/components/code-view/CodeView'
import FileExplorer from '@/components/FileExploer'
interface Props {
     projectId: string
}

const ProjectView =  ({projectId}: Props) => {
     const files = {
    "index.tsx": `console.log("Hello world")`,
    "style.css": `body { background: #000; }`,
    "README.md": `# My App`,
  }
  /* const trpc = useTRPC()
  const {data: projects} =  useSuspenseQuery(trpc.projects.getOne.queryOptions({
     id: projectId
  })) */
  const [activeFragment,setActiveFragment] = useState<Fragment | null>(null);
  const [tabState,setTabState] = useState<"preview" | "code">("preview")
  return (
    <div className='h-screen'>
     <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel
         defaultSize={35}
         minSize={25}
         className='flex flex-col  min-h-0'
        >
         <Suspense fallback={<div>Loading...</div>}>
             <ProjectHeader projectId={projectId} />
         </Suspense>
         <Suspense fallback={<div>Loading...</div>}>
             <MesssageContainer
             activeFragment={activeFragment}
             setActiveFragment={setActiveFragment}
              projectId={projectId}/>
         </Suspense>
        </ResizablePanel>
        <ResizableHandle className='hover:bg-primary transition-colors' />
        <ResizablePanel
         defaultSize={65}
         minSize={50}
        >
         <Tabs
          className='h-full'
          defaultValue='preview'
          value={tabState}
          onValueChange={(value) => setTabState(value as "preview" | "code")}
         >
          <div className='flex w-full justify-between bg-sidebar p-2 border-b'>
            <TabsList className='h-8 p-0 gap-1  border rounded-md'>
                <TabsTrigger className='rounded-md' value='preview'>
                    <EyeIcon className='size-4'  />
                     <span className='font-mono text-xs'>Demo</span>
                </TabsTrigger>
                <TabsTrigger className='rounded-md' value='code'>
                    <Braces className='size-4' /> <span className='font-mono text-xs'>Code</span>
                </TabsTrigger>
            </TabsList>
            <div className='ml-auto flex items-center'>
              <Button
                asChild size='sm'
                className='bg-purple-400 dark:bg-purple-300'
              >
               <Link className='font-mono' href="/">
                <CrownIcon/> Upgrade
               </Link>
              </Button>
            </div>
          </div>
          <TabsContent className='-mt-2'  value='preview'>
             {
                !!activeFragment && <FragmentView data={activeFragment} />
             }
          </TabsContent>
          <TabsContent className='-mt-2 min-h-0' value='code'>
           {
            !!activeFragment?.files && <FileExplorer files={activeFragment?.files as {[path:string]:string}} />
           }
           
          </TabsContent>
         </Tabs>
         
        </ResizablePanel>
     </ResizablePanelGroup>
    </div>
  )
}

export default ProjectView 