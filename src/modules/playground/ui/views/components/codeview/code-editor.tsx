// components/code-editor.tsx
'use client'

import React from 'react'
import Editor from '@monaco-editor/react'

interface CodeEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
  options?: any
}

export const CodeEditor = ({
  language,
  value,
  onChange,
  options = {},
}: CodeEditorProps) => {
  return (
    <Editor
      height="100%"
      defaultLanguage={language}
      language={language}
      value={value}
      onChange={(value) => onChange(value || '')}
      options={{
        ...options,
        automaticLayout: true,
      }}
    />
  )
}