"use client"
import PlaygroundLayout from '@/app/playground/[playgroundId]/PlaygroundLayout'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { usePlayground } from '@/features/playground/hooks/usePlayground'

import React, { useEffect } from 'react'
import { useTRPC } from '@/trpc/client'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import TemplateTree from './components/templates-tree'
import CustomLoader from '@/components/loader/CustomLoader'
import { useFileExplorer } from '@/features/playground/hooks/useFileExplorer'
import { Button } from '@/components/ui/button'
import { Code, Eye, EyeClosed, EyeOff, File, Files, FilesIcon, FileText, Save, Settings, X } from 'lucide-react'
import { FaMagic } from 'react-icons/fa'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateFile } from './types/types'


interface Props {
  playgroundId: string
}

const PlaygroundView = ({ playgroundId }: Props) => {
  const trpc = useTRPC()
  const [isPreview, setIsPreview] = React.useState(true)
  
  const {
    playgroundData,
    templateData,
    isLoading,
    error,
    loadPlayground,
    saveTemplateData,
    isSaving
  } = usePlayground(playgroundId)

  const explore = useFileExplorer()
  const activeFiles = explore.openFiles.find((file) => file.id === explore.activeFileId);
  const hasUnsavedChanges = explore.openFiles.some((file) => file.hasUnsavedChanges)
  const handleFileSelect = (file: TemplateFile) => {
      explore.openFile(file)
  }
  useEffect(() => {
    if (playgroundId) {
      loadPlayground()
    }
  }, [playgroundId]) // Only depend on playgroundId
  console.log(playgroundData?.name)

  if (isLoading) {
    return (
     <div>
        <CustomLoader/>
     </div>
    )
  }

  if (error) {
    return (
      <PlaygroundLayout>
        <div className="p-4 text-red-500">
          Error loading playground: {error}
        </div>
      </PlaygroundLayout>
    )
  }



  return (
    <PlaygroundLayout>
      <TooltipProvider>
       <>
       {templateData && (
            <div className="mt-4">
               <TemplateTree
               data={templateData}
               title={"File Explorer"}
               onFileSelect={handleFileSelect}
               selectedFile={activeFiles}
               

               />
              
            </div>
          )}
        <SidebarInset>
           <header className="flex items-center h-16 shrink-0 gap-2 border-b px-4">
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='mr-2 h-4' />
            <div className='flex flex-1 items-center gap-2'>
              <div className='flex flex-col flex-1'>
                <h2 className="font-bold font-mono text-xs">
                  {playgroundData?.title || "react"}
                </h2>
                <p className='font-mono text-xs opacity-80'>
                    {explore.openFiles.length} File (s) open
                    {hasUnsavedChanges && "⚪️ unsaved"}
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <Tooltip>
                    <TooltipTrigger
                         
                         asChild>
                         <Button
                          size={"sm"}
                          variant={"outline"}
                          disabled={!hasUnsavedChanges}
                         >
                           <Save className='size-4'/>
                         </Button>
                    </TooltipTrigger>
                    <TooltipContent>save (Ctrl+s)</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger
                         
                         asChild>
                         <Button
                          className='font-mono'
                          size={"sm"}
                          variant={"outline"}
                          disabled={!hasUnsavedChanges}
                         >
                           <Save className='size-4'/> All
                         </Button>
                    </TooltipTrigger>
                    <TooltipContent>save all (Ctrl+Shirt+s)</TooltipContent>
                </Tooltip>

                {/* TODO:TOGGLE AI */}

                <Tooltip>
                    <TooltipTrigger
                         
                         asChild>
                         <Button
                          className='font-mono'
                          size={"sm"}
                          variant={"outline"}
                         
                         >
                           <FaMagic className='size-3'/> FingAI
                         </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fing Ai Agent</TooltipContent>
                </Tooltip>
              <Tooltip>

                 <DropdownMenu>
                    <DropdownMenuTrigger asChild >
                        <Button  className='font-mono'
                          size={"sm"}
                          variant={"outline"}>
                            <Settings  />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className='font-mono' align='end'>
                        <DropdownMenuItem
                          onClick={() => setIsPreview(!isPreview)}
                        >
                          {
                            isPreview ? ( <EyeClosed className='size-3'/>) : (<Eye className='size-3'/>)
                          }
                           {
                            isPreview ? "Hide" : "Preview"
                           }
                        </DropdownMenuItem>
                         <Separator/>
                        <DropdownMenuItem>
                            <X className='size-3'/>
                            Close All Files
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
                 <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              </div>
            </div>
          </header> 
          
         <div className='h-[calc(100vh-4rem)] '>
            {
                explore.openFiles.length > 0 ? (
                  <div className='flex flex-col h-full'>
                    <div className='border-b bg-muted/30' >
                        <Tabs
                         value={explore.activeFileId || " "}
                         onValueChange={explore.setActiveFileId}

                        >
                            <div className='flex items-center justify-between px-4 py-2'>
                                <TabsList className='h-8 bg-transparent flex items-center gap-2'>
                                    {
                                        explore.openFiles.map((files) => (
                                            <TabsTrigger
                                            className='relative  h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group'
                                            value={files.id} key={files.id}>
                                                 <div className='flex items-center gap-1'>
                                                    <FileText className='size-4'/>
                                                    <span>{files.filename}.{files.fileExtension}</span>
                                                    {
                                                        files.hasUnsavedChanges && (
                                                            <span className='h-2 w-2 rounded-full bg-pink-500' />
                                                        )
                                                    }
                                                 </div> 
                                            </TabsTrigger>
                                        ))
                                    }
                                </TabsList>

                            </div>

                        </Tabs>


                    </div>

                    <div>
                        {
                            explore.openFiles.length > 0 && (
                                explore.openFiles.map((data) => (
                                     <div key={data.id}>
                                        {data.content}
                                     </div>
                                ))
                            )
                        }
                    </div>

                  </div>
                ) : (
                     /* implement welcome page task for vivek */
                    <div className='flex flex-col justify-center h-full items-center flex-1'>
                     <FileText className='size-30' />
                     <div className='flex flex-col mt-3 items-center'>
                       
                        <p className='font-mono'>No file open</p>
                        <p className='font-mono'>Select a file to open</p>
                     </div>
                    </div>
                )
            }

         </div>

         
        </SidebarInset>
       </>
         
      </TooltipProvider>
    </PlaygroundLayout>
  )
}

export default PlaygroundView