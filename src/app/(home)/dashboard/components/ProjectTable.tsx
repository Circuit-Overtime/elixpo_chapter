"use client"
import React, { useState } from 'react'
import { EditProjectProps, PlayGroundProjects, PlayGroundTableTypesProps } from '../types/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from "date-fns";
import Image from 'next/image'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { Button } from '@/components/ui/button'
import { Code2, Copy, Download, Edit3, ExternalLink, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
const ProjectTable = ({
    projects=[],
    onDelete,
    onDuplicate,
    onUpdate
}: PlayGroundTableTypesProps) => {

    const [deleteDialogOpen,setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [seletedProject, setSelectedProject] = useState<PlayGroundProjects | null>(null);
    const [editData,setEditData] = useState<EditProjectProps>({title: " ", describtion: " "});
    const [isLoading, setIsLoading] = useState(false);
    const [favorite, setFavorite] = useState(false);

   const copyProjectUrl = async (projectId: string) => {
     
   } 

   const handleEditClick = async (project:PlayGroundProjects) => {
     
   }
   const handleDuplicateProject = async (project: PlayGroundProjects) => {
       
   }
   const handleDeleteClick = async (project: PlayGroundProjects) => {
     if(onDelete) {
         onDelete(project.id)
     }
   }
  const frameworkColors = {
  react: "bg-blue-500 text-white", 
  nextjs: "bg-gray-900 text-white",
  vue: "bg-green-500 text-white",
  angular: "bg-red-600 text-white",
  svelte: "bg-orange-500 text-white",
  default: "bg-pink-600 text-white" // fallback
};
  return (
    <>
   
   <div className='flex flex-col md:w-full gap-2'>
    <h1 style={{fontFamily: "poppins"}} className='text-2xl mb-2 flex items-center gap-2 font-bold'>Recent <span className='text-neutral-500'>Projects</span> 
        <Code2/>
         </h1>
     <div className='border w-full  rounded-md overflow-hidden'>
     <Table >
        <TableHeader>
            <TableRow>
                <TableHead>Projects</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Created</TableHead>
               
                <TableHead className='w-[50px]'>Actions</TableHead>
            </TableRow>
        </TableHeader>

        <TableBody>
            {
                projects.map((project) => (
                    <TableRow key={project.id} >
                       <TableCell>
                         <div className='flex flex-col'>
                         <Link href={`/playground/${project.id}`} >
                         <span className='font-mono text-xs'>{project.title}</span>
                         </Link>
                        </div>
                       </TableCell>

                       <TableCell>
                       <Badge
                       
                       variant={"outline"} className='bg-pink-800 ' >
                        {project.template}
                       </Badge>
                       </TableCell>

                      <TableCell>
                       {project.createdAt
                       ? format(new Date(project.createdAt), "dd MMM yyyy")
                      : "—"}
                      </TableCell>

                     

                      <TableCell  >
                        <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48  flex flex-col space-y-3 font-mono dark:bg-neutral-950 p-4 rounded-md">
                      <DropdownMenuItem asChild>
                        {/* <MarkedToggleButton
                          markedForRevision={project.Starmark[0]?.isMarked}
                          id={project.id}
                        /> */}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/playground/${project.id}`}
                          className="flex items-center"
                        >
                          <span className='flex items-center gap-1'>
                         <Eye className="h-4 w-4 mr-2" />
                          Open Project
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className='hover:border-none' asChild>
                        <Link
                          href={`/playground/${project.id}`}
                          target="_blank"
                          className="flex items-center"
                        >
                         <span className='flex items-center gap-1'>
                         <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                         </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleEditClick(project)}
                      >
                       <span className='flex items-center gap-1'>
                         <Edit3 className="h-4 w-4 mr-2" />
                        Edit Project
                       </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicateProject(project)}
                      >
                        <span className='flex items-center gap-1'>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => copyProjectUrl(project.id)}
                      >
                       <span className='flex gap-1 items-center'>
                         <Download className="h-4 w-4 mr-2" />
                        Copy URL 
                       </span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(project)}
                        className="text-destructive focus:text-destructive"
                      >
                       <span className='flex items-center gap-1'>
                         <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                       </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))
            }
        </TableBody>
     </Table>
    </div>
   </div>
    </>
  )
}

export default ProjectTable