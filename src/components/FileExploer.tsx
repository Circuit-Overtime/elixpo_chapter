

import React, { useCallback, useMemo, useState } from 'react'
import { ResizablePanel, ResizablePanelGroup,ResizableHandle } from './ui/resizable';
import CodeView from './code-view/CodeView';
import Hint from '@/modules/projects/ui/views/components/Hint';
import { Button } from './ui/button';
import { Copy } from 'lucide-react';
import { covertFilesToTress } from '@/lib/utils';
import TreeView from './TreeView';
type FileCollection = {[path:string]:string};

const getExtension = (filename:string) => {
     const ex = filename.split(".").pop()?.toLowerCase();
     return ex || 'txt'
}
interface Props {
     files: FileCollection
}
const FileExploer = (prosp: Props) => {
  const [selectFiles,setSelectFiles] = useState<string | null>(() => {
     const fileKeys = Object.keys(prosp.files);
     return fileKeys.length > 0 ? fileKeys[0] : null
  })

  const treeData = useMemo(() => {
     return covertFilesToTress(prosp.files)
  },[prosp.files]);

  const handleSelect = useCallback((filePath:string) => {
     if(prosp.files[filePath]) {
         setSelectFiles(filePath)
     }
  },[prosp.files])
  return (
   <ResizablePanelGroup direction='horizontal'>
    <ResizablePanel className='bg-sidebar' defaultSize={30} minSize={30}>
      <TreeView
       data={treeData}
       value={selectFiles}
       onSelect={handleSelect}
      />
    </ResizablePanel>
     <ResizableHandle withHandle className='hover:bg-primary transition-colors'/>
    <ResizablePanel defaultSize={70} minSize={50}>
      {
        selectFiles && prosp.files[selectFiles] ? (
            <div className='h-full w-full overflow-auto flex flex-col'>
        <div className='border-b bg-sidebar px-4 py-1 flex justify-between items-center gap-x-2'>
            <Hint message='Copy to clipboard'>
             <Button size='icon' variant='ghost' className='ml-auto'>
                <Copy className='size-4'  />
             </Button>
            </Hint>
        </div>
        <div className='flex-1 px-2 overflow-auto'>
           <CodeView language={getExtension(selectFiles)} code={prosp.files[selectFiles]} />
        </div>
      </div>
        ) : (
            <div>click on file to view its content</div>
        )
      }
    </ResizablePanel>
   </ResizablePanelGroup>
  )
}

export default FileExploer