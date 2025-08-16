export interface TemplateFile {
     filename: string;
     fileExtension: string;
     content: string
}

export interface TemplateFolder {
     folderName: string;
     items: (TemplateFile | TemplateFolder)[]
}

export type TemplateItem = TemplateFile | TemplateFolder

export interface TemplateFileTreeProps {
     data?: TemplateItem
     onFileSelect?: (file: TemplateFile) => void
     selectedFile?: TemplateFile
     title? : string
     onAddFile?: (file: TemplateFile,parentPath: string) => void
     onAddFolder?: (file: TemplateFolder, parentPath: string) => void
     onDeleteFile?: (file: TemplateFile, parentPath: string) => void
     onDeleteFolder?: (file: TemplateFolder, parentPath: string) => void
     onRenameFile?: (file: TemplateFile, newFileName: string, newExtension: string,parentPath: string) => void
     onRenameFolder?: (file: TemplateFolder, newFolderName: string, parentPath: string) => void
}

export interface TemplateTreeNodeProps {
     item?: TemplateItem,
     level?: number
     path?: string
     selectedFiles?: TemplateFile
     onFileSelect?: (file: TemplateFile) => void
     onAddFile?: (file: TemplateFile,parentPath: string) => void
     onAddFolder?: (file: TemplateFolder, parentPath: string) => void
     onDeleteFile?: (file: TemplateFile, parentPath: string) => void
     onDeleteFolder?: (file: TemplateFolder, parentPath: string) => void
     onRenameFile?: (
        file: TemplateFile,
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