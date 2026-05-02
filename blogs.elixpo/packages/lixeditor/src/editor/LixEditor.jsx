'use client';

import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, createCodeBlockSpec } from '@blocknote/core';
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  TableHandlesController,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  filterSuggestionItems,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCallback, useMemo, forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { useLixTheme } from '../hooks/useLixTheme';

// Core blocks
import { BlockEquation } from '../blocks/BlockEquation';
import { MermaidBlock } from '../blocks/MermaidBlock';
import { TableOfContents } from '../blocks/TableOfContents';
import { InlineEquation } from '../blocks/InlineEquation';
import { DateInline } from '../blocks/DateInline';

// Optional blocks — imported but can be disabled via config
import { BlogImageBlock as ImageBlock } from '../blocks/ImageBlock';
import { ButtonBlock } from '../blocks/ButtonBlock';
import { PDFEmbedBlock } from '../blocks/PDFEmbedBlock';

// Utilities
import LinkPreviewTooltip, { useLinkPreview } from './LinkPreviewTooltip';

// Default code block languages
const DEFAULT_LANGUAGES = {
  text: { name: 'Text' },
  javascript: { name: 'JavaScript', aliases: ['js'] },
  typescript: { name: 'TypeScript', aliases: ['ts'] },
  python: { name: 'Python', aliases: ['py'] },
  java: { name: 'Java' },
  c: { name: 'C' },
  cpp: { name: 'C++' },
  csharp: { name: 'C#', aliases: ['cs'] },
  go: { name: 'Go' },
  rust: { name: 'Rust', aliases: ['rs'] },
  ruby: { name: 'Ruby', aliases: ['rb'] },
  php: { name: 'PHP' },
  swift: { name: 'Swift' },
  kotlin: { name: 'Kotlin', aliases: ['kt'] },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  json: { name: 'JSON' },
  yaml: { name: 'YAML', aliases: ['yml'] },
  markdown: { name: 'Markdown', aliases: ['md'] },
  bash: { name: 'Bash', aliases: ['sh'] },
  shell: { name: 'Shell' },
  sql: { name: 'SQL' },
  graphql: { name: 'GraphQL', aliases: ['gql'] },
  jsx: { name: 'JSX' },
  tsx: { name: 'TSX' },
  vue: { name: 'Vue' },
  svelte: { name: 'Svelte' },
  dart: { name: 'Dart' },
  lua: { name: 'Lua' },
  r: { name: 'R' },
  scala: { name: 'Scala' },
};

/**
 * LixEditor — A rich WYSIWYG block editor.
 *
 * @param {Object} props
 * @param {Array} [props.initialContent] - Initial block content (BlockNote format)
 * @param {Function} [props.onChange] - Called when content changes, receives the editor instance
 * @param {Object} [props.features] - Enable/disable features
 * @param {boolean} [props.features.equations=true] - Block & inline LaTeX equations
 * @param {boolean} [props.features.mermaid=true] - Mermaid diagram blocks
 * @param {boolean} [props.features.codeHighlighting=true] - Shiki syntax highlighting
 * @param {boolean} [props.features.tableOfContents=true] - TOC block
 * @param {boolean} [props.features.images=true] - Image blocks
 * @param {boolean} [props.features.buttons=true] - Button blocks
 * @param {boolean} [props.features.pdf=true] - PDF embed blocks
 * @param {boolean} [props.features.dates=true] - Inline date chips
 * @param {boolean} [props.features.linkPreview=true] - Link hover preview
 * @param {boolean} [props.features.markdownLinks=true] - Auto-convert [text](url) to links
 * @param {Object} [props.codeLanguages] - Custom code block language map (overrides defaults)
 * @param {Array} [props.extraBlockSpecs] - Additional custom block specs to register
 * @param {Array} [props.extraInlineSpecs] - Additional custom inline content specs
 * @param {Array} [props.slashMenuItems] - Additional slash menu items
 * @param {string} [props.placeholder] - Editor placeholder text
 * @param {Object} [props.collaboration] - Yjs collaboration config
 * @param {Function} [props.onReady] - Called when editor is ready
 * @param {React.ReactNode} [props.children] - Additional children rendered inside BlockNoteView
 */
