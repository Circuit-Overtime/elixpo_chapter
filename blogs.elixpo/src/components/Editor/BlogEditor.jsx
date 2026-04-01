'use client';

import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
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

// Block specs from createReactBlockSpec are factories — call them to get the spec
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
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
  'table', 'codeBlock', 'checkListItem', 'file', 'video', 'audio',
  'tableOfContents', 'blockEquation', 'buttonBlock', 'breadcrumbs',
  'tabsBlock', 'aiBlock', 'mermaidBlock',
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
      result.push({
        id: block.id,
        type: 'codeBlock',
        props: { language: lang },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      continue;
    }

    result.push(block);
    i++;
  }
  return result;
}

const BlogEditor = forwardRef(function BlogEditor({ onChange, initialContent, onReady, onTitleChange, blogId }, ref) {
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
  const resolvedImagesRef = useRef({}); // Track resolved AI image URLs: { imageId: { url, alt } }
  const wrapperRef = useRef(null);

  const sanitizedContent = useMemo(() => sanitizeInitialContent(initialContent), [initialContent]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: sanitizedContent || undefined,
    domAttributes: {
      editor: { class: 'blog-editor' },
    },
    placeholders: {
      default: "Press 'Space' for AI, type '/' for commands",
    },
  });

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

  // Disable spellcheck on code blocks + inject copy buttons
  const patchCodeBlocks = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.querySelectorAll('[data-content-type="codeBlock"]').forEach((block) => {
      const editable = block.querySelector('[contenteditable]');
      if (editable) editable.spellcheck = false;
      if (!block.querySelector('.code-copy-btn')) {
        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.title = 'Copy code';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        btn.onclick = () => {
          const code = block.querySelector('[contenteditable]')?.textContent || '';
          navigator.clipboard.writeText(code);
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          setTimeout(() => {
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
          }, 1500);
        };
        block.style.position = 'relative';
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
    wrapperRef.current?.querySelectorAll('.ai-skeleton-nearby, .ai-placeholder-skeleton, .ai-edit-selected-block, .ai-hide-placeholder').forEach((el) => {
      el.classList.remove('ai-skeleton-nearby', 'ai-placeholder-skeleton', 'ai-edit-selected-block', 'ai-hide-placeholder');
    });

    // Scroll to the AI-generated content and show keep/discard
    const ids = aiBlockIdsRef.current;
    if (ids && ids.size > 0) {
      setShowAIActions(true);
      requestAnimationFrame(() => {
        const firstId = [...ids][0];
        const el = wrapperRef.current?.querySelector(`[data-id="${firstId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, []);

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
        for (const id of aiBlockIds) {
          const el = wrapper.querySelector(`[data-id="${id}"]`);
          if (el && !el.classList.contains('ai-generated-highlight')) {
            el.classList.add('ai-generated-highlight');
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
  const highlightAiBlocks = useCallback((ids, showCursor = true) => {
    // Remove old highlights
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight').forEach((el) => {
      el.classList.remove('ai-generated-highlight');
    });
    // Add highlight to current AI blocks — CSS handles the lavender color
    for (const id of ids) {
      const el = wrapperRef.current?.querySelector(`[data-id="${id}"]`);
      if (el) el.classList.add('ai-generated-highlight');
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
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight').forEach((el) => {
      el.classList.remove('ai-generated-highlight');
    });
    setAiBlockIds(new Set());
    aiBlockIdsRef.current = new Set();
    aiBlockCountRef.current = 0;
    aiAnchorIdRef.current = null;
    setShowAIActions(false);
  }, [hideSparkle]);

  const handleAIDiscard = useCallback(() => {
    hideSparkle();
    const storedIds = [...aiBlockIdsRef.current];
    if (storedIds.length > 0) {
      try { editor.removeBlocks(storedIds); } catch {
        try { const fb = getAiBlockIds(); if (fb.length > 0) editor.removeBlocks(fb); } catch {}
      }
    }
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight').forEach((el) => {
      el.classList.remove('ai-generated-highlight');
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

  const removeImagePlaceholder = useCallback((imageId) => {
    try {
      const doc = editor.document;
      for (const block of doc) {
        if (block.type === 'image' && block.props?._imageId === imageId) {
          // Convert to empty paragraph instead of removing — leaves an empty line
          editor.updateBlock(block.id, { type: 'paragraph', props: {}, content: [] });
          return;
        }
        // Also check paragraph blocks with IMG_LOADING text
        if (block.type === 'paragraph') {
          const text = (block.content || []).map(c => c.text || '').join('');
          if (text.includes(`IMG_LOADING:${imageId}`)) {
            editor.updateBlock(block.id, { type: 'paragraph', props: {}, content: [] });
            return;
          }
        }
      }
      // Fallback: convert any image block with no URL (empty placeholder)
      for (const block of doc) {
        if (block.type === 'image' && (!block.props?.url || block.props.url === '')) {
          const el = wrapperRef.current?.querySelector(`[data-id="${block.id}"]`);
          if (el?.classList.contains('ai-image-skeleton')) {
            editor.updateBlock(block.id, { type: 'paragraph', props: {}, content: [] });
            return;
          }
        }
      }
    } catch {}
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

    // Build block context with IDs for edit operations
    const docBlocks = editor.document;
    const blockContext = docBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      text: (b.content || []).map((c) => c.text || '').join(''),
    }));

    let anchorBlockId = cursorBlock.id;
    aiAnchorIdRef.current = anchorBlockId;

    // The space handler already inserted an empty paragraph after the anchor block.
    // Find and reuse it as the placeholder instead of inserting another one.
    const doc = editor.document;
    const anchorIdx = doc.findIndex((b) => b.id === menuPos.anchorBlockId || b.id === anchorBlockId);
    let insertedBlock = null;

    if (anchorIdx !== -1 && anchorIdx + 1 < doc.length) {
      const nextBlock = doc[anchorIdx + 1];
      // Reuse if it's the empty paragraph from the space handler
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
    const abortController = new AbortController();
    aiAbortRef.current = abortController;

    // Skeleton on anchor line
    const anchorEl = menuPos.anchorBlockId
      ? wrapperRef.current?.querySelector(`[data-id="${menuPos.anchorBlockId}"]`)
      : wrapperRef.current?.querySelector(`[data-id="${anchorBlockId}"]`);
    if (anchorEl) {
      anchorEl.classList.add('ai-edit-selected-block', 'ai-hide-placeholder');
    }

    // Position inline status bar below anchor
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const anchorBottom = anchorEl && wrapperRect
      ? anchorEl.getBoundingClientRect().bottom - wrapperRect.top
      : menuPos.top + 36;
    setAiStatusInline(true);
    setAiInlinePos({ top: anchorBottom + 4 });
    setAiStatusText('is thinking');

    // Cycle status messages
    const statusMessages = ['is thinking', 'is understanding', 'is preparing'];
    let statusIdx = 0;
    aiStatusTimerRef.current = setInterval(() => {
      statusIdx = (statusIdx + 1) % statusMessages.length;
      setAiStatusText(statusMessages[statusIdx]);
    }, 1800);

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
      wrapperRef.current?.querySelectorAll('.ai-placeholder-skeleton, .ai-skeleton-nearby, .ai-edit-selected-block, .ai-hide-placeholder, .ai-typing-skeleton').forEach((el) => {
        el.classList.remove('ai-placeholder-skeleton', 'ai-skeleton-nearby', 'ai-edit-selected-block', 'ai-hide-placeholder', 'ai-typing-skeleton');
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
      const { requestAgent, generateAndUploadImage } = await import('../../ai/agent');
      const { AGENT_SYSTEM_PROMPT, EDIT_SYSTEM_PROMPT } = await import('../../ai/prompts');
      const { parseInlineContent } = await import('./markdownToBlocks');

      // Animate typing a content string into a block char by char
      async function animateTyping(blockId, contentStr, signal) {
        if (!contentStr || signal?.aborted) return;
        const chars = [...contentStr];
        const BATCH = 8;
        const DELAY = 12;

        for (let i = 0; i <= chars.length; i += BATCH) {
          if (signal?.aborted) return;
          const partial = chars.slice(0, i).join('');
          const partialContent = parseInlineContent(partial);
          try {
            editor.updateBlock(blockId, { content: partialContent });
          } catch { return; }
          if (i % 40 === 0) {
            const el = wrapperRef.current?.querySelector(`[data-id="${blockId}"]`);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.bottom > window.innerHeight * 0.85) {
                window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.5, behavior: 'smooth' });
              }
            }
          }
          await new Promise((r) => setTimeout(r, DELAY));
        }
        const finalContent = parseInlineContent(contentStr);
        try { editor.updateBlock(blockId, { content: finalContent }); } catch {}
      }

      // Build user prompt with context
      let finalPrompt;
      if (isEditMode) {
        const blockIdx = docBlocks.findIndex((b) => b.id === cursorBlock.id);
        const before = docBlocks.slice(Math.max(0, blockIdx - 5), blockIdx);
        const after = docBlocks.slice(blockIdx + 1, blockIdx + 6);
        const contextBefore = before.map((b) => (b.content || []).map((c) => c.text || '').join('')).filter(Boolean).join('\n');
        const contextAfter = after.map((b) => (b.content || []).map((c) => c.text || '').join('')).filter(Boolean).join('\n');
        finalPrompt = `## Full blog content (for context):\n${fullBlogText}\n\n---\n\nNearby context:\nBefore:\n${contextBefore}\n\nCurrent block [${cursorBlock.id}] (${cursorBlock.type}):\n${blockText}\n\nAfter:\n${contextAfter}\n\n---\n\nInstruction: ${userPrompt}`;
      } else {
        finalPrompt = fullBlogText
          ? `## Full blog content so far (for context):\n${fullBlogText}\n\n---\n\nContinue/add the following: ${userPrompt}`
          : userPrompt;
      }

      // Request structured JSON response
      const response = await requestAgent({
        systemPrompt: isEditMode ? EDIT_SYSTEM_PROMPT : AGENT_SYSTEM_PROMPT,
        userPrompt: finalPrompt,
        blocks: isEditMode ? blockContext : undefined,
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      // --- Remove skeletons, transition to writing phase ---
      cleanupSkeletons();
      setAiPhase('writing');

      // Handle title
      if (response.title && onTitleChange) {
        onTitleChange(response.title);
      }

      // --- Process operations ---
      const operations = response.operations || [];

      if (operations.length === 0) {
        // No operations — clean up placeholder
        try { editor.removeBlocks([insertedBlock.id]); } catch {}
        setAiGenerating(false);
        setAiPhase('idle');
        setAiGeneratingBlockId(null);
        aiAbortRef.current = null;
        hideSparkle();
        aiBlockIdsRef.current = new Set();
        aiBlockCountRef.current = 0;
        setAiBlockIds(new Set());
        setShowAIActions(false);
        return;
      }

      // Keep the placeholder — reuse it as the first AI block instead of removing and reinserting
      // This avoids stale ProseMirror references after removeBlocks
      currentIds = [insertedBlock.id];
      aiBlockIdsRef.current = new Set(currentIds);
      aiBlockCountRef.current = 1;
      let isFirstBlock = true;

      // Track pending image generations
      const pendingImages = [];

      for (const op of operations) {
        if (abortController.signal.aborted) break;

        if (op.op === 'insert') {
          const blocks = op.blocks || [];
          for (const blockDef of blocks) {
            if (abortController.signal.aborted) break;

            // For the very first block, reuse the placeholder instead of inserting
            if (isFirstBlock) {
              isFirstBlock = false;

              if (blockDef.type === 'image') {
                // Convert placeholder to image block
                const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                try {
                  editor.updateBlock(insertedBlock.id, {
                    type: 'image',
                    props: { _imageId: imageId, caption: blockDef.props?.alt || '' },
                  });
                } catch (updateErr) {
                  console.error('Failed to update placeholder to image:', updateErr);
                  continue;
                }

                requestAnimationFrame(() => {
                  const el = wrapperRef.current?.querySelector(`[data-id="${insertedBlock.id}"]`);
                  if (el) el.classList.add('ai-image-skeleton');
                });

                const imgPrompt = blockDef.props?.prompt || blockDef.props?.alt || 'blog image';
                pendingImages.push(
                  generateAndUploadImage({
                    imageId,
                    prompt: imgPrompt,
                    alt: blockDef.props?.alt || '',
                    width: blockDef.props?.width || 1024,
                    height: blockDef.props?.height || 576,
                    blogId,
                    onPreview: ({ id, previewUrl, alt }) => {
                      replaceImagePlaceholder(id, previewUrl, alt);
                    },
                    onDone: ({ id, url, alt }) => {
                      replaceImagePlaceholder(id, url, alt);
                    },
                    onError: ({ id, error }) => {
                      removeImagePlaceholder(id);
                      console.error('AI image generation error:', error);
                      setAiErrorToast('Image generation failed');
                    },
                    onPhase: (phase) => setAiPhase(phase),
                    signal: abortController.signal,
                  })
                );
              } else {
                // Convert placeholder to the correct block type
                const blockType = blockDef.type || 'paragraph';
                const props = {};
                if (blockType === 'heading') {
                  const lvl = parseInt(blockDef.props?.level) || 2;
                  props.level = String(Math.max(lvl, 2));
                }
                if (blockType === 'codeBlock' && blockDef.props?.language) {
                  props.language = blockDef.props.language;
                }

                try {
                  // Only change type if it differs from the placeholder paragraph
                  if (blockType !== 'paragraph') {
                    editor.updateBlock(insertedBlock.id, { type: blockType, props });
                  } else if (Object.keys(props).length > 0) {
                    editor.updateBlock(insertedBlock.id, { props });
                  }
                } catch (updateErr) {
                  // Fallback: remove old block, insert new one with correct type
                  try {
                    const anchorId = aiAnchorIdRef.current;
                    editor.removeBlocks([insertedBlock.id]);
                    editor.insertBlocks([{ type: blockType, props, content: [] }], anchorId, 'after');
                    const refreshedDoc = editor.document;
                    const anchorIdx = refreshedDoc.findIndex((b) => b.id === anchorId);
                    if (anchorIdx !== -1 && anchorIdx + 1 < refreshedDoc.length) {
                      insertedBlock = refreshedDoc[anchorIdx + 1];
                      currentIds = [insertedBlock.id];
                      aiBlockIdsRef.current = new Set(currentIds);
                    }
                  } catch (fallbackErr) {
                    console.error('Failed to update placeholder block:', fallbackErr);
                    continue;
                  }
                }

                highlightAiBlocks(currentIds, true);

                const newBlockEl = wrapperRef.current?.querySelector(`[data-id="${insertedBlock.id}"]`);
                if (newBlockEl) newBlockEl.classList.add('ai-typing-skeleton');

                const contentStr = blockDef.content || '';
                if (contentStr && blockType !== 'codeBlock') {
                  if (newBlockEl) newBlockEl.classList.remove('ai-typing-skeleton');
                  await animateTyping(insertedBlock.id, contentStr, abortController.signal);
                } else if (contentStr) {
                  const content = parseInlineContent(contentStr);
                  try { editor.updateBlock(insertedBlock.id, { content }); } catch {}
                }
              }
              continue;
            }

            // Subsequent blocks — insert after the last AI block
            const afterId = currentIds[currentIds.length - 1];

            if (blockDef.type === 'image') {
              // Image generation block
              const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              try {
                editor.insertBlocks([{
                  type: 'image',
                  props: { _imageId: imageId, caption: blockDef.props?.alt || '' },
                }], afterId, 'after');
              } catch (insertErr) {
                console.error('Failed to insert image block after', afterId, insertErr);
                continue;
              }

              const updatedDoc = editor.document;
              const afterIdx = updatedDoc.findIndex((b) => b.id === afterId);
              const imgBlock = updatedDoc[afterIdx + 1];
              if (imgBlock) {
                currentIds.push(imgBlock.id);
                aiBlockIdsRef.current = new Set(currentIds);
                aiBlockCountRef.current = currentIds.length;

                // Add skeleton to image block
                requestAnimationFrame(() => {
                  const el = wrapperRef.current?.querySelector(`[data-id="${imgBlock.id}"]`);
                  if (el) el.classList.add('ai-image-skeleton');
                });

                // Fire image generation asynchronously
                const imgPrompt = blockDef.props?.prompt || blockDef.props?.alt || 'blog image';
                pendingImages.push(
                  generateAndUploadImage({
                    imageId,
                    prompt: imgPrompt,
                    alt: blockDef.props?.alt || '',
                    width: blockDef.props?.width || 1024,
                    height: blockDef.props?.height || 576,
                    blogId,
                    onPreview: ({ id, previewUrl, alt }) => {
                      replaceImagePlaceholder(id, previewUrl, alt);
                    },
                    onDone: ({ id, url, alt }) => {
                      replaceImagePlaceholder(id, url, alt);
                    },
                    onError: ({ id, error }) => {
                      removeImagePlaceholder(id);
                      console.error('AI image generation error:', error);
                      setAiErrorToast('Image generation failed');
                    },
                    onPhase: (phase) => setAiPhase(phase),
                    signal: abortController.signal,
                  })
                );
              }
            } else {
              // Text-based block — insert empty, then animate typing
              const blockType = blockDef.type || 'paragraph';
              const props = {};
              if (blockType === 'heading') {
                const lvl = parseInt(blockDef.props?.level) || 2;
                props.level = String(Math.max(lvl, 2)); // h1 reserved for blog title
              }
              if (blockType === 'codeBlock' && blockDef.props?.language) {
                props.language = blockDef.props.language;
              }

              try {
                editor.insertBlocks([{
                  type: blockType,
                  props,
                  content: [],
                }], afterId, 'after');
              } catch (insertErr) {
                console.error('Failed to insert block after', afterId, insertErr);
                continue;
              }

              const updatedDoc = editor.document;
              const afterIdx = updatedDoc.findIndex((b) => b.id === afterId);
              const newBlock = updatedDoc[afterIdx + 1];
              if (newBlock) {
                currentIds.push(newBlock.id);
                aiBlockIdsRef.current = new Set(currentIds);
                aiBlockCountRef.current = currentIds.length;

                // Highlight this block
                highlightAiBlocks(currentIds, true);

                // Add skeleton shimmer while waiting to type
                const newBlockEl = wrapperRef.current?.querySelector(`[data-id="${newBlock.id}"]`);
                if (newBlockEl) newBlockEl.classList.add('ai-typing-skeleton');

                // Animate typing for text content
                const contentStr = blockDef.content || '';
                if (contentStr && blockType !== 'codeBlock') {
                  // Remove skeleton once typing starts
                  if (newBlockEl) newBlockEl.classList.remove('ai-typing-skeleton');
                  await animateTyping(newBlock.id, contentStr, abortController.signal);
                } else if (contentStr) {
                  // For code blocks, insert all at once (no char animation)
                  const content = parseInlineContent(contentStr);
                  try { editor.updateBlock(newBlock.id, { content }); } catch {}
                }
              }
            }
          }
        } else if (op.op === 'edit' && op.blockId) {
          // Edit an existing block — animate replacement
          const targetBlock = editor.document.find((b) => b.id === op.blockId);
          if (targetBlock) {
            // Mark original with strikethrough style
            const origEl = wrapperRef.current?.querySelector(`[data-id="${op.blockId}"]`);
            if (origEl) origEl.classList.add('ai-edit-original-block');

            // Insert replacement after the original
            try {
              editor.insertBlocks([{
                type: targetBlock.type,
                props: targetBlock.props || {},
                content: [],
              }], op.blockId, 'after');
            } catch (insertErr) {
              console.error('Failed to insert edit block after', op.blockId, insertErr);
              continue;
            }

            const updatedDoc = editor.document;
            const origIdx = updatedDoc.findIndex((b) => b.id === op.blockId);
            const newBlock = updatedDoc[origIdx + 1];
            if (newBlock) {
              currentIds.push(newBlock.id);
              aiBlockIdsRef.current = new Set(currentIds);
              aiBlockCountRef.current = currentIds.length;

              const newEl = wrapperRef.current?.querySelector(`[data-id="${newBlock.id}"]`);
              if (newEl) newEl.classList.add('ai-edit-new-block');

              // Animate typing the replacement
              const contentStr = op.content || '';
              if (contentStr) {
                await animateTyping(newBlock.id, contentStr, abortController.signal);
              }
            }
          }
        }
      }

      // Wait for pending image generations
      if (pendingImages.length > 0) {
        setAiPhase('generating_image');
        await Promise.allSettled(pendingImages);
      }

      // --- Finish up ---
      // Insert trailing empty paragraph
      try {
        const lastAiId = currentIds[currentIds.length - 1];
        if (lastAiId) {
          editor.insertBlocks([{ type: 'paragraph', content: [] }], lastAiId, 'after');
        }
      } catch {}

      const finalIds = new Set(currentIds);
      aiBlockIdsRef.current = finalIds;
      setAiBlockIds(finalIds);
      setAiGenerating(false);
      setAiPhase('idle');
      setAiGeneratingBlockId(null);
      aiAbortRef.current = null;
      setShowAIActions(currentIds.length > 0);
      highlightAiBlocks(currentIds, false);
    } catch (err) {
      handleAIError(err);
    }
  }, [editor, getAiBlockIds, highlightAiBlocks, getFullBlogContext, blogId, handleAIKeep, aiMenuPos, hideSparkle, onTitleChange, replaceImagePlaceholder, removeImagePlaceholder]);

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
              <span className="elixpo-typing-status">{
                aiPhase === 'thinking' ? 'is thinking' :
                aiPhase === 'generating_image' ? 'is creating an image' :
                aiPhase === 'uploading' ? 'is uploading' :
                'is writing'
              }<span className="elixpo-typing-dots"><span /><span /><span /></span></span>
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
      <AISelectionToolbar editor={editor} onTitleChange={onTitleChange} />

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
