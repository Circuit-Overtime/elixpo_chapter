'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

export default function BlogEditor({ onChange }) {
  const editor = useCreateBlockNote({
    domAttributes: {
      editor: {
        class: 'blog-editor',
      },
    },
  });

  const handleChange = () => {
    if (onChange) {
      onChange(editor.document);
    }
  };

  return (
    <div className="blog-editor-wrapper">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="dark"
        data-theming-css-variables-demo
      />
      <style jsx global>{`
        .blog-editor-wrapper .bn-editor {
          background: transparent;
          color: #fff;
          font-size: 1.125rem;
          line-height: 1.8;
        }
        .blog-editor-wrapper .bn-container {
          background: transparent;
          border: none;
        }
        .blog-editor-wrapper [class*="blockOuter"] {
          padding-left: 0;
        }
        .blog-editor-wrapper .bn-block-content {
          font-size: 1.125rem;
        }
        .blog-editor-wrapper .bn-inline-content[data-placeholder]::before {
          color: #333;
        }
        .blog-editor-wrapper [data-content-type="heading"][data-level="1"] .bn-inline-content {
          font-size: 2em;
        }
        .blog-editor-wrapper [data-content-type="heading"][data-level="2"] .bn-inline-content {
          font-size: 1.6em;
        }
        .blog-editor-wrapper [data-content-type="heading"][data-level="3"] .bn-inline-content {
          font-size: 1.3em;
        }
        .blog-editor-wrapper .bn-side-menu {
          background: #1D202A;
          border: 1px solid #333;
          border-radius: 8px;
        }
        .blog-editor-wrapper .bn-drag-handle {
          color: #555;
        }
        .blog-editor-wrapper .bn-drag-handle:hover {
          color: #7ba8f0;
        }
        .blog-editor-wrapper .mantine-Menu-dropdown {
          background: #10141E !important;
          border: 1px solid #1D202A !important;
          border-radius: 12px !important;
        }
        .blog-editor-wrapper .mantine-Menu-item {
          color: #fff !important;
        }
        .blog-editor-wrapper .mantine-Menu-item:hover {
          background: #1D202A !important;
        }
        .blog-editor-wrapper .bn-toolbar {
          background: #10141E;
          border: 1px solid #1D202A;
          border-radius: 10px;
        }
        .blog-editor-wrapper .bn-toolbar button {
          color: #888;
        }
        .blog-editor-wrapper .bn-toolbar button:hover {
          color: #7ba8f0;
          background: #1D202A;
        }
        .blog-editor-wrapper .bn-toolbar button[data-active="true"] {
          color: #7ba8f0;
        }
      `}</style>
    </div>
  );
}
