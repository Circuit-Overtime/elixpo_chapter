'use client'
import React from "react";
import { TemplateFileTreeProps } from "../types/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePlus2, FolderPlus, Plus } from "lucide-react";
import TemplateTreeNode from "./TemplateTreeNode";

const TemplateTree = ({
  data,
  onAddFile,
  onAddFolder,
  onDeleteFile,
  onDeleteFolder,
  onFileSelect,
  onRenameFile,
  onRenameFolder,
  selectedFile,
  title,
}: TemplateFileTreeProps) => {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          {title && (
            <SidebarGroupLabel className="font-mono text-xs">
              {title}
            </SidebarGroupLabel>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarGroupAction>
                <Plus className="size-4" />
              </SidebarGroupAction>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="font-mono" align="end">
              <DropdownMenuItem onClick={() => {}}>
                <FolderPlus className="size-4" />
                New Folder
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => {}}>
                <FilePlus2 className="size-4" />
                New File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <SidebarGroupContent>
            {data && (
             
                <TemplateTreeNode
                  item={data}
                  level={0}
                  path=""
                  selectedFiles={selectedFile}
                  onFileSelect={onFileSelect}
                  onAddFile={onAddFile}
                  onAddFolder={onAddFolder}
                  onDeleteFile={onDeleteFile}
                  onDeleteFolder={onDeleteFolder}
                  onRenameFile={onRenameFile}
                  onRenameFolder={onRenameFolder}
                />
             
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default TemplateTree;
