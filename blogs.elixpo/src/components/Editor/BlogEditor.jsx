'use client';

import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import 'katex/dist/katex.min.css';
import { useCallback, useMemo, forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import AICommandMenu from './AICommandMenu';
import AISelectionToolbar from './AISelectionToolbar';
import { parseMarkdownToBlocks } from './markdownToBlocks';

// Custom blocks
import { TableOfContents } from './blocks/TableOfContents';
import { BlockEquation } from './blocks/BlockEquation';
import { ButtonBlock } from './blocks/ButtonBlock';
import { Breadcrumbs } from './blocks/Breadcrumbs';
import { TabsBlock } from './blocks/TabsBlock';
import { AIBlock } from './blocks/AIBlock';

// Custom inline content
import { InlineEquation } from './blocks/InlineEquation';
import { DateInline } from './blocks/DateInline';
import { MentionInline } from './blocks/MentionInline';
import { BlogMentionInline } from './blocks/BlogMentionInline';

// ── Schema ──

// Block specs from createReactBlockSpec are factories — call them to get the spec
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    tableOfContents: TableOfContents({}),
    blockEquation: BlockEquation({}),
    buttonBlock: ButtonBlock({}),
    breadcrumbs: Breadcrumbs({}),
    tabsBlock: TabsBlock({}),
    aiBlock: AIBlock({}),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    inlineEquation: InlineEquation,
    dateInline: DateInline,
    mention: MentionInline,
    blogMention: BlogMentionInline,
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
    return t !== 'video' && t !== 'audio';
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

const BlogEditor = forwardRef(function BlogEditor({ onChange, initialContent }, ref) {
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0 });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingBlockId, setAiGeneratingBlockId] = useState(null);
  const [aiErrorToast, setAiErrorToast] = useState(null);
  const [aiBlockIds, setAiBlockIds] = useState(new Set());
  const [showAIActions, setShowAIActions] = useState(false);
  const [aiActionsPos, setAiActionsPos] = useState({ top: 0, left: 0 });
  const aiAbortRef = useRef(null);
  const aiBlockIdsRef = useRef(new Set());
  const aiBlockCountRef = useRef(0);
  const aiAnchorIdRef = useRef(null);
  const wrapperRef = useRef(null);

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContent || undefined,
    domAttributes: {
      editor: { class: 'blog-editor' },
    },
    placeholders: {
      default: "Press 'Space' for AI, type '/' for commands",
    },
  });

  useImperativeHandle(ref, () => ({
    getDocument: () => editor.document,
    getEditor: () => editor,
    getHTML: async () => await editor.blocksToHTMLLossy(editor.document),
    getMarkdown: async () => await editor.blocksToMarkdownLossy(editor.document),
  }), [editor]);

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

  // Patch code blocks on initial mount
  useEffect(() => {
    requestAnimationFrame(patchCodeBlocks);
  }, [patchCodeBlocks]);

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

          // Try to get position from the focused block element directly
          // The cursor block DOM element is more reliable than selection range on empty blocks
          let top = 0;
          const cursor = editor.getTextCursorPosition();
          if (cursor?.block?.id) {
            const blockEl = wrapperRef.current?.querySelector(`[data-id="${cursor.block.id}"]`);
            if (blockEl) {
              const blockRect = blockEl.getBoundingClientRect();
              top = blockRect.bottom - wrapperRect.top + 6;
            }
          }

          // Fallback: use selection range
          if (top === 0) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              if (rect.height > 0) {
                top = rect.bottom - wrapperRect.top + 6;
              } else {
                // Zero rect — use the focused element
                const activeEl = document.activeElement;
                if (activeEl) {
                  const activeRect = activeEl.getBoundingClientRect();
                  top = activeRect.bottom - wrapperRect.top + 6;
                }
              }
            }
          }

          setAiMenuPos({ top, left: 0 });
          setShowAIMenu(true);
        }
      }
    }

    const editorEl = wrapperRef.current?.querySelector('.bn-editor');
    if (editorEl) {
      editorEl.addEventListener('keydown', handleKeyDown);
      return () => editorEl.removeEventListener('keydown', handleKeyDown);
    }
  }, [editor]);

  const handleAIStop = useCallback(() => {
    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
      aiAbortRef.current = null;
    }
    setAiGenerating(false);
    setAiGeneratingBlockId(null);

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

  // Highlight AI blocks in the DOM with lavender class + optional typing cursor on last block
  const highlightAiBlocks = useCallback((ids, showCursor = true) => {
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight, .ai-typing-cursor').forEach((el) => {
      el.classList.remove('ai-generated-highlight', 'ai-typing-cursor');
    });
    for (let i = 0; i < ids.length; i++) {
      const el = wrapperRef.current?.querySelector(`[data-id="${ids[i]}"]`);
      if (el) {
        el.classList.add('ai-generated-highlight');
        if (showCursor && i === ids.length - 1) el.classList.add('ai-typing-cursor');
      }
    }
  }, []);

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
    // Remove highlights, keep the text
    wrapperRef.current?.querySelectorAll('.ai-generated-highlight').forEach((el) => {
      el.classList.remove('ai-generated-highlight');
    });
    setAiBlockIds(new Set());
    aiBlockIdsRef.current = new Set();
    aiBlockCountRef.current = 0;
    aiAnchorIdRef.current = null;
    setShowAIActions(false);
  }, []);

  const handleAIDiscard = useCallback(() => {
    // Remove AI-generated blocks
    const ids = getAiBlockIds();
    if (ids.length > 0) {
      try { editor.removeBlocks(ids); } catch {}
    }
    setAiBlockIds(new Set());
    aiBlockIdsRef.current = new Set();
    aiBlockCountRef.current = 0;
    aiAnchorIdRef.current = null;
    setShowAIActions(false);
  }, [editor, getAiBlockIds]);

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
      } else if (!e.target.closest?.('.ai-inline-actions')) {
        setShowAIActions(false);
      }
    }

    const wrapper = wrapperRef.current;
    wrapper?.addEventListener('click', handleClick);
    return () => wrapper?.removeEventListener('click', handleClick);
  }, [aiBlockIds]);

  const handleAISubmit = useCallback(async (userPrompt) => {
    setShowAIMenu(false);
    setShowAIActions(false);
    const cursor = editor.getTextCursorPosition();
    if (!cursor?.block) return;

    const anchorBlockId = cursor.block.id;
    aiAnchorIdRef.current = anchorBlockId;

    // Insert initial placeholder
    editor.insertBlocks([{ type: 'paragraph', content: [] }], cursor.block, 'after');
    const doc = editor.document;
    const cursorIdx = doc.findIndex((b) => b.id === anchorBlockId);
    const insertedBlock = doc[cursorIdx + 1];
    if (!insertedBlock) return;

    aiBlockCountRef.current = 1;
    let currentIds = [insertedBlock.id];
    aiBlockIdsRef.current = new Set(currentIds);

    setAiGenerating(true);
    setAiGeneratingBlockId(insertedBlock.id);
    const abortController = new AbortController();
    aiAbortRef.current = abortController;

    // Apply initial highlight
    requestAnimationFrame(() => highlightAiBlocks(currentIds));

    try {
      const { streamAI } = await import('../../ai/stream');
      const { WRITE_SYSTEM_PROMPT } = await import('../../ai/prompts');

      await streamAI({
        systemPrompt: WRITE_SYSTEM_PROMPT,
        userPrompt,
        signal: abortController.signal,
        onChunk: (chunk, fullText) => {
          const newBlocks = parseMarkdownToBlocks(fullText);
          const oldIds = getAiBlockIds();

          if (oldIds.length === 0) return;

          try {
            if (newBlocks.length !== aiBlockCountRef.current) {
              // Block structure changed — replace all
              editor.replaceBlocks(oldIds, newBlocks);
              aiBlockCountRef.current = newBlocks.length;
              currentIds = getAiBlockIds();
              aiBlockIdsRef.current = new Set(currentIds);
            } else {
              // Same structure — just update the last block text
              const lastId = oldIds[oldIds.length - 1];
              const lastBlock = newBlocks[newBlocks.length - 1];
              editor.updateBlock(lastId, {
                type: lastBlock.type,
                props: lastBlock.props || {},
                content: lastBlock.content,
              });
              currentIds = oldIds;
              aiBlockIdsRef.current = new Set(currentIds);
            }
            requestAnimationFrame(() => {
              highlightAiBlocks(currentIds);
              // Auto-scroll to follow AI typing
              const lastId = currentIds[currentIds.length - 1];
              const lastEl = wrapperRef.current?.querySelector(`[data-id="${lastId}"]`);
              if (lastEl) lastEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
          } catch { /* block may have been removed */ }
        },
        onDone: (fullText) => {
          // Final parse into proper blocks
          const newBlocks = parseMarkdownToBlocks(fullText);
          const oldIds = getAiBlockIds();

          try {
            if (oldIds.length > 0) {
              editor.replaceBlocks(oldIds, newBlocks);
              aiBlockCountRef.current = newBlocks.length;
              currentIds = getAiBlockIds();
            }
          } catch {}

          const finalIds = new Set(currentIds);
          aiBlockIdsRef.current = finalIds;
          setAiBlockIds(finalIds);
          setAiGenerating(false);
          setAiGeneratingBlockId(null);
          aiAbortRef.current = null;

          // Highlight without cursor and show keep/discard
          setShowAIActions(true);
          requestAnimationFrame(() => {
            highlightAiBlocks(currentIds, false);
          });
        },
        onError: (err) => {
          setAiGenerating(false);
          setAiGeneratingBlockId(null);
          aiAbortRef.current = null;
          try {
            const ids = getAiBlockIds();
            if (ids.length > 0) editor.removeBlocks(ids);
          } catch {}
          setAiBlockIds(new Set());
          aiBlockIdsRef.current = new Set();
          setShowAIActions(false);
          setAiErrorToast(err.message || 'AI generation failed');
        },
      });
    } catch (err) {
      setAiGenerating(false);
      setAiGeneratingBlockId(null);
      aiAbortRef.current = null;
      if (err.name === 'AbortError') return;
      try {
        const ids = getAiBlockIds();
        if (ids.length > 0) editor.removeBlocks(ids);
      } catch {}
      setAiBlockIds(new Set());
      aiBlockIdsRef.current = new Set();
      setShowAIActions(false);
      setAiErrorToast(err.message || 'AI generation failed');
    }
  }, [editor, getAiBlockIds, highlightAiBlocks]);

  return (
    <div className="blog-editor-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
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

      {showAIMenu && (
        <AICommandMenu
          position={aiMenuPos}
          onSubmit={handleAISubmit}
          onClose={() => setShowAIMenu(false)}
        />
      )}

      {/* Elixpo AI typing bar — fixed bottom glassmorphism */}
      {aiGenerating && (
        <div className="elixpo-typing-bar">
          <div className="elixpo-typing-bar-inner">
            <img src="/base-logo.png" alt="Elixpo" className="elixpo-typing-avatar" />
            <div className="elixpo-typing-text">
              <span className="elixpo-typing-name">Elixpo</span>
              <span className="elixpo-typing-status">is typing<span className="elixpo-typing-dots"><span /><span /><span /></span></span>
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
      <AISelectionToolbar editor={editor} />

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
