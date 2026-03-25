'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';

// Simple filter matching title/subtext/aliases against query
function filterItems(items, query) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const subtext = (item.subtext || '').toLowerCase();
    const aliases = (item.aliases || []).map((a) => a.toLowerCase());
    return title.includes(q) || subtext.includes(q) || aliases.some((a) => a.includes(q));
  });
}

function IconWrapper({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const FILE_ICON = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6';

function createWebBookmarkItem(editor) {
  return {
    title: 'Web Bookmark',
    subtext: 'Embed a link with preview',
    group: 'Advanced blocks',
    aliases: ['link', 'url', 'embed', 'bookmark'],
    icon: <IconWrapper d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
    onItemClick: () => {
      const url = prompt('Enter URL:');
      if (url) {
        editor.insertBlocks(
          [{ type: 'paragraph', content: [{ type: 'link', href: url, content: url }] }],
          editor.getTextCursorPosition().block,
          'after'
        );
      }
    },
  };
}

function createCodeBlockItem(editor) {
  return {
    title: 'Code',
    subtext: 'Insert a code block',
    group: 'Advanced blocks',
    aliases: ['code', 'codeblock', 'snippet'],
    icon: <IconWrapper d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
    onItemClick: () => {
      editor.insertBlocks(
        [{ type: 'codeBlock' }],
        editor.getTextCursorPosition().block,
        'after'
      );
    },
  };
}

function createFileItem(editor, title, subtext, accept, aliases) {
  return {
    title,
    subtext,
    group: 'Advanced blocks',
    aliases: aliases || [],
    icon: <IconWrapper d={FILE_ICON} />,
    onItemClick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // TODO: upload to R2 and embed
        editor.insertBlocks(
          [{ type: 'paragraph', content: [{ type: 'text', text: `📎 ${file.name}`, styles: {} }] }],
          editor.getTextCursorPosition().block,
          'after'
        );
      };
      input.click();
    },
  };
}

function getCustomSlashMenuItems(editor) {
  const defaults = getDefaultReactSlashMenuItems(editor).filter((item) => {
    const t = item.title.toLowerCase();
    return t !== 'video' && t !== 'audio';
  });

  const custom = [
    createWebBookmarkItem(editor),
    createCodeBlockItem(editor),
    createFileItem(editor, 'CSV', 'Upload a CSV file', '.csv', ['csv', 'spreadsheet', 'data']),
    createFileItem(editor, 'PDF', 'Upload a PDF document', '.pdf', ['pdf', 'document']),
    createFileItem(editor, 'Markdown', 'Upload a Markdown file', '.md,.mdx', ['markdown', 'md']),
    createFileItem(editor, 'HTML', 'Upload an HTML file', '.html,.htm', ['html', 'web']),
  ];

  return [...defaults, ...custom];
}

const BlogEditor = forwardRef(function BlogEditor({ onChange, initialContent }, ref) {
  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
    domAttributes: {
      editor: {
        class: 'blog-editor',
      },
    },
  });

  useImperativeHandle(ref, () => ({
    getDocument: () => editor.document,
    getEditor: () => editor,
    getHTML: async () => {
      const html = await editor.blocksToHTMLLossy(editor.document);
      return html;
    },
    getMarkdown: async () => {
      const md = await editor.blocksToMarkdownLossy(editor.document);
      return md;
    },
  }), [editor]);

  const handleChange = useCallback(() => {
    if (onChange) {
      onChange(editor.document);
    }
  }, [onChange, editor]);

  const getItems = useMemo(
    () => async (query) => filterItems(getCustomSlashMenuItems(editor), query),
    [editor]
  );

  return (
    <div className="blog-editor-wrapper">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="dark"
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getItems}
        />
      </BlockNoteView>
    </div>
  );
});

export default BlogEditor;