const LixEditor = forwardRef(function LixEditor({
  initialContent,
  onChange,
  features = {},
  codeLanguages,
  extraBlockSpecs = [],
  extraInlineSpecs = [],
  slashMenuItems: extraSlashItems = [],
  placeholder = "Type '/' for commands...",
  collaboration,
  onReady,
  children,
}, ref) {
  const { isDark } = useLixTheme();
  const wrapperRef = useRef(null);
  const editorLinkPreview = useLinkPreview();

  // Merge features with defaults
  const f = {
    equations: true, mermaid: true, codeHighlighting: true,
    tableOfContents: true, images: true, buttons: true, pdf: true,
    dates: true, linkPreview: true, markdownLinks: true,
    ...features,
  };

  // Build block specs
  const langs = codeLanguages || DEFAULT_LANGUAGES;
  const codeBlock = f.codeHighlighting
    ? createCodeBlockSpec({
        supportedLanguages: langs,
        createHighlighter: async () => {
          const { createHighlighter } = await import('shiki');
          return createHighlighter({
            themes: ['vitesse-dark', 'vitesse-light'],
            langs: Object.keys(langs).filter(k => k !== 'text'),
          });
        },
      })
    : undefined;

  const schema = useMemo(() => {
    const blockSpecs = { ...defaultBlockSpecs };
    if (codeBlock) blockSpecs.codeBlock = codeBlock;
    if (f.equations) blockSpecs.blockEquation = BlockEquation({});
    if (f.mermaid) blockSpecs.mermaidBlock = MermaidBlock({});
    if (f.tableOfContents) blockSpecs.tableOfContents = TableOfContents({});
    if (f.images) blockSpecs.image = ImageBlock({});
    if (f.buttons) blockSpecs.buttonBlock = ButtonBlock({});
    if (f.pdf) blockSpecs.pdfEmbed = PDFEmbedBlock({});

    // Register extra block specs
    for (const spec of extraBlockSpecs) {
      if (spec.type && spec.spec) blockSpecs[spec.type] = spec.spec;
    }

    const inlineContentSpecs = { ...defaultInlineContentSpecs };
    if (f.equations) inlineContentSpecs.inlineEquation = InlineEquation;
    if (f.dates) inlineContentSpecs.dateInline = DateInline;

    // Register extra inline specs
    for (const spec of extraInlineSpecs) {
      if (spec.type && spec.spec) inlineContentSpecs[spec.type] = spec.spec;
    }

    return BlockNoteSchema.create({ blockSpecs, inlineContentSpecs });
  }, []);

  // Sanitize initial content
  const sanitized = useMemo(() => {
    if (!initialContent) return undefined;
    let blocks = initialContent;
    if (typeof blocks === 'string') {
      try { blocks = JSON.parse(blocks); } catch { return undefined; }
    }
    if (!Array.isArray(blocks) || blocks.length === 0) return undefined;
    return blocks;
  }, [initialContent]);

  const editor = useCreateBlockNote({
    schema,
    ...(collaboration ? { collaboration } : { initialContent: sanitized || undefined }),
    domAttributes: { editor: { class: 'lix-editor' } },
    placeholders: { default: placeholder },
  });

  useImperativeHandle(ref, () => ({
    getDocument: () => editor.document,
    getEditor: () => editor,
    getBlocks: () => editor.document,
    getHTML: async () => await editor.blocksToHTMLLossy(editor.document),
    getMarkdown: async () => await editor.blocksToMarkdownLossy(editor.document),
  }), [editor]);

  // Notify parent when ready
  useEffect(() => { if (onReady) onReady(); }, []);

  // Auto-convert ![alt](url) to image block and [text](url) to link as you type
  useEffect(() => {
    if (!f.markdownLinks || !editor) return;
    const tiptap = editor._tiptapEditor;
    if (!tiptap) return;

    const handleInput = () => {
      const { state, view } = tiptap;
      const { $from } = state.selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

      // Image syntax: ![alt](url)
      const imgMatch = textBefore.match(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
      if (imgMatch) {
        const [fullMatch, alt, imgUrl] = imgMatch;
        const from = $from.pos - fullMatch.length;
        view.dispatch(state.tr.delete(from, $from.pos));
        const cursorBlock = editor.getTextCursorPosition().block;
        editor.insertBlocks(
          [{ type: 'image', props: { url: imgUrl, caption: alt || '' } }],
          cursorBlock, 'after'
        );
        requestAnimationFrame(() => {
          try {
            const block = editor.getTextCursorPosition().block;
            if (block?.type === 'paragraph' && !(block.content || []).some(c => c.text?.trim())) {
              editor.removeBlocks([block.id]);
            }
          } catch {}
        });
        return;
      }

      // Link syntax: [text](url)
      const match = textBefore.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (!match) return;
      const [fullMatch, linkText, url] = match;
      const from = $from.pos - fullMatch.length;
      const linkMark = state.schema.marks.link.create({ href: url });
      const tr = state.tr.delete(from, $from.pos).insertText(linkText, from).addMark(from, from + linkText.length, linkMark);
      view.dispatch(tr);
    };

    tiptap.on('update', handleInput);
    return () => tiptap.off('update', handleInput);
  }, [editor, f.markdownLinks]);

  // Link preview hover
  useEffect(() => {
    if (!f.linkPreview) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleMouseOver = (e) => {
      const link = e.target.closest('a[href]');
      if (!link || link.closest('.bn-link-toolbar') || link.closest('.bn-toolbar')) return;
      const href = link.getAttribute('href');
      if (href && href.startsWith('http')) editorLinkPreview.show(link, href);
    };
    const handleMouseOut = (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      editorLinkPreview.cancel();
    };
    const handleClick = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const link = e.target.closest('a[href]');
      if (!link || link.closest('.bn-link-toolbar')) return;
      const href = link.getAttribute('href');
      if (href && href.startsWith('http')) {
        e.preventDefault();
        e.stopPropagation();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    };
    const handleKeyDown = (e) => { if (e.ctrlKey || e.metaKey) wrapper.classList.add('ctrl-held'); };
    const handleKeyUp = () => wrapper.classList.remove('ctrl-held');

    wrapper.addEventListener('mouseover', handleMouseOver);
    wrapper.addEventListener('mouseout', handleMouseOut);
    wrapper.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      wrapper.removeEventListener('mouseover', handleMouseOver);
      wrapper.removeEventListener('mouseout', handleMouseOut);
      wrapper.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [f.linkPreview]);

  // Ctrl+D / Cmd+D: insert today's date as an inline chip at the cursor.
  // Only fires when focus is inside the editor and the dates feature is on.
  useEffect(() => {
    if (!f.dates || !editor) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== 'd') return;
      // Only intercept when the editable area has focus.
      const active = document.activeElement;
      if (!active || !wrapper.contains(active)) return;

      e.preventDefault();
      try {
        const today = new Date().toISOString().split('T')[0];
        editor._tiptapEditor.commands.insertContent({
          type: 'dateInline',
          attrs: { date: today },
        });
      } catch (err) {
        console.warn('[LixEditor] insert date failed:', err);
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editor, f.dates]);

  // Slash menu items
  // Use BlockNote's `filterSuggestionItems` helper so the search also
  // covers `aliases` / `subtext` / `group` (the previous custom filter
  // checked title only, which produced weird half-rendered groups when
  // BlockNote items had no `title` field for the current schema).
  const getItems = useCallback(async (query) => {
    const defaults = getDefaultReactSlashMenuItems(editor)
      .filter(item => !['video', 'audio', 'file'].includes(item.key));

    const custom = [];

    if (f.equations) {
      custom.push({
        title: 'Block Equation',
        subtext: 'LaTeX block equation',
        group: 'Advanced',
        aliases: ['equation', 'eq', 'latex', 'math', 'tex'],
        icon: <span style={{ fontSize: 16 }}>∑</span>,
        onItemClick: () => editor.insertBlocks([{ type: 'blockEquation' }], editor.getTextCursorPosition().block, 'after'),
      });
    }

    if (f.mermaid) {
      custom.push({
        title: 'Diagram',
        subtext: 'Mermaid diagram (flowchart, sequence, etc.)',
        group: 'Advanced',
        aliases: ['mermaid', 'flowchart', 'sequence', 'diagram', 'graph'],
        icon: <span style={{ fontSize: 14 }}>◇</span>,
        onItemClick: () => editor.insertBlocks([{ type: 'mermaidBlock' }], editor.getTextCursorPosition().block, 'after'),
      });
    }

    if (f.tableOfContents) {
      custom.push({
        title: 'Table of Contents',
        subtext: 'Auto-generated document outline',
        group: 'Advanced',
        aliases: ['toc', 'outline', 'contents'],
        icon: <span style={{ fontSize: 14 }}>☰</span>,
        onItemClick: () => editor.insertBlocks([{ type: 'tableOfContents' }], editor.getTextCursorPosition().block, 'after'),
      });
    }

    if (f.dates) {
      custom.push({
        title: 'Date',
        subtext: "Insert today's date as an inline chip (Ctrl+D)",
        group: 'Advanced',
        aliases: ['date', 'today', 'time', 'now'],
        icon: <span style={{ fontSize: 14 }}>📅</span>,
        onItemClick: () => {
          try {
            const today = new Date().toISOString().split('T')[0];
            editor._tiptapEditor.commands.insertContent({
              type: 'dateInline',
              attrs: { date: today },
            });
          } catch {}
        },
      });
    }

    const all = [...defaults, ...custom, ...extraSlashItems];
    return filterSuggestionItems(all, query);
  }, [editor, f, extraSlashItems]);

  const handleChange = useCallback(() => {
    if (onChange) onChange(editor);
  }, [editor, onChange]);

  return (
    <div className={`lix-editor-wrapper${''}`} ref={wrapperRef} style={{ position: 'relative' }}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme={isDark ? 'dark' : 'light'}
        slashMenu={false}
        formattingToolbar={false}
      >
        {/* Custom formatting toolbar — drop the "Create link" button.
            Inline link insertion is intentionally disabled; users can still
            paste URLs (auto-linked) and use the markdown shortcut [text](url). */}
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {getFormattingToolbarItems().filter((item) => {
                const key = item?.key ?? item?.props?.key;
                return key !== 'createLink';
              })}
            </FormattingToolbar>
          )}
        />
        <SuggestionMenuController triggerCharacter="/" getItems={getItems} />
        <TableHandlesController />
        {children}
      </BlockNoteView>

      {f.linkPreview && editorLinkPreview.preview && (
        <LinkPreviewTooltip
          anchorEl={editorLinkPreview.preview.anchorEl}
          url={editorLinkPreview.preview.url}
          onClose={editorLinkPreview.hide}
        />
      )}
    </div>
  );
});

export default LixEditor;
