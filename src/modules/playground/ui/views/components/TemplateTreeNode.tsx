'use client'
import React, { useState } from 'react'
import { TemplateFolder, TemplateFiles, TemplateTreeNodeProps } from '../types/types'
import { Folder, FolderOpen, File, Plus, Trash, Pencil, MoreHorizontal, Edit, Trash2, ChevronRight, FilePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarMenuButton, SidebarMenuItem, SidebarMenu } from '@/components/ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogHeader } from '@/components/ui/alert-dialog'
import { AlertDialogContent, AlertDialogTitle } from '@radix-ui/react-alert-dialog'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CollapsibleContent } from '@radix-ui/react-collapsible'

const TemplateTreeNode: React.FC<TemplateTreeNodeProps> = ({
  item,
  level = 0,
  path = '',
  selectedFiles,
  onFileSelect,
  onAddFile,
  onAddFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder
}) => {

  const isValidItem = item && typeof item === 'object'
  const isFolder = isValidItem && "folderName" in item

  const [isOpen, setIsOpen] = useState<boolean>(level < 2) // open first few levels
  const [isDeleteDialog, setIsOpenDeleteDialog] = useState(false)

  if (!isValidItem) return null

  // ---- File Rendering ----
  if (!isFolder) {
    const file = item as TemplateFiles
    const fullFileName = `${file.filename}.${file.fileExtension}`
    const isActive =
      selectedFiles?.filename === file.filename &&
      selectedFiles?.fileExtension === file.fileExtension

    return (
      <SidebarMenuItem>
       <div className='flex items-center justify-between group'>
         <SidebarMenuButton
          onClick={() => onFileSelect?.(file)}
          className={cn(
            "flex items-center gap-2 w-full",
            isActive && "bg-accent text-accent-foreground"
          )}
        >
          <File className="size-4" />
          <span className="truncate">{fullFileName}</span>
        </SidebarMenuButton>

        <DropdownMenu>
            <DropdownMenuTrigger asChild >
                <Button variant={"ghost"} size={"icon"} className='opacity-0 group-hover:opacity-100 h-6 w-6' >
                    <MoreHorizontal className='size-3'  />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
                <DropdownMenuItem>
                    <Edit className='size-3' />
                    Rename
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setIsOpenDeleteDialog(true)} className='flex items-center'>
                    <Trash2 color='red' className='size-3' />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
       </div>

       
      </SidebarMenuItem>
    )
  }

  // ---- Folder Rendering ----
const folder = item as TemplateFolder
const currentPath = path ? `${path}/${folder.folderName}` : folder.folderName

return (
  <SidebarMenuItem>
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full group/collapsible"
    >
      {/* Folder header row */}
      <div className="flex items-center justify-between w-full">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="flex items-center gap-2 w-full">
            <ChevronRight className="transition-transform data-[state=open]:rotate-90" />
            <Folder className="h-4 w-4 text-pink-600" />
            <span className="truncate">{folder.folderName}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {/* Folder actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover/collapsible:opacity-100 h-6 w-6"
            >
              <MoreHorizontal className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddFile?.({ filename: "newFile", fileExtension: "txt", content: "" }, currentPath)}>
              <FilePlus className="size-3" /> Add File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddFolder?.({ folderName: "New Folder", items: [] }, currentPath)}>
              <Folder className="size-3" /> Add Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRenameFolder?.(folder, "Renamed Folder", path)}>
              <Edit className="size-3" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteFolder?.(folder, path)} className="text-red-600">
              <Trash2 className="size-3" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folder children with vertical line */}
      <CollapsibleContent asChild>
        <ul className="pl-4 ml-2 border-l border-gray-300 dark:border-gray-700 space-y-1">
          {folder.items?.map((child, idx) => (
            <TemplateTreeNode
              key={idx}
              item={child}
              level={level + 1}
              path={currentPath}
              selectedFiles={selectedFiles}
              onFileSelect={onFileSelect}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onDeleteFile={onDeleteFile}
              onDeleteFolder={onDeleteFolder}
              onRenameFile={onRenameFile}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  </SidebarMenuItem>
)
}

export default TemplateTreeNode
