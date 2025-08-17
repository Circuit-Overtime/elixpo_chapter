'use client'
import React, { useRef, useEffect } from 'react'
import { PlaygroundCodeEditorProps } from '../../types/types'
import Editor, { type Monaco } from "@monaco-editor/react"
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '../../../../../../features/playground/lib/editor-configs'

const PlayGroundCodeEditor: React.FC<PlaygroundCodeEditorProps> = ({
    activeFile,
    content,
    onContentChange
}) => {
    const editorRef = useRef<any>(null) 
    const monacoRef = useRef<Monaco | null>(null)

    const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco
        configureMonaco(monaco)
        updateEditorLanguage()
    }

    const handleEditorChange = (value: string | undefined) => {
        // Ensure we only call onContentChange with defined strings
        if (value !== undefined) {
            onContentChange(value)
        }
    }

    const updateEditorLanguage = () => {
        if (!activeFile || !monacoRef.current || !editorRef.current) return 
        
        const model = editorRef.current.getModel()
        if (!model) return 
        
        const language = getEditorLanguage(activeFile.fileExtension)
        try {
            monacoRef.current.editor.setModelLanguage(model, language)
        } catch (error) {
            console.warn("Failed to set editor language:", error)
        }
    }

    // Update language when active file changes
    useEffect(() => {
        updateEditorLanguage()
    }, [activeFile?.fileExtension])

    return (
        <div className="h-full w-full">
            <Editor
                height="100%"
                width="100%"
                theme="vs-dark"
                path={activeFile?.filename || 'untitled'}
                language={getEditorLanguage(activeFile?.fileExtension || 'plaintext')}
                value={content}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                //@ts-ignore
                options={{
                    ...defaultEditorOptions,
                    automaticLayout: true,
                }}
            />
        </div>
    )
}

export default PlayGroundCodeEditor