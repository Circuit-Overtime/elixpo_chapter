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
import { Copy, Download, Edit3, ExternalLink, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
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
     
   }

  return (
    <>
    <div className='border rounded-md overflow-hidden'>
     <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Projects</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>User</TableHead>
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
                       <Badge variant={"outline"} className='bg-pink-900 ' >
                        {project.template}
                       </Badge>
                       </TableCell>

                      <TableCell>
                       {project.createdAt
                       ? format(new Date(project.createdAt), "dd MMM yyyy")
                      : "—"}
                      </TableCell>

                     

                      <TableCell>
                        <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
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
                          <Eye className="h-4 w-4 mr-2" />
                          Open Project
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/playground/${project.id}`}
                          target="_blank"
                          className="flex items-center"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleEditClick(project)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicateProject(project)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => copyProjectUrl(project.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(project)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
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
    </>
  )
}

export default ProjectTable