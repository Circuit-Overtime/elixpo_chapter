'use client';

import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, createCodeBlockSpec } from '@blocknote/core';
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems, TableHandlesController } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import 'katex/dist/katex.min.css';
import { useCallback, useMemo, forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import AICommandMenu from './AICommandMenu';
import AISelectionToolbar from './AISelectionToolbar';
import MentionMenu from './MentionMenu';


// Custom blocks
import { TableOfContents } from './blocks/TableOfContents';
import { BlockEquation } from './blocks/BlockEquation';
import { ButtonBlock } from './blocks/ButtonBlock';
import { Breadcrumbs } from './blocks/Breadcrumbs';
import { TabsBlock } from './blocks/TabsBlock';
import { AIBlock } from './blocks/AIBlock';
import { BlogImageBlock } from './blocks/BlogImageBlock';
import { MermaidBlock } from './blocks/MermaidBlock';
import { PDFEmbedBlock } from './blocks/PDFEmbedBlock';
// Custom inline content
import { InlineEquation } from './blocks/InlineEquation';
import { DateInline } from './blocks/DateInline';
import { MentionInline } from './blocks/MentionInline';
import { BlogMentionInline } from './blocks/BlogMentionInline';
import { OrgMentionInline } from './blocks/OrgMentionInline';

// ── Schema ──

// Code block with Shiki syntax highlighting (lazy-loaded)
const codeBlockWithHighlighting = createCodeBlockSpec({
  createHighlighter: async () => {
    const { createHighlighter } = await import('shiki');
    return createHighlighter({
      themes: ['vitesse-dark'],
      langs: [
        'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
        'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
        'json', 'yaml', 'markdown', 'bash', 'shell', 'sql', 'graphql',
        'jsx', 'tsx', 'vue', 'svelte', 'dart', 'lua', 'r', 'scala',
      ],
    });
  },
});

// Block specs from createReactBlockSpec are factories — call them to get the spec
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: codeBlockWithHighlighting,
    image: BlogImageBlock({}),
    tableOfContents: TableOfContents({}),
    blockEquation: BlockEquation({}),
    buttonBlock: ButtonBlock({}),
    breadcrumbs: Breadcrumbs({}),
    tabsBlock: TabsBlock({}),
    aiBlock: AIBlock({}),
    mermaidBlock: MermaidBlock({}),
    pdfEmbed: PDFEmbedBlock({}),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    inlineEquation: InlineEquation,
    dateInline: DateInline,
    mention: MentionInline,
    blogMention: BlogMentionInline,
    orgMention: OrgMentionInline,
  },
});

// ── Helpers ──

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

function Icon({ d, d2, color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

// ── Slash menu items ──

function getCustomSlashMenuItems(editor) {
  const defaults = getDefaultReactSlashMenuItems(editor).filter((item) => {
    const t = item.title.toLowerCase();
    return t !== 'video' && t !== 'audio' && t !== 'file';
  });

  const customBlocks = [
    {
      title: 'Table of Contents',
      subtext: 'Auto-generated page outline',
      group: 'Custom Blocks',
      aliases: ['toc', 'outline', 'contents', 'navigation'],
      icon: <Icon d="M3 12h18M3 6h18M3 18h12" />,
      onItemClick: () => editor.insertBlocks([{ type: 'tableOfContents' }], editor.getTextCursorPosition().block, 'after'),
    },
    {
      title: 'Block Equation',
      subtext: 'Render LaTeX as a block',
      group: 'Custom Blocks',
      aliases: ['latex', 'math', 'equation', 'formula', 'katex'],
      icon: <Icon d="M4 4l4 16M12 4l4 16M7 8h10M6 16h10" />,
      onItemClick: () => editor.insertBlocks([{ type: 'blockEquation' }], editor.getTextCursorPosition().block, 'after'),
    },
    {
      title: 'Button',
      subtext: 'Interactive button with action',
      group: 'Custom Blocks',
      aliases: ['button', 'cta', 'action', 'link button'],
      icon: <Icon d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />,
      onItemClick: () => editor.insertBlocks([{ type: 'buttonBlock' }], editor.getTextCursorPosition().block, 'after'),
    },
    {
      title: 'Breadcrumbs',
      subtext: 'Navigation breadcrumb trail',
      group: 'Custom Blocks',
      aliases: ['breadcrumb', 'nav', 'path', 'navigation'],
      icon: <Icon d="M3 12h4l3-3 4 6 3-3h4" />,
      onItemClick: () => editor.insertBlocks([{ type: 'breadcrumbs' }], editor.getTextCursorPosition().block, 'after'),
    },
    {
      title: 'Tabs',
      subtext: 'Tabbed content sections',
      group: 'Custom Blocks',
      aliases: ['tabs', 'tabbed', 'sections', 'panels'],
      icon: <Icon d="M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />,
      onItemClick: () => editor.insertBlocks([{ type: 'tabsBlock' }], editor.getTextCursorPosition().block, 'after'),
    },
    {
      title: 'Diagram',
      subtext: 'Mermaid flowchart, sequence, or class diagram',
      group: 'Custom Blocks',
      aliases: ['mermaid', 'diagram', 'flowchart', 'sequence', 'chart', 'graph'],
      icon: <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM8.5 14h7v7h-7z" d2="M6.5 10v4M17.5 10v4" />,
      onItemClick: () => editor.insertBlocks([{ type: 'mermaidBlock' }], editor.getTextCursorPosition().block, 'after'),
    },
    {
      title: 'PDF Embed',
      subtext: 'Embed a PDF document from URL',
      group: 'Custom Blocks',
      aliases: ['pdf', 'document', 'embed pdf', 'file'],
      icon: <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" d2="M14 2v6h6" />,
      onItemClick: () => editor.insertBlocks([{ type: 'pdfEmbed' }], editor.getTextCursorPosition().block, 'after'),
    },
    {
      title: 'AI Block',
      subtext: 'Generate content with AI',
      group: 'AI',
      aliases: ['ai', 'generate', 'gpt', 'assistant', 'write for me'],
      icon: <Icon d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" color="#9b7bf7" />,
      onItemClick: () => editor.insertBlocks([{ type: 'aiBlock' }], editor.getTextCursorPosition().block, 'after'),
    },
  ];

  const inlineItems = [
    {
      title: 'Inline Equation',
      subtext: 'Inline LaTeX math',
      group: 'Inline',
      aliases: ['inline math', 'inline latex', 'math inline'],
      icon: <Icon d="M4 4l4 16M12 4l4 16M7 8h10M6 16h10" />,
      onItemClick: () => {
        const latex = prompt('Enter LaTeX:');
        if (latex) editor.insertInlineContent([{ type: 'inlineEquation', props: { latex } }]);
      },
    },
    {
      title: 'Date',
      subtext: 'Insert current date',
      group: 'Inline',
      aliases: ['date', 'today', 'timestamp'],
      icon: <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
      onItemClick: () => {
        editor.insertInlineContent([{ type: 'dateInline', props: { date: new Date().toISOString().split('T')[0] } }]);
      },
    },
    {
      title: 'Mention User',
      subtext: 'Mention a LixBlogs user',
      group: 'Inline',
      aliases: ['mention', 'user', 'tag user', '@'],
      icon: <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" />,
      onItemClick: () => {
        const username = prompt('Enter username:');
        if (username) editor.insertInlineContent([{ type: 'mention', props: { username: username.replace('@', '') } }]);
      },
    },
    {
      title: 'Mention Blog',
      subtext: 'Link to another published blog',
      group: 'Inline',
      aliases: ['blog mention', 'link blog', 'reference', 'cite'],
      icon: <Icon d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" d2="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
      onItemClick: () => {
        const title = prompt('Blog title:');
        const slugid = prompt('Blog slug ID:');
        if (title && slugid) editor.insertInlineContent([{ type: 'blogMention', props: { title, slugid } }]);
      },
    },
    {
      title: 'Text Color',
      subtext: 'Change text color',
      group: 'Styling',
      aliases: ['color', 'text color', 'font color'],
      icon: <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" color="#f87171" />,
      onItemClick: () => {
        const color = prompt('Color (e.g. red, #ff0000):');
        if (color) editor.addStyles({ textColor: color });
      },
    },
    {
      title: 'Background Color',
      subtext: 'Change text background color',
      group: 'Styling',
      aliases: ['highlight', 'bg color', 'background'],
      icon: <Icon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" color="#fbbf24" />,
      onItemClick: () => {
        const color = prompt('Background color (e.g. yellow, #ffff00):');
        if (color) editor.addStyles({ backgroundColor: color });
      },
    },
  ];

  return [...defaults, ...customBlocks, ...inlineItems];
}

// ── Check if block is empty ──

function isCurrentBlockEmpty(editor) {
  try {
    const cursor = editor.getTextCursorPosition();
    if (!cursor?.block) return false;
    const block = cursor.block;
    if (block.type !== 'paragraph') return false;
    if (!block.content || block.content.length === 0) return true;
    if (block.content.length === 1 && block.content[0].type === 'text' && block.content[0].text === '') return true;
    return false;
  } catch {
    return false;
  }
}

// ── BlogEditor ──

// Sanitize saved content — convert raw LaTeX/code paragraphs back into proper block types
// Block types known to the schema — used to filter out stale/removed block types
const KNOWN_BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'image',
  'table', 'codeBlock', 'checkListItem', 'file', 'video', 'audio', 'divider',
  'tableOfContents', 'blockEquation', 'buttonBlock', 'breadcrumbs',
  'tabsBlock', 'aiBlock', 'mermaidBlock', 'pdfEmbed',
]);

function sanitizeInitialContent(blocks) {
  // Parse JSON string if needed
  if (typeof blocks === 'string') {
    try { blocks = JSON.parse(blocks); } catch { return undefined; }
  }
  if (!blocks || !Array.isArray(blocks)) return blocks;

  // Filter out unknown block types (e.g. removed custom blocks)
  const filtered = blocks.filter((b) => !b.type || KNOWN_BLOCK_TYPES.has(b.type));

  const sanitized = doSanitize(filtered);
  return sanitized;
}

function doSanitize(blocks) {
  if (!blocks || !Array.isArray(blocks)) return blocks;
  const result = [];
  let i = 0;

  const getText = (b) => (b.content || []).map(c => {
    if (c.type === 'inlineEquation') return c.props?.latex || '';
    return c.text || '';
  }).join('').trim();

  while (i < blocks.length) {
    let block = blocks[i];
    // Recursively sanitize children
    if (block.children && block.children.length > 0) {
      block = { ...block, children: doSanitize(block.children) };
    }
    // Code block containing LaTeX \[...\] expressions → extract as blockEquations
    if (block.type === 'codeBlock') {
      const codeText = getText(block);
      const latexPattern = /\\\[[\s\S]*?\\\]/g;
      const latexMatches = codeText.match(latexPattern);
      if (latexMatches && latexMatches.length > 0) {
        // Split code block into text segments and LaTeX blocks
        const parts = codeText.split(latexPattern);
        let mIdx = 0;
        for (let p = 0; p < parts.length; p++) {
          const segment = parts[p].trim();
          // Non-LaTeX text segments become paragraphs (e.g. comments like "% Time-Dependent...")
          if (segment) {
            const lines = segment.split('\n').filter(l => l.trim());
            for (const line of lines) {
              const trimLine = line.trim();
              // Skip comment-only lines (% ...)
              if (trimLine.startsWith('%')) {
                result.push({ type: 'paragraph', content: [{ type: 'text', text: trimLine, styles: { italic: true } }], children: [] });
              } else {
                result.push({ type: 'paragraph', content: [{ type: 'text', text: trimLine }], children: [] });
              }
            }
          }
          if (mIdx < latexMatches.length) {
            const latex = latexMatches[mIdx].replace(/^\\\[/, '').replace(/\\\]$/, '').trim();
            if (latex) {
              result.push({ type: 'blockEquation', props: { latex }, children: [] });
            }
            mIdx++;
          }
        }
        i++; continue;
      }
    }

    if (block.type !== 'paragraph') { result.push(block); i++; continue; }

    const text = getText(block);

    // Paragraph containing only a single inlineEquation → convert to blockEquation
    const contentItems = (block.content || []).filter(c => !(c.type === 'text' && !c.text?.trim()));
    if (contentItems.length === 1 && contentItems[0].type === 'inlineEquation' && contentItems[0].props?.latex) {
      result.push({ id: block.id, type: 'blockEquation', props: { latex: contentItems[0].props.latex }, children: [] });
      i++; continue;
    }


    // Single-line \[...\] — may have \] at end of content
    const singleBracket = text.match(/^\\\[(.+?)\\\]$/s);
    if (singleBracket) {
      result.push({ id: block.id, type: 'blockEquation', props: { latex: singleBracket[1].trim() } });
      i++; continue;
    }

    // Single-line $$...$$
    const singleDollar = text.match(/^\$\$(.+?)\$\$$/s);
    if (singleDollar) {
      result.push({ id: block.id, type: 'blockEquation', props: { latex: singleDollar[1].trim() } });
      i++; continue;
    }

    // Multi-line \[ opener — collect until a block containing \]
    if (text === '\\[' || text.startsWith('\\[')) {
      const firstContent = text === '\\[' ? '' : text.slice(2);
      // Check if \] is already in this block
      const closeInFirst = firstContent.indexOf('\\]');
      if (closeInFirst !== -1) {
        const latex = firstContent.slice(0, closeInFirst).trim();
        if (latex) result.push({ id: block.id, type: 'blockEquation', props: { latex }, children: [] });
        i++; continue;
      }
      const latexParts = firstContent ? [firstContent] : [];
      i++;
      while (i < blocks.length) {
        const nextText = getText(blocks[i]);
        // Check if this block contains the closing \]
        const closeIdx = nextText.indexOf('\\]');
        if (closeIdx !== -1) {
          const before = nextText.slice(0, closeIdx).trim();
          if (before) latexParts.push(before);
          i++; break;
        }
        if (nextText === '\\]') { i++; break; }
        latexParts.push(nextText);
        i++;
      }
      const latex = latexParts.join('\n').trim();
      if (latex) result.push({ id: block.id, type: 'blockEquation', props: { latex }, children: [] });
      continue;
    }

    // Multi-line $$ opener
    if (text === '$$' || (text.startsWith('$$') && !text.endsWith('$$'))) {
      const firstContent = text === '$$' ? '' : text.slice(2);
      const latexParts = firstContent ? [firstContent] : [];
      i++;
      while (i < blocks.length) {
        const nextText = getText(blocks[i]);
        const closeIdx = nextText.indexOf('$$');
        if (closeIdx !== -1) {
          const before = nextText.slice(0, closeIdx).trim();
          if (before) latexParts.push(before);
          i++; break;
        }
        if (nextText === '$$') { i++; break; }
        latexParts.push(nextText);
        i++;
      }
      const latex = latexParts.join('\n').trim();
      if (latex) result.push({ id: block.id, type: 'blockEquation', props: { latex }, children: [] });
      continue;
    }

    // Horizontal rule: ---, ***, ___, ———, ––– etc → divider
    if (/^([-*_])\1{2,}$/.test(text) || /^[—–]{2,}$/.test(text)) {
      result.push({ id: block.id, type: 'divider', children: [] });
      i++; continue;
    }

    // Code fence opener: ```lang — collect until closing ```
    const fenceMatch = text.match(/^```(\w*)$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || '';
      const codeLines = [];
      i++;
      while (i < blocks.length) {
        const nextText = getText(blocks[i]);
        if (nextText === '```') { i++; break; }
        codeLines.push(nextText);
        i++;
      }
      if (lang === 'mermaid') {
        result.push({
          id: block.id,
          type: 'mermaidBlock',
          props: { diagram: codeLines.join('\n') },
        });
      } else {
        result.push({
          id: block.id,
          type: 'codeBlock',
          props: { language: lang },
          content: [{ type: 'text', text: codeLines.join('\n') }],
        });
      }
      continue;
    }

    result.push(block);
    i++;
  }
  return result;
}

