export interface TemplateFiles {
     filename: string;
     fileExtension: string;
     content: string
}

export interface TemplateFolder {
     folderName: string;
     items: (TemplateFiles | TemplateFolder)[]
}

export type TemplateItem = TemplateFiles | TemplateFolder

export interface TemplateFileTreeProps {
     data?: TemplateItem
     onFileSelect?: (file: TemplateFiles) => void
     selectedFile?: TemplateFiles
     title? : string
     onAddFile?: (file: TemplateFiles,parentPath: string) => void
     onAddFolder?: (file: TemplateFolder, parentPath: string) => void
     onDeleteFile?: (file: TemplateFiles, parentPath: string) => void
     onDeleteFolder?: (file: TemplateFolder, parentPath: string) => void
     onRenameFile?: (file: TemplateFiles, newFileName: string, newExtension: string,parentPath: string) => void
     onRenameFolder?: (file: TemplateFolder, newFolderName: string, parentPath: string) => void
}

export interface TemplateTreeNodeProps {
     item?: TemplateItem,
     level?: number
     path?: string
     selectedFiles?: TemplateFiles
     onFileSelect?: (file: TemplateFiles) => void
     onAddFile?: (file: TemplateFiles,parentPath: string) => void
     onAddFolder?: (file: TemplateFolder, parentPath: string) => void
     onDeleteFile?: (file: TemplateFiles, parentPath: string) => void
     onDeleteFolder?: (file: TemplateFolder, parentPath: string) => void
     onRenameFile?: (
        file: TemplateFiles,
        newFileName: string, 
        newExtension: string,
        parentPath: string
    ) => void
     onRenameFolder?: (
        file: TemplateFolder,
        newFolderName: string, 
        parentPath: string
    ) => void
}