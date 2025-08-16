'use client'
import React, { useState } from 'react'
import { TemplateFolder, TemplateFile, TemplateTreeNodeProps, RenameFolderDialogProps, RenameFildDialogProps } from '../types/types'
import { Folder, File, MoreHorizontal, Edit, Trash2, ChevronRight, FilePlus, FolderPlus, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarMenuButton, SidebarMenuItem, SidebarMenu, Sidebar, SidebarContent, SidebarMenuSub } from '@/components/ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CollapsibleContent } from '@radix-ui/react-collapsible'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@radix-ui/react-dialog'
import { DialogFooter, DialogHeader } from '@/components/ui/dialog'
import GradientButton from '@/components/Custombuttons/GradientButton'
import { RenameFolderDialog } from './Dialogs/RenameFolderDialog'



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
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false)
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = React.useState(false)
  const handelOnRename = () => {
    
  }

  const handleRenameSubmit = () => {

  }

  const openRenameFolderDialog = () => {
     setIsNewFolderDialogOpen(true)
  }

  const openRenameFileDialog = () => {
     setIsNewFileDialogOpen(true)
  }
   if (!isValidItem) return null

  if (!isFolder) {
  const file = item as TemplateFile;
  const fileName = `${file.filename}.${file.fileExtension}`;
  const isSelected = selectedFiles && selectedFiles.filename === file.filename && selectedFiles.fileExtension === file.fileExtension;
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(fileName);

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== fileName) {
      const [filename, ...extParts] = newName.split('.');
      const fileExtension = extParts.join('.');
      onRenameFile?.(file, filename, fileExtension, path);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewName(fileName);
    }
  };

  return (
    <SidebarMenuItem>
      <div className="flex items-center group">
        {isRenaming ? (
          <div className="flex-1 relative">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRenameSubmit}
              className="h-8 px-2 py-1 text-sm border rounded"
            />
          </div>
        ) : (
          <>
            <SidebarMenuButton 
              isActive={isSelected} 
              onClick={() => onFileSelect?.(file)} 
              className="flex-1"
            >
              <File className="h-4 w-4 mr-2 shrink-0" />
              <span>{fileName}</span>
            </SidebarMenuButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setNewName(fileName);
                  setIsRenaming(true);
                }}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </SidebarMenuItem>
  );
} else {
    const folder = item as TemplateFolder
    const folderName = folder.folderName
    const currentPath = path ? `${path}/${folderName}` : folderName

   
  
    return (
     <div>


         <SidebarMenuItem>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="group/collapsible [&[data-state=open]>div>button>svg:first-child]:rotate-90"
        >
          <div className="flex items-center group">
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="flex-1">
                <ChevronRight className="transition-transform" />
                <Folder className="h-4 w-4 mr-2 shrink-0" />
                <span>{folderName}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem >
                  <FilePlus className="h-4 w-4 mr-2" />
                  New File
                </DropdownMenuItem>
                <DropdownMenuItem >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openRenameFolderDialog} >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem  className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CollapsibleContent>
            <SidebarMenuSub>
              {folder.items.map((childItem, index) => (
                <TemplateTreeNode
                  key={index}
                  item={childItem}
                  onFileSelect={onFileSelect}
                  selectedFiles={selectedFiles}
                  level={level + 1}
                  path={currentPath}
                  onAddFile={onAddFile}
                  onAddFolder={onAddFolder}
                  onDeleteFile={onDeleteFile}
                  onDeleteFolder={onDeleteFolder}
                  onRenameFile={onRenameFile}
                  onRenameFolder={onRenameFolder}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>

       

       

     
      </SidebarMenuItem>

       {isNewFolderDialogOpen && (
          <div className="fixed  inset-0 z-50 flex items-center justify-center bg-opacity-50">
            <div className="bg-transparent border rounded-lg p-6 w-full max-w-md">
          <RenameFolderDialog
          isOpen={isNewFolderDialogOpen}
          currentFolderName={folder.folderName}
          onClose={() => setIsNewFolderDialogOpen(false)}
          onRename={handelOnRename}
         
         />
            </div>
          </div>
        )}
     </div>
    )
}
  }



export default TemplateTreeNode






const RenameFileDialog = ({
   currentExtension,
   currentFileName,
   isOpen,
   onClose,
   onRename
}: RenameFildDialogProps) => {
     const [filename, setFilename] = React.useState(currentFileName);
     const [extension, setExtension] = React.useState(currentExtension);

      React.useEffect(() => {
    if (isOpen) {
      setFilename(currentFileName);
      setExtension(currentExtension)
    }
  }, [isOpen, currentFileName,currentExtension]);
   const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filename.trim()) {
      onRename(filename.trim(), extension.trim() || currentExtension);
    }
  };

  
     return (
         <Dialog open={isOpen} onOpenChange={onClose} >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Rename File
                    </DialogTitle>
                    <DialogDescription>
                        Enter a name to rename your File
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} >
                    <div className="relative flex-1 flex flex-col gap-2">  
  {/* Label */}
  <label 

    className="text-xs font-mono font-bold ml-2 "
  >
     Rename File
  </label>

  {/* Input Wrapper */}
  <div className="relative">
   
    <div className="absolute left-4 top-1/2 -translate-y-1/2 ">
      <Edit className="size-4" />
    </div>

    {/* Input Field */}
    <Input
      id="rename-foldername"
      value={filename}
      onChange={(e) => setFilename(e.target.value)}
     
      className="pl-12 py-6 w-full rounded-lg border placeholder:font-mono text-xs"
      placeholder="Rename your folder"
    />
  </div>
</div>


                 </form>

                 <DialogFooter>
                    <div className='w-full flex justify-between items-center'>
                       <Button onClick={onClose} className='text-white font-mono bg-red-600 rounded-none'>
                        Cancel
                       </Button>

                       <GradientButton>
                         Rename
                       </GradientButton>
                    </div>

                 </DialogFooter>
            </DialogContent>
         </Dialog>
     )
}