const BlogEditor = forwardRef(function BlogEditor({ onChange, initialContent, onReady, onTitleChange, blogId, collaboration, onCollabSeeded }, ref) {
  const { isDark } = useTheme();
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const mentionStartRef = useRef(null);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0, anchorBlockId: null });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingBlockId, setAiGeneratingBlockId] = useState(null);
  const [aiPhase, setAiPhase] = useState('idle'); // idle | thinking | writing | generating_image | uploading
  const [aiStatusInline, setAiStatusInline] = useState(false); // true = inline status bar, false = bottom bar
  const [aiInlinePos, setAiInlinePos] = useState({ top: 0 }); // position for inline status bar
  const [aiStatusText, setAiStatusText] = useState('is thinking'); // cycling status text
  const aiStatusTimerRef = useRef(null);
  const [aiErrorToast, setAiErrorToast] = useState(null);
  const [aiBlockIds, setAiBlockIds] = useState(new Set());
  const [showAIActions, setShowAIActions] = useState(false);
  const [aiActionsPos, setAiActionsPos] = useState({ top: 0, left: 0 });
  const aiAbortRef = useRef(null);
  const aiBlockIdsRef = useRef(new Set());
  const aiBlockCountRef = useRef(0);
  const aiAnchorIdRef = useRef(null);
  const wrapperRef = useRef(null);

  const sanitizedContent = useMemo(() => sanitizeInitialContent(initialContent), [initialContent]);

  const editor = useCreateBlockNote({
    schema,
    // When in collab mode, Yjs doc is the source of truth — no initialContent
    ...(collaboration ? { collaboration } : { initialContent: sanitizedContent || undefined }),
    domAttributes: {
      editor: { class: 'blog-editor' },
    },
    placeholders: {
      default: "Press 'Space' for AI, type '/' for commands",
    },
  });

  // Seed Yjs doc from existing content when collab starts on a blog that already has content
  useEffect(() => {
    if (!collaboration || !onCollabSeeded || !initialContent) return;
    // Check if the Yjs fragment is empty (first collab session for this blog)
    const fragment = collaboration.fragment;
    if (fragment && fragment.length === 0 && Array.isArray(initialContent) && initialContent.length > 0) {
      const sanitized = sanitizeInitialContent(initialContent);
      if (sanitized && sanitized.length > 0) {
        try {
          editor.replaceBlocks(editor.document, sanitized);
        } catch (e) {
          console.error('Failed to seed collab doc:', e);
        }
      }
      onCollabSeeded();
    }
  }, [collaboration, onCollabSeeded]);

  // Build HTML that includes custom blocks (equations, mermaid)
  const getCustomHTML = useCallback(async () => {
    const baseHTML = await editor.blocksToHTMLLossy(editor.document);
    const doc = editor.document;
    // Collect custom block HTML to append/inject
    const customParts = [];
    for (const block of doc) {
      if (block.type === 'blockEquation' && block.props?.latex) {
        customParts.push(`<div class="preview-block-equation" data-latex="${encodeURIComponent(block.props.latex)}"></div>`);
      } else if (block.type === 'mermaidBlock' && block.props?.diagram) {
        customParts.push(`<div class="preview-mermaid-block" data-diagram="${encodeURIComponent(block.props.diagram)}"></div>`);
      }
    }
    // Append custom blocks at the positions where empty divs were generated
    return baseHTML + (customParts.length ? '\n' + customParts.join('\n') : '');
  }, [editor]);

  useImperativeHandle(ref, () => ({
    getDocument: () => editor.document,
    getEditor: () => editor,
    getBlocks: () => editor.document,
    getHTML: async () => await getCustomHTML(),
    getMarkdown: async () => await editor.blocksToMarkdownLossy(editor.document),
  }), [editor, getCustomHTML]);

  // Prevent backspace from triggering browser back navigation when editor is empty
  useEffect(() => {
    const editorEl = wrapperRef.current?.querySelector('.bn-editor');
    if (!editorEl) return;

    function handleBackspace(e) {
      if (e.key === 'Backspace') {
        // Always prevent browser back when focused inside the editor
        const isEditorFocused = editorEl.contains(document.activeElement) || editorEl === document.activeElement;
        if (isEditorFocused) {
          // Convert empty heading to paragraph on backspace
          const cursor = editor.getTextCursorPosition();
          if (cursor?.block?.type === 'heading' && (!cursor.block.content || cursor.block.content.length === 0 || (cursor.block.content.length === 1 && cursor.block.content[0].text === ''))) {
            e.preventDefault();
            e.stopPropagation();
            editor.updateBlock(cursor.block.id, { type: 'paragraph', props: {} });
            return;
          }
          // Let BlockNote handle it, but stop the event from reaching the browser
          e.stopPropagation();
        }
      }
    }

    // Use capture phase to catch it before the browser navigation handler
    editorEl.addEventListener('keydown', handleBackspace, { capture: true });
    return () => editorEl.removeEventListener('keydown', handleBackspace, { capture: true });
  }, [editor]);

  // Inject delete button on table blocks
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !editor) return;

    function injectTableDeleteButtons() {
      const tables = wrapper.querySelectorAll('[data-content-type="table"]');
      tables.forEach(tableEl => {
        if (tableEl.querySelector('.table-delete-btn')) return;
        const blockEl = tableEl.closest('[data-id]');
        if (!blockEl) return;
        const blockId = blockEl.getAttribute('data-id');

        const btn = document.createElement('button');
        btn.className = 'table-delete-btn';
        btn.title = 'Delete table';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
        btn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          try { editor.removeBlocks([blockId]); } catch {}
        };
        // Position relative to the table container
        const container = blockEl.querySelector('.bn-block-content') || tableEl;
        container.style.position = 'relative';
        container.appendChild(btn);
      });
    }

    injectTableDeleteButtons();
    const observer = new MutationObserver(injectTableDeleteButtons);
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [editor]);

  // Handle clipboard paste of images — compress, upload, insert native image block
  useEffect(() => {
    const editorEl = wrapperRef.current?.querySelector('.bn-editor');
    if (!editorEl) return;

    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();

          const file = item.getAsFile();
          if (!file) return;

          const cursor = editor.getTextCursorPosition();
          if (!cursor?.block) return;

          // Insert image block + empty paragraph below so user can keep typing
          editor.insertBlocks(
            [
              { type: 'image', props: { url: '', caption: '', previewWidth: 740 } },
              { type: 'paragraph', content: [] },
            ],
            cursor.block,
            'after'
          );

          const doc = editor.document;
          const cursorIdx = doc.findIndex((b) => b.id === cursor.block.id);
          const newBlock = doc[cursorIdx + 1];
          if (!newBlock) return;

          // Compress and upload, then update with real URL
          (async () => {
            try {
              const { compressBlogImage } = await import('../../utils/compressImage');
              const { blob } = await compressBlogImage(file);

              const formData = new FormData();
              formData.append('file', blob, `image_${Date.now()}.webp`);
              if (blogId) formData.append('blogId', blogId);
              formData.append('type', 'image');

              const res = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
              });

              if (!res.ok) throw new Error('Upload failed');
              const data = await res.json();

              editor.updateBlock(newBlock.id, {
                type: 'image',
                props: { url: data.url, caption: '', previewWidth: 740 },
              });
            } catch (err) {
              console.error('Clipboard image upload failed:', err);
              try { editor.removeBlocks([newBlock.id]); } catch {}
            }
          })();

          return;
        }
      }
    }

    editorEl.addEventListener('paste', handlePaste);
    return () => editorEl.removeEventListener('paste', handlePaste);
  }, [editor, blogId]);

  // Disable spellcheck on code blocks + inject copy buttons + language labels
  const patchCodeBlocks = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.querySelectorAll('[data-content-type="codeBlock"]').forEach((block) => {
      const editable = block.querySelector('[contenteditable]');
      if (editable) editable.spellcheck = false;
      block.style.position = 'relative';

      // Language label — language attr is on the inner pre/code element
      if (!block.querySelector('.code-lang-label')) {
        const langEl = block.querySelector('[data-language]');
        const lang = langEl?.getAttribute('data-language') || '';
        if (lang && lang !== 'text') {
          const label = document.createElement('span');
          label.className = 'code-lang-label';
          label.textContent = lang;
          block.appendChild(label);
        }
      }

      // Copy button
      if (!block.querySelector('.code-copy-btn')) {
        const copyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.title = 'Copy code';
        btn.innerHTML = copyIcon;
        btn.onclick = () => {
          const code = block.querySelector('[contenteditable]')?.textContent || '';
          navigator.clipboard.writeText(code);
          btn.innerHTML = checkIcon;
          btn.style.color = '#86efac';
          setTimeout(() => { btn.innerHTML = copyIcon; btn.style.color = ''; }, 1500);
        };
        block.appendChild(btn);
      }
    });
  }, []);

  const handleChange = useCallback(() => {
    if (onChange) onChange(editor.document);
    requestAnimationFrame(patchCodeBlocks);
  }, [onChange, editor, patchCodeBlocks]);

  // Patch code blocks on initial mount + signal ready (double rAF for sanitized blocks)
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        patchCodeBlocks();
        onReady?.();
      });
    });
  }, [patchCodeBlocks, onReady]);


  // AI sparkle star — inline element appended to last AI text block
  const sparkleRef = useRef(null);

  const moveSparkleToLastAiBlock = useCallback(() => {
    // Remove any existing sparkle from DOM
    const existing = wrapperRef.current?.querySelector('.ai-glob-cursor');
    if (existing) existing.remove();

    const ids = aiBlockIdsRef.current;
    if (!ids || ids.size === 0) return;

    // Find the last text block (skip image blocks)
    let lastTextId = null;
    for (const id of [...ids].reverse()) {
      const el = wrapperRef.current?.querySelector(`[data-id="${id}"]`);
      if (el && !el.querySelector('.blog-img-empty, .blog-img-loaded, .blog-img-generating')) {
        lastTextId = id;
        break;
      }
    }
    if (!lastTextId) return;

    const blockEl = wrapperRef.current?.querySelector(`[data-id="${lastTextId}"]`);
    if (!blockEl) return;

    const inlineEl = blockEl.querySelector('.bn-inline-content') || blockEl.querySelector('p') || blockEl;

    // Create and append sparkle inline at the end of the text
    const star = document.createElement('span');
    star.className = 'ai-glob-cursor';
    inlineEl.appendChild(star);
    sparkleRef.current = star;
  }, []);

  const hideSparkle = useCallback(() => {
    const existing = wrapperRef.current?.querySelector('.ai-glob-cursor');
    if (existing) existing.remove();
    sparkleRef.current = null;
  }, []);

  const getItems = useMemo(
    () => async (query) => filterItems(getCustomSlashMenuItems(editor), query),
    [editor]
  );

  // Space trigger for AI menu on empty blocks
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isCurrentBlockEmpty(editor)) {
          e.preventDefault();

          const wrapperRect = wrapperRef.current?.getBoundingClientRect();
          if (!wrapperRect) return;

          const cursor = editor.getTextCursorPosition();
          if (!cursor?.block?.id) return;

          const anchorBlockId = cursor.block.id;
          const blockEl = wrapperRef.current?.querySelector(`[data-id="${anchorBlockId}"]`);
          if (!blockEl) return;

          // Insert a new empty paragraph below so the placeholder text moves there
          editor.insertBlocks([{ type: 'paragraph', content: [] }], anchorBlockId, 'after');

          // Position the AI input at the block BEFORE hiding it
          const blockRect = blockEl.getBoundingClientRect();
          const top = blockRect.top - wrapperRect.top;

          setAiMenuPos({ top, left: 0, anchorBlockId });
          setShowAIMenu(true);

          // Hide the empty line after capturing position — use rAF so React renders the menu first
          requestAnimationFrame(() => {
            blockEl.style.visibility = 'hidden';
            blockEl.style.height = '0';
            blockEl.style.overflow = 'hidden';
            blockEl.style.margin = '0';
            blockEl.style.padding = '0';
            // Hide placeholder on the newly inserted paragraph below
            const doc = editor.document;
            const idx = doc.findIndex((b) => b.id === anchorBlockId);
            if (idx !== -1 && idx + 1 < doc.length) {
              const nextId = doc[idx + 1].id;
              const nextEl = wrapperRef.current?.querySelector(`[data-id="${nextId}"]`);
              if (nextEl) nextEl.classList.add('ai-hide-placeholder');
            }
          });
        }
      }
    }

    const editorEl = wrapperRef.current?.querySelector('.bn-editor');
    if (editorEl) {
      editorEl.addEventListener('keydown', handleKeyDown);
      return () => editorEl.removeEventListener('keydown', handleKeyDown);
    }
  }, [editor]);

  // @ mention trigger
  useEffect(() => {
    const editorEl = wrapperRef.current?.querySelector('.bn-editor');
    if (!editorEl) return;

    function checkMention() {
      try {
        const cursor = editor.getTextCursorPosition();
        if (!cursor?.block) { setShowMentionMenu(false); return; }
        const block = cursor.block;
        if (!block.content || !Array.isArray(block.content)) { setShowMentionMenu(false); return; }

        const fullText = block.content.map((c) => c.text || '').join('');
        const lastAt = fullText.lastIndexOf('@');

        if (lastAt === -1) { setShowMentionMenu(false); return; }

        const afterAt = fullText.slice(lastAt + 1);
        if (afterAt.includes(' ') || afterAt.length > 30) { setShowMentionMenu(false); return; }

        const domSel = window.getSelection();
        if (domSel && domSel.rangeCount > 0) {
          const range = domSel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const wrapperRect = wrapperRef.current?.getBoundingClientRect();
          if (wrapperRect && rect.height > 0) {
            setMentionPos({
              top: rect.bottom - wrapperRect.top + 6,
              left: rect.left - wrapperRect.left,
            });
          }
        }

        setMentionQuery(afterAt);
        setShowMentionMenu(true);
        mentionStartRef.current = lastAt;
      } catch { setShowMentionMenu(false); }
    }

    editorEl.addEventListener('input', checkMention);
    editorEl.addEventListener('keyup', checkMention);
    return () => {
      editorEl.removeEventListener('input', checkMention);
      editorEl.removeEventListener('keyup', checkMention);
    };
  }, [editor]);

  // Close mention menu and remove the @query text when a mention is inserted
  const handleMentionClose = useCallback(() => {
    setShowMentionMenu(false);
    setMentionQuery('');
    mentionStartRef.current = null;
  }, []);

  const handleAIStop = useCallback(() => {
    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
      aiAbortRef.current = null;
    }
    if (aiStatusTimerRef.current) {
      clearInterval(aiStatusTimerRef.current);
      aiStatusTimerRef.current = null;
    }
    setAiStatusInline(false);
    setAiGenerating(false);
    setAiPhase('idle');
    setAiGeneratingBlockId(null);
    hideSparkle();
    wrapperRef.current?.classList.remove('ai-editor-locked');
    wrapperRef.current?.querySelectorAll('.ai-skeleton-nearby, .ai-placeholder-skeleton, .ai-edit-selected-block, .ai-hide-placeholder, .ai-writing-active').forEach((el) => {
      el.classList.remove('ai-skeleton-nearby', 'ai-placeholder-skeleton', 'ai-edit-selected-block', 'ai-hide-placeholder', 'ai-writing-active');
    });

    // Ensure AI blocks have color props and show keep/discard
    const ids = aiBlockIdsRef.current;
    const _noColorTypes = new Set(['image', 'divider', 'mermaidBlock', 'blockEquation']);
    if (ids && ids.size > 0) {
      for (const id of ids) {
        try {
          const block = editor.document.find((b) => b.id === id);
          if (block && !_noColorTypes.has(block.type)) {
            editor.updateBlock(id, { props: { textColor: 'purple', backgroundColor: 'purple' } });
          }
        } catch {}
      }
      setShowAIActions(true);
      // Apply highlight via DOM directly (can't use highlightAiBlocks — defined later)
      const cls = 'ai-generated-highlight';
      for (const id of ids) {
        const el = wrapperRef.current?.querySelector(`[data-id="${id}"]`);
        if (el) {
          el.classList.remove('ai-writing-active');
          el.classList.add(cls);
        }
      }
      requestAnimationFrame(() => {
        const firstId = [...ids][0];
        const el = wrapperRef.current?.querySelector(`[data-id="${firstId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [editor, hideSparkle]);

  // Re-apply ai-generated-highlight after BlockNote re-renders (which destroys DOM classes)
  useEffect(() => {
    if (aiBlockIds.size === 0) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let applyPending = false;
    const applyHighlights = () => {
      if (applyPending) return;
      applyPending = true;
      requestAnimationFrame(() => {
        applyPending = false;
        // During generation use blue (ai-writing-active), after done use green (ai-generated-highlight)
        const cls = aiGenerating ? 'ai-writing-active' : 'ai-generated-highlight';
        for (const id of aiBlockIds) {
          const el = wrapper.querySelector(`[data-id="${id}"]`);
          if (el && !el.classList.contains(cls)) {
            el.classList.remove('ai-writing-active', 'ai-generated-highlight');
            el.classList.add(cls);
          }
        }
      });
    };

    applyHighlights();
    const observer = new MutationObserver(applyHighlights);
    observer.observe(wrapper, { childList: true, subtree: true, attributes: false });
    return () => observer.disconnect();
  }, [aiBlockIds]);

  // Highlight AI blocks in the DOM with lavender class + position sparkle
  const highlightAiBlocks = useCallback((ids, showCursor = true, writing = false) => {
    // Remove old highlights
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight, .ai-writing-active').forEach((el) => {
      el.classList.remove('ai-generated-highlight', 'ai-writing-active');
    });
    // Add highlight: blue while writing, green when done
    const cls = writing ? 'ai-writing-active' : 'ai-generated-highlight';
    for (const id of ids) {
      const el = wrapperRef.current?.querySelector(`[data-id="${id}"]`);
      if (el) el.classList.add(cls);
    }
    if (showCursor) {
      moveSparkleToLastAiBlock();
    } else {
      hideSparkle();
    }
  }, [moveSparkleToLastAiBlock, hideSparkle]);

  // Get current AI block IDs by position relative to anchor
  const getAiBlockIds = useCallback(() => {
    const anchorId = aiAnchorIdRef.current;
    const count = aiBlockCountRef.current;
    if (!anchorId || count === 0) return [];
    const doc = editor.document;
    const idx = doc.findIndex((b) => b.id === anchorId);
    if (idx === -1) return [];
    return doc.slice(idx + 1, idx + 1 + count).map((b) => b.id);
  }, [editor]);

  const handleAIKeep = useCallback(() => {
    hideSparkle();
    wrapperRef.current?.classList.remove('ai-editor-locked');
    // Reset textColor and backgroundColor to default on all AI blocks
    const _noReset = new Set(['image', 'divider', 'mermaidBlock', 'blockEquation']);
    for (const id of aiBlockIdsRef.current) {
      try {
        const block = editor.document.find((b) => b.id === id);
        if (block && !_noReset.has(block.type)) {
          editor.updateBlock(id, { props: { textColor: 'default', backgroundColor: 'default' } });
        }
      } catch {}
    }
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight, .ai-writing-active').forEach((el) => {
      el.classList.remove('ai-generated-highlight', 'ai-writing-active');
    });
    setAiBlockIds(new Set());
    aiBlockIdsRef.current = new Set();
    aiBlockCountRef.current = 0;
    aiAnchorIdRef.current = null;
    setShowAIActions(false);
  }, [editor, hideSparkle]);

  const handleAIDiscard = useCallback(() => {
    hideSparkle();
    wrapperRef.current?.classList.remove('ai-editor-locked');
    const storedIds = [...aiBlockIdsRef.current];
    if (storedIds.length > 0) {
      try { editor.removeBlocks(storedIds); } catch {
        try { const fb = getAiBlockIds(); if (fb.length > 0) editor.removeBlocks(fb); } catch {}
      }
    }
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight, .ai-writing-active').forEach((el) => {
      el.classList.remove('ai-generated-highlight', 'ai-writing-active');
    });
    setAiBlockIds(new Set());
    aiBlockIdsRef.current = new Set();
    aiBlockCountRef.current = 0;
    aiAnchorIdRef.current = null;
    setShowAIActions(false);
  }, [editor, getAiBlockIds, hideSparkle]);

  // Click on AI content to show keep/discard
  useEffect(() => {
    if (aiBlockIds.size === 0) return;

    function handleClick(e) {
      const blockEl = e.target.closest?.('.ai-generated-highlight');
      if (blockEl) {
        const rect = blockEl.getBoundingClientRect();
        const wrapperRect = wrapperRef.current?.getBoundingClientRect();
        if (wrapperRect) {
          setAiActionsPos({
            top: rect.top - wrapperRect.top - 36,
            left: rect.left - wrapperRect.left + rect.width / 2,
          });
        }
        setShowAIActions(true);
      }
      // Don't close on click elsewhere — user must explicitly Keep or Undo
    }

    const wrapper = wrapperRef.current;
    wrapper?.addEventListener('click', handleClick);
    return () => wrapper?.removeEventListener('click', handleClick);
  }, [aiBlockIds]);

  // Helper: extract full blog text from editor document
  const getFullBlogContext = useCallback(() => {
    try {
      const doc = editor.document;
      return doc.map((b) => {
        const text = (b.content || []).map((c) => c.text || '').join('');
        if (b.type === 'heading') return `${'#'.repeat(b.props?.level || 1)} ${text}`;
        if (b.type === 'bulletListItem') return `- ${text}`;
        if (b.type === 'numberedListItem') return `1. ${text}`;
        if (b.type === 'codeBlock') return `\`\`\`\n${text}\n\`\`\``;
        return text;
      }).filter(Boolean).join('\n');
    } catch { return ''; }
  }, [editor]);

  // Replace an image placeholder with the real Cloudinary URL
  const replaceImagePlaceholder = useCallback((imageId, url, alt) => {
    try {
      const doc = editor.document;
      for (const block of doc) {
        if (block.type === 'image' && block.props?._imageId === imageId) {
          editor.updateBlock(block.id, {
            type: 'image',
            props: { url, caption: alt || block.props.caption || '', previewWidth: 740, _imageId: imageId },
          });
          // Remove skeleton class and add fade-in animation
          requestAnimationFrame(() => {
            const el = wrapperRef.current?.querySelector(`[data-id="${block.id}"]`);
            if (el) {
              el.classList.remove('ai-image-skeleton');
              el.classList.add('ai-image-loaded');
            }
          });
          break;
        }
      }
      // Also look for the IMG_LOADING: text in paragraph blocks (fallback)
      for (const block of doc) {
        if (block.type === 'paragraph') {
          const text = (block.content || []).map(c => c.text || '').join('');
          if (text.includes(`IMG_LOADING:${imageId}`)) {
            editor.updateBlock(block.id, {
              type: 'image',
              props: { url, caption: alt || '', previewWidth: 740 },
            });
            requestAnimationFrame(() => {
              const el = wrapperRef.current?.querySelector(`[data-id="${block.id}"]`);
              if (el) {
                el.classList.remove('ai-image-skeleton');
                el.classList.add('ai-image-loaded');
              }
            });
            break;
          }
        }
      }
    } catch (e) { console.error('Failed to replace image placeholder:', e); }
  }, [editor]);

  const handleAISubmit = useCallback(async (userPrompt) => {
    const menuPos = aiMenuPos; // capture before closing
    setShowAIMenu(false);

    // Restore the host block visibility and clean up placeholder hiding
    if (menuPos.anchorBlockId) {
      const hostEl = wrapperRef.current?.querySelector(`[data-id="${menuPos.anchorBlockId}"]`);
      if (hostEl) {
        hostEl.style.visibility = '';
        hostEl.style.height = '';
        hostEl.style.overflow = '';
        hostEl.style.margin = '';
        hostEl.style.padding = '';
      }
      try {
        const doc = editor.document;
        const idx = doc.findIndex((b) => b.id === menuPos.anchorBlockId);
        if (idx !== -1 && idx + 1 < doc.length) {
          const nextEl = wrapperRef.current?.querySelector(`[data-id="${doc[idx + 1].id}"]`);
          if (nextEl) nextEl.classList.remove('ai-hide-placeholder');
        }
      } catch {}
    }

    // Auto-keep previous AI content if any exists
    if (aiBlockIdsRef.current.size > 0) {
      handleAIKeep();
    }

    setShowAIActions(false);

    const cursor = editor.getTextCursorPosition();
    if (!cursor?.block) return;

    const fullBlogText = getFullBlogContext();
    const cursorBlock = cursor.block;
    const blockText = (cursorBlock.content || []).map((c) => c.text || '').join('');
    const isEditMode = blockText.trim().length > 0;

    let anchorBlockId = cursorBlock.id;
    aiAnchorIdRef.current = anchorBlockId;

    // The space handler already inserted an empty paragraph after the anchor block.
    // Find and reuse it as the placeholder instead of inserting another one.
    const doc = editor.document;
    const anchorIdx = doc.findIndex((b) => b.id === menuPos.anchorBlockId || b.id === anchorBlockId);
    let insertedBlock = null;

    if (anchorIdx !== -1 && anchorIdx + 1 < doc.length) {
      const nextBlock = doc[anchorIdx + 1];
      const nextText = (nextBlock.content || []).map((c) => c.text || '').join('');
      if (nextBlock.type === 'paragraph' && nextText.trim() === '') {
        insertedBlock = nextBlock;
      }
    }

    // Fallback: insert a new placeholder if we couldn't find the space handler's block
    if (!insertedBlock) {
      editor.insertBlocks([{ type: 'paragraph', content: [] }], cursor.block, 'after');
      const freshDoc = editor.document;
      const cursorIdx = freshDoc.findIndex((b) => b.id === anchorBlockId);
      insertedBlock = freshDoc[cursorIdx + 1];
    }

    if (!insertedBlock) return;

    aiBlockCountRef.current = 1;
    let currentIds = [insertedBlock.id];
    aiBlockIdsRef.current = new Set(currentIds);

    setAiGenerating(true);
    setAiPhase('thinking');
    setAiGeneratingBlockId(insertedBlock.id);
    wrapperRef.current?.classList.add('ai-editor-locked');
    const abortController = new AbortController();
    aiAbortRef.current = abortController;

    // Skeleton on anchor line
    const anchorEl = menuPos.anchorBlockId
      ? wrapperRef.current?.querySelector(`[data-id="${menuPos.anchorBlockId}"]`)
      : wrapperRef.current?.querySelector(`[data-id="${anchorBlockId}"]`);
    if (anchorEl) {
      anchorEl.classList.add('ai-edit-selected-block', 'ai-hide-placeholder');
    }

    // Position inline status bar below anchor (offset past the thin shimmer bar)
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const anchorBottom = anchorEl && wrapperRect
      ? anchorEl.getBoundingClientRect().bottom - wrapperRect.top
      : menuPos.top + 36;
    setAiStatusInline(true);
    setAiInlinePos({ top: anchorBottom + 16 });
    setAiStatusText('is thinking');

    // Skeleton on placeholder block
    requestAnimationFrame(() => {
      const placeholderEl = wrapperRef.current?.querySelector(`[data-id="${insertedBlock.id}"]`);
      if (placeholderEl) {
        placeholderEl.classList.add('ai-placeholder-skeleton');
        let sibling = placeholderEl.nextElementSibling;
        let count = 0;
        while (sibling && count < 3) {
          sibling.classList.add('ai-skeleton-nearby');
          sibling = sibling.nextElementSibling;
          count++;
        }
      }
    });

    // --- Helpers ---
    function cleanupSkeletons() {
      if (aiStatusTimerRef.current) { clearInterval(aiStatusTimerRef.current); aiStatusTimerRef.current = null; }
      setAiStatusInline(false);
      wrapperRef.current?.querySelectorAll('.ai-placeholder-skeleton, .ai-skeleton-nearby, .ai-edit-selected-block, .ai-hide-placeholder, .ai-typing-skeleton, .ai-writing-active').forEach((el) => {
        el.classList.remove('ai-placeholder-skeleton', 'ai-skeleton-nearby', 'ai-edit-selected-block', 'ai-hide-placeholder', 'ai-typing-skeleton', 'ai-writing-active');
      });
    }

    function handleAIError(err) {
      cleanupSkeletons();
      setAiGenerating(false);
      setAiPhase('idle');
      setAiGeneratingBlockId(null);
      aiAbortRef.current = null;
      hideSparkle();
      try {
        const ids = getAiBlockIds();
        if (ids.length > 0) editor.removeBlocks(ids);
      } catch {}
      setAiBlockIds(new Set());
      aiBlockIdsRef.current = new Set();
      setShowAIActions(false);
      if (err.name !== 'AbortError') {
        console.error('AI generation error:', err);
        setAiErrorToast('AI generation failed');
      }
    }

    try {
      const { streamAI, getOrCreateSession, reuploadImage } = await import('../../ai/agent');
      const { AGENT_SYSTEM_PROMPT, EDIT_SYSTEM_PROMPT } = await import('../../ai/prompts');
      const { parseMarkdownToBlocks } = await import('./markdownToBlocks');

      // Get or create lixsearch session for this blog
      const sessionId = await getOrCreateSession(blogId);

      // Build user prompt with context
      let finalPrompt;
      if (isEditMode) {
        const docBlocks = editor.document;
        const blockIdx = docBlocks.findIndex((b) => b.id === cursorBlock.id);
        const before = docBlocks.slice(Math.max(0, blockIdx - 5), blockIdx);
        const after = docBlocks.slice(blockIdx + 1, blockIdx + 6);
        const contextBefore = before.map((b) => (b.content || []).map((c) => c.text || '').join('')).filter(Boolean).join('\n');
        const contextAfter = after.map((b) => (b.content || []).map((c) => c.text || '').join('')).filter(Boolean).join('\n');
        finalPrompt = `## Full blog content (for context):\n${fullBlogText}\n\n---\n\nNearby context:\nBefore:\n${contextBefore}\n\nCurrent block:\n${blockText}\n\nAfter:\n${contextAfter}\n\n---\n\nInstruction: ${userPrompt}`;
      } else {
        finalPrompt = fullBlogText
          ? `## Full blog content so far (for context):\n${fullBlogText}\n\n---\n\nContinue/add the following: ${userPrompt}`
          : userPrompt;
      }

      let firstChunkReceived = false;
      let imagePlaceholderInserted = false;

      // Stream AI response — markdown text arrives in real-time
      await streamAI({
        sessionId,
        systemPrompt: isEditMode ? EDIT_SYSTEM_PROMPT : AGENT_SYSTEM_PROMPT,
        userPrompt: finalPrompt,
        signal: abortController.signal,

        onTask: (taskText, phase) => {
          // Show lixsearch TASK status directly in the status bar
          if (phase === 'done') return;

          // Set phase for the bottom bar icon/label
          if (phase === 'generating_image') setAiPhase('generating_image');
          else if (phase === 'image_ready') setAiPhase('uploading');
          else setAiPhase(firstChunkReceived ? 'writing' : 'thinking');

          // Display the raw task text from lixsearch as status
          setAiStatusText(taskText);

          // Insert image placeholder skeleton when image generation starts
          const t = taskText.toLowerCase();
          if ((t.includes('generating image') || t.includes('creating your image') || t.includes('image generation')) && !imagePlaceholderInserted) {
            imagePlaceholderInserted = true;
            const afterId = currentIds[currentIds.length - 1];
            try {
              editor.insertBlocks([{ type: 'image', props: { _imageId: 'ai_stream_img', caption: '' } }], afterId, 'after');
              const updDoc = editor.document;
              const aftIdx = updDoc.findIndex((b) => b.id === afterId);
              const imgBlock = updDoc[aftIdx + 1];
              if (imgBlock) {
                currentIds.push(imgBlock.id);
                aiBlockIdsRef.current = new Set(currentIds);
                aiBlockCountRef.current = currentIds.length;
                requestAnimationFrame(() => {
                  const el = wrapperRef.current?.querySelector(`[data-id="${imgBlock.id}"]`);
                  if (el) el.classList.add('ai-image-skeleton');
                });
              }
            } catch {}
          }
        },

        onChunk: (_chunk, fullText) => {
          if (!firstChunkReceived) {
            firstChunkReceived = true;
            cleanupSkeletons();
            setAiPhase('writing');
          }

          // Handle TITLE: prefix
          let contentText = fullText;
          if (contentText.trim().startsWith('TITLE:')) {
            const lines = contentText.trim().split('\n');
            const titleLine = lines.shift();
            const newTitle = titleLine.replace(/^TITLE:\s*/, '').trim();
            if (onTitleChange && newTitle) onTitleChange(newTitle);
            contentText = lines.join('\n').trim();
            if (!contentText) return;
          }

          // Parse markdown to blocks and update in real-time
          const newBlocks = parseMarkdownToBlocks(contentText);
          if (newBlocks.length === 0) return;

          try {
            // Get current AI block IDs from the document
            const anchorId = aiAnchorIdRef.current;
            const docNow = editor.document;
            const anchorIdxNow = docNow.findIndex((b) => b.id === anchorId);
            if (anchorIdxNow === -1) return;

            // Separate blocks: inline-content blocks go through replaceBlocks,
            // content-none blocks (image, mermaid, divider, blockEquation) are inserted after
            const specialTypes = new Set(['image', 'mermaidBlock', 'divider', 'blockEquation']);
            const inlineBlocks = newBlocks.filter((b) => !specialTypes.has(b.type));
            const specialBlocks = newBlocks
              .map((b, idx) => ({ block: b, origIdx: idx }))
              .filter(({ block }) => specialTypes.has(block.type) && block.type !== 'image');

            // Get existing AI inline block IDs (exclude special blocks)
            const existingInlineIds = currentIds.filter((id) => {
              const block = docNow.find((b) => b.id === id);
              return block && !specialTypes.has(block.type);
            });

            // Keep track of special block IDs already in the document
            const existingSpecialIds = currentIds.filter((id) => {
              const block = docNow.find((b) => b.id === id);
              return block && specialTypes.has(block.type) && block.type !== 'image';
            });

            // Remove old special blocks (they'll be re-inserted in correct positions)
            if (existingSpecialIds.length > 0) {
              try { editor.removeBlocks(existingSpecialIds); } catch {}
            }

            // Replace inline blocks
            if (existingInlineIds.length > 0 && inlineBlocks.length > 0) {
              editor.replaceBlocks(existingInlineIds, inlineBlocks);
            }

            // Refresh doc and collect new inline IDs
            const refreshedDoc = editor.document;
            const newAnchorIdx = refreshedDoc.findIndex((b) => b.id === anchorId);
            const imageIds = currentIds.filter((id) => {
              const block = docNow.find((b) => b.id === id);
              return block && block.type === 'image';
            });
            const newInlineIds = refreshedDoc
              .slice(newAnchorIdx + 1, newAnchorIdx + 1 + inlineBlocks.length)
              .map((b) => b.id);

            // Insert special blocks (mermaid, divider) at their correct positions
            // They go after the inline block that precedes them in the original order
            let insertedSpecialIds = [];
            for (const { block: specBlock, origIdx } of specialBlocks) {
              // Find how many inline blocks come before this special block
              const inlineBefore = newBlocks.slice(0, origIdx).filter((b) => !specialTypes.has(b.type)).length;
              const afterId = inlineBefore > 0 && inlineBefore <= newInlineIds.length
                ? newInlineIds[inlineBefore - 1]
                : (newInlineIds.length > 0 ? newInlineIds[newInlineIds.length - 1] : anchorId);
              try {
                editor.insertBlocks([specBlock], afterId, 'after');
                const updDoc = editor.document;
                const afterIdx = updDoc.findIndex((b) => b.id === afterId);
                const inserted = updDoc[afterIdx + 1];
                if (inserted) {
                  insertedSpecialIds.push(inserted.id);
                  // Update newInlineIds to account for insertion shifting
                  newInlineIds.splice(inlineBefore, 0, inserted.id);
                }
              } catch {}
            }

            currentIds = [...newInlineIds, ...imageIds];
            aiBlockIdsRef.current = new Set(currentIds);
            aiBlockCountRef.current = currentIds.length;

            // Set BlockNote textColor + backgroundColor on AI blocks (survives re-renders)
            const noColorProps = new Set(['image', 'divider', 'mermaidBlock', 'blockEquation']);
            for (const id of currentIds) {
              try {
                const block = editor.document.find((b) => b.id === id);
                if (block && !noColorProps.has(block.type)) {
                  editor.updateBlock(id, { props: { textColor: 'purple', backgroundColor: 'purple' } });
                }
              } catch {}
            }

            // Highlight while streaming and scroll
            highlightAiBlocks(currentIds, true, true);
            requestAnimationFrame(() => {
              const lastId = currentIds[currentIds.length - 1];
              const lastEl = wrapperRef.current?.querySelector(`[data-id="${lastId}"]`);
              if (lastEl) {
                const rect = lastEl.getBoundingClientRect();
                if (rect.bottom > window.innerHeight * 0.85) {
                  window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.5, behavior: 'smooth' });
                }
              }
            });
          } catch { /* block may have been removed */ }
        },

        onImage: ({ alt, url }) => {
          // Image URL arrived in the stream — show immediately, then re-upload to Cloudinary
          let targetBlockId = null;

          if (imagePlaceholderInserted) {
            replaceImagePlaceholder('ai_stream_img', url, alt);
            imagePlaceholderInserted = false;
            // Find the placeholder block ID for later update
            const doc = editor.document;
            for (const b of doc) {
              if (b.type === 'image' && b.props?._imageId === 'ai_stream_img') {
                targetBlockId = b.id;
                break;
              }
            }
          } else {
            const afterId = currentIds[currentIds.length - 1];
            try {
              editor.insertBlocks([{ type: 'image', props: { url, caption: alt || '', previewWidth: 740 } }], afterId, 'after');
              const updDoc = editor.document;
              const aftIdx = updDoc.findIndex((b) => b.id === afterId);
              const imgBlock = updDoc[aftIdx + 1];
              if (imgBlock) {
                targetBlockId = imgBlock.id;
                currentIds.push(imgBlock.id);
                aiBlockIdsRef.current = new Set(currentIds);
                aiBlockCountRef.current = currentIds.length;
                requestAnimationFrame(() => {
                  const el = wrapperRef.current?.querySelector(`[data-id="${imgBlock.id}"]`);
                  if (el) el.classList.add('ai-image-loaded');
                });
              }
            } catch {}
          }

          // Re-upload to Cloudinary in background (lixsearch URLs are temporary)
          const blockIdToUpdate = targetBlockId;
          reuploadImage(url, alt).then((uploaded) => {
            if (!uploaded) return;
            // Find the image block and replace URL with permanent Cloudinary URL
            try {
              const doc = editor.document;
              const block = blockIdToUpdate
                ? doc.find((b) => b.id === blockIdToUpdate)
                : doc.find((b) => b.type === 'image' && b.props?.url === url);
              if (block) {
                editor.updateBlock(block.id, {
                  props: { url: uploaded.url, _mediaId: uploaded.id },
                });
              }
            } catch {}
          });
        },

        onDone: (fullText) => {
          // Final parse to ensure all content is captured
          let contentText = fullText;
          if (contentText.trim().startsWith('TITLE:')) {
            const lines = contentText.trim().split('\n');
            const titleLine = lines.shift();
            const newTitle = titleLine.replace(/^TITLE:\s*/, '').trim();
            if (onTitleChange && newTitle) onTitleChange(newTitle);
            contentText = lines.join('\n').trim();
          }

          if (contentText) {
            const finalBlocks = parseMarkdownToBlocks(contentText);
            const _special = new Set(['image', 'mermaidBlock', 'divider', 'blockEquation']);
            const inlineOnly = finalBlocks.filter((b) => !_special.has(b.type));
            const specialOnly = finalBlocks
              .map((b, idx) => ({ block: b, origIdx: idx }))
              .filter(({ block }) => _special.has(block.type) && block.type !== 'image');

            if (inlineOnly.length > 0) {
              try {
                const anchorId = aiAnchorIdRef.current;
                const docNow = editor.document;
                const existingInline = currentIds.filter((id) => {
                  const block = docNow.find((b) => b.id === id);
                  return block && !_special.has(block.type);
                });
                const existingSpecial = currentIds.filter((id) => {
                  const block = docNow.find((b) => b.id === id);
                  return block && _special.has(block.type) && block.type !== 'image';
                });
                if (existingSpecial.length > 0) {
                  try { editor.removeBlocks(existingSpecial); } catch {}
                }
                if (existingInline.length > 0) {
                  editor.replaceBlocks(existingInline, inlineOnly);
                }
                const refreshedDoc = editor.document;
                const newAnchorIdx = refreshedDoc.findIndex((b) => b.id === anchorId);
                const imageIds = currentIds.filter((id) => {
                  const block = docNow.find((b) => b.id === id);
                  return block && block.type === 'image';
                });
                const newInlineIds = refreshedDoc
                  .slice(newAnchorIdx + 1, newAnchorIdx + 1 + inlineOnly.length)
                  .map((b) => b.id);

                // Insert special blocks at correct positions
                for (const { block: specBlock, origIdx } of specialOnly) {
                  const inlineBefore = finalBlocks.slice(0, origIdx).filter((b) => !_special.has(b.type)).length;
                  const afterId = inlineBefore > 0 && inlineBefore <= newInlineIds.length
                    ? newInlineIds[inlineBefore - 1]
                    : (newInlineIds.length > 0 ? newInlineIds[newInlineIds.length - 1] : anchorId);
                  try {
                    editor.insertBlocks([specBlock], afterId, 'after');
                    const updDoc = editor.document;
                    const afterIdx = updDoc.findIndex((b) => b.id === afterId);
                    const inserted = updDoc[afterIdx + 1];
                    if (inserted) newInlineIds.splice(inlineBefore, 0, inserted.id);
                  } catch {}
                }

                currentIds = [...newInlineIds, ...imageIds];
                aiBlockIdsRef.current = new Set(currentIds);
                aiBlockCountRef.current = currentIds.length;
              } catch {}
            }
          } else {
            // No content — remove placeholder
            try { editor.removeBlocks([insertedBlock.id]); } catch {}
            currentIds = [];
          }

          // Insert trailing empty paragraph
          try {
            const lastAiId = currentIds[currentIds.length - 1];
            if (lastAiId) {
              editor.insertBlocks([{ type: 'paragraph', content: [] }], lastAiId, 'after');
            }
          } catch {}

          // Set final BlockNote textColor + backgroundColor on AI blocks
          const _skipColor = new Set(['image', 'divider', 'mermaidBlock', 'blockEquation']);
          for (const id of currentIds) {
            try {
              const block = editor.document.find((b) => b.id === id);
              if (block && !_skipColor.has(block.type)) {
                editor.updateBlock(id, { props: { textColor: 'purple', backgroundColor: 'purple' } });
              }
            } catch {}
          }

          const finalIds = new Set(currentIds);
          aiBlockIdsRef.current = finalIds;
          setAiBlockIds(finalIds);
          setAiGenerating(false);
          setAiPhase('idle');
          setAiGeneratingBlockId(null);
          aiAbortRef.current = null;
          setShowAIActions(currentIds.length > 0);
          highlightAiBlocks(currentIds, false);
        },

        onError: (err) => {
          handleAIError(err);
        },
      });
    } catch (err) {
      handleAIError(err);
    }
  }, [editor, getAiBlockIds, highlightAiBlocks, getFullBlogContext, blogId, handleAIKeep, aiMenuPos, hideSparkle, onTitleChange, replaceImagePlaceholder]);

  return (
    <div className={`blog-editor-wrapper${aiGenerating ? ' ai-editor-locked' : ''}`} ref={wrapperRef} style={{ position: 'relative' }}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme={isDark ? "dark" : "light"}
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getItems}
        />
        <TableHandlesController />
      </BlockNoteView>

      {/* @ Mention menu */}
      {showMentionMenu && mentionQuery && (
        <div
          className="absolute z-[60]"
          style={{ top: mentionPos.top, left: mentionPos.left }}
        >
          <MentionMenu
            editor={editor}
            query={mentionQuery}
            onClose={handleMentionClose}
          />
        </div>
      )}

      {showAIMenu && (
        <AICommandMenu
          position={aiMenuPos}
          onSubmit={handleAISubmit}
          onClose={() => {
            setShowAIMenu(false);
            // Restore the host block and remove the inserted empty paragraph
            if (aiMenuPos.anchorBlockId) {
              const hostEl = wrapperRef.current?.querySelector(`[data-id="${aiMenuPos.anchorBlockId}"]`);
              if (hostEl) {
                hostEl.style.visibility = '';
                hostEl.style.height = '';
                hostEl.style.overflow = '';
                hostEl.style.margin = '';
                hostEl.style.padding = '';
              }
              // Remove the extra paragraph we inserted below
              try {
                const doc = editor.document;
                const idx = doc.findIndex((b) => b.id === aiMenuPos.anchorBlockId);
                if (idx !== -1 && idx + 1 < doc.length) {
                  const nextBlock = doc[idx + 1];
                  const nextEl = wrapperRef.current?.querySelector(`[data-id="${nextBlock.id}"]`);
                  if (nextEl) nextEl.classList.remove('ai-hide-placeholder');
                  const isEmpty = nextBlock.type === 'paragraph' &&
                    (!nextBlock.content || nextBlock.content.length === 0 ||
                      (nextBlock.content.length === 1 && nextBlock.content[0].text === ''));
                  if (isEmpty) editor.removeBlocks([nextBlock.id]);
                }
              } catch {}
              // Refocus the original block
              try { editor.setTextCursorPosition(aiMenuPos.anchorBlockId, 'start'); } catch {}
            }
          }}
        />
      )}

      {/* Inline AI status bar — appears at the empty line before streaming starts */}
      {aiGenerating && aiStatusInline && (
        <div
          className="ai-inline-status-bar"
          style={{
            position: 'absolute',
            top: aiInlinePos.top,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        >
          <div className="mx-auto w-full max-w-[600px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-[1.5px] border-[rgba(196,181,253,0.3)]">
                <img src="/base-logo.png" alt="Elixpo" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] font-semibold text-[#c4b5fd]">Elixpo</span>
                <span className="text-[13px] text-[#8b8fa3] ai-status-text-fade">{aiStatusText}<span className="elixpo-typing-dots"><span /><span /><span /></span></span>
              </div>
              <button
                onClick={handleAIStop}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-medium text-[#f87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.25)] hover:bg-[rgba(248,113,113,0.15)] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><rect x="1" y="1" width="10" height="10" rx="2" /></svg>
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elixpo AI typing bar — fixed bottom glassmorphism (shown after first chunk) */}
      {aiGenerating && !aiStatusInline && (
        <div className="elixpo-typing-bar">
          <div className="elixpo-typing-bar-inner">
            <img src="/base-logo.png" alt="Elixpo" className="elixpo-typing-avatar" />
            <div className="elixpo-typing-text">
              <span className="elixpo-typing-name">Elixpo</span>
              <span className="elixpo-typing-status">{aiStatusText || (
                aiPhase === 'thinking' ? 'is thinking' :
                aiPhase === 'generating_image' ? 'is creating an image' :
                aiPhase === 'uploading' ? 'is uploading' :
                'is writing'
              )}<span className="elixpo-typing-dots"><span /><span /><span /></span></span>
            </div>
            <button className="elixpo-stop-btn" onClick={handleAIStop}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                <rect x="1" y="1" width="10" height="10" rx="2" />
              </svg>
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Keep/Discard actions — fixed bottom bar after AI done */}
      {showAIActions && !aiGenerating && aiBlockIds.size > 0 && (
        <div className="elixpo-done-bar">
          <div className="elixpo-done-bar-inner">
            <img src="/base-logo.png" alt="Elixpo" className="elixpo-typing-avatar" />
            <span className="elixpo-done-label">Elixpo finished writing</span>
            <div className="elixpo-done-actions">
              <button className="elixpo-done-keep" onClick={handleAIKeep} title="Keep">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Keep
              </button>
              <button className="elixpo-done-discard" onClick={handleAIDiscard} title="Discard">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI selection toolbar — appears on text selection */}
      <AISelectionToolbar editor={editor} onTitleChange={onTitleChange} blogId={blogId} />

      {/* AI error toast */}
      {aiErrorToast && (
        <div className="ai-error-toast" onAnimationEnd={(e) => {
          if (e.animationName === 'ai-toast-fade-out') setAiErrorToast(null);
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke="#ff6b6b" strokeWidth="1.5" />
            <path d="M8 4.5v4" stroke="#ff6b6b" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.75" fill="#ff6b6b" />
          </svg>
          <span>{aiErrorToast}</span>
          <button onClick={() => setAiErrorToast(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
});

export default BlogEditor;
