'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamAI } from '../../ai/stream';
import { EDIT_SYSTEM_PROMPT } from '../../ai/prompts';
import { parseMarkdownToBlocks } from './markdownToBlocks';

/**
 * AI toolbar button injected into BlockNote's native formatting toolbar.
 * Star icon click → toolbar hides, inline AI prompt appears below selection →
 * AI edits inline with diff (strikethrough original, lavender new) → keep/undo.
 */
export default function AISelectionToolbar({ editor }) {
  const [mode, setMode] = useState('idle'); // idle | prompting | streaming | done
  const [prompt, setPrompt] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState([]); // full block snapshots for undo
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [originalBlockIds, setOriginalBlockIds] = useState([]); // IDs of strikethrough originals
  const [aiBlockIds, setAiBlockIds] = useState([]); // IDs of AI-generated blocks
  const [promptPos, setPromptPos] = useState({ top: 0 });
  const abortRef = useRef(null);
  const promptRef = useRef(null);
  const menuRef = useRef(null);
  const aiBlockCountRef = useRef(0);
  const injectedRef = useRef(false);
  const observerRef = useRef(null);

  // Inject star button + color buttons into BlockNote's native toolbar
  useEffect(() => {
    if (!editor) return;

    const interval = setInterval(() => {
      const toolbar = document.querySelector('.blog-editor-wrapper .bn-toolbar');
      if (!toolbar) {
        injectedRef.current = false;
        return;
      }

      if (toolbar.querySelector('.ai-star-btn')) return;
      injectedRef.current = true;

      // --- Text Color button ---
      const colorSep = document.createElement('div');
      colorSep.className = 'ai-toolbar-sep';

      const colorBtn = document.createElement('button');
      colorBtn.className = 'toolbar-color-btn';
      colorBtn.title = 'Text Color';
      colorBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="M7 16l5-12 5 12"/><path d="M9.5 11h5"/></svg><span class="toolbar-color-indicator" style="background:#e0e0e0"></span>';

      const colorPalette = [
        { label: 'Default', value: 'default' },
        { label: 'White', value: '#ffffff' },
        { label: 'Gray', value: '#9ca3af' },
        { label: 'Red', value: '#f87171' },
        { label: 'Orange', value: '#fb923c' },
        { label: 'Yellow', value: '#fbbf24' },
        { label: 'Green', value: '#4ade80' },
        { label: 'Blue', value: '#60a5fa' },
        { label: 'Purple', value: '#a78bfa' },
        { label: 'Pink', value: '#f472b6' },
      ];

      colorBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
      colorBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.toolbar-color-popover').forEach(el => el.remove());
        const pop = document.createElement('div');
        pop.className = 'toolbar-color-popover';
        const rect = colorBtn.getBoundingClientRect();
        pop.style.cssText = `position:fixed;top:${rect.bottom + 6}px;left:${rect.left}px;z-index:10000;`;
        pop.innerHTML = '<div class="toolbar-color-popover-label">Text Color</div>' +
          '<div class="toolbar-color-grid">' +
          colorPalette.map(c =>
            `<button class="toolbar-color-swatch" data-color="${c.value}" title="${c.label}" style="background:${c.value === 'default' ? 'transparent' : c.value};${c.value === 'default' ? 'border:1.5px dashed #6b7a8d;' : ''}"></button>`
          ).join('') + '</div>';
        pop.addEventListener('mousedown', (ev) => {
          const swatch = ev.target.closest('.toolbar-color-swatch');
          if (!swatch) return;
          ev.preventDefault();
          const color = swatch.dataset.color;
          try {
            editor.focus();
            if (color === 'default') {
              editor.removeStyles({ textColor: '' });
            } else {
              editor.addStyles({ textColor: color });
            }
          } catch (err) { console.error('Failed to apply text color:', err); }
          pop.remove();
        });
        document.body.appendChild(pop);
        setTimeout(() => {
          const dismiss = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', dismiss); } };
          document.addEventListener('mousedown', dismiss);
        }, 0);
      };

      // --- Highlight button ---
      const highlightBtn = document.createElement('button');
      highlightBtn.className = 'toolbar-highlight-btn';
      highlightBtn.title = 'Highlight Color';
      highlightBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span class="toolbar-color-indicator" style="background:#fbbf24"></span>';

      const highlightPalette = [
        { label: 'None', value: 'default' },
        { label: 'Gray', value: 'rgba(156,163,175,0.25)' },
        { label: 'Red', value: 'rgba(248,113,113,0.25)' },
        { label: 'Orange', value: 'rgba(251,146,60,0.25)' },
        { label: 'Yellow', value: 'rgba(251,191,36,0.25)' },
        { label: 'Green', value: 'rgba(74,222,128,0.25)' },
        { label: 'Blue', value: 'rgba(96,165,250,0.25)' },
        { label: 'Purple', value: 'rgba(167,139,250,0.25)' },
        { label: 'Pink', value: 'rgba(244,114,182,0.25)' },
      ];

      highlightBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
      highlightBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.toolbar-color-popover').forEach(el => el.remove());
        const pop = document.createElement('div');
        pop.className = 'toolbar-color-popover';
        const rect = highlightBtn.getBoundingClientRect();
        pop.style.cssText = `position:fixed;top:${rect.bottom + 6}px;left:${rect.left}px;z-index:10000;`;
        pop.innerHTML = '<div class="toolbar-color-popover-label">Highlight</div>' +
          '<div class="toolbar-color-grid">' +
          highlightPalette.map(c =>
            `<button class="toolbar-color-swatch" data-color="${c.value}" title="${c.label}" style="background:${c.value === 'default' ? 'transparent' : c.value};${c.value === 'default' ? 'border:1.5px dashed #6b7a8d;' : ''}"></button>`
          ).join('') + '</div>';
        pop.addEventListener('mousedown', (ev) => {
          const swatch = ev.target.closest('.toolbar-color-swatch');
          if (!swatch) return;
          ev.preventDefault();
          const color = swatch.dataset.color;
          try {
            editor.focus();
            if (color === 'default') {
              editor.removeStyles({ backgroundColor: '' });
            } else {
              editor.addStyles({ backgroundColor: color });
            }
          } catch (err) { console.error('Failed to apply highlight:', err); }
          pop.remove();
        });
        document.body.appendChild(pop);
        setTimeout(() => {
          const dismiss = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', dismiss); } };
          document.addEventListener('mousedown', dismiss);
        }, 0);
      };

      // --- AI Star button ---
      const sep = document.createElement('div');
      sep.className = 'ai-toolbar-sep';

      const btn = document.createElement('button');
      btn.className = 'ai-star-btn';
      btn.title = 'Edit with AI';
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>';

      btn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
          const sel = editor.getSelection();
          if (!sel?.blocks?.length) return;

          const text = sel.blocks
            .map((b) => (b.content && Array.isArray(b.content)) ? b.content.map((c) => c.text || '').join('') : '')
            .join('\n')
            .trim();
          if (!text) return;

          // Save full block snapshots for undo
          const blockSnapshots = sel.blocks.map((b) => JSON.parse(JSON.stringify(b)));
          const blockIds = sel.blocks.map((b) => b.id);

          setSelectedText(text);
          setSelectedBlocks(blockSnapshots);
          setSelectedBlockIds(blockIds);

          // Get position below selected blocks for the prompt
          const wrapperEl = document.querySelector('.blog-editor-wrapper');
          const wrapperRect = wrapperEl?.getBoundingClientRect();
          const lastBlockId = blockIds[blockIds.length - 1];
          const lastBlockEl = wrapperEl?.querySelector(`[data-id="${lastBlockId}"]`);

          let top = 0;
          if (lastBlockEl && wrapperRect) {
            const blockRect = lastBlockEl.getBoundingClientRect();
            top = blockRect.bottom - wrapperRect.top + 6;
          }

          setPromptPos({ top });
          setMode('prompting');
          setPrompt('');
          setAiBlockIds([]);
          setOriginalBlockIds([]);
        } catch { /* editor not ready */ }
      };

      toolbar.appendChild(colorSep);
      toolbar.appendChild(colorBtn);
      toolbar.appendChild(highlightBtn);
      toolbar.appendChild(sep);
      toolbar.appendChild(btn);
    }, 200);

    return () => clearInterval(interval);
  }, [editor]);

  // Focus prompt input when entering prompting mode
  useEffect(() => {
    if (mode === 'prompting') {
      setTimeout(() => promptRef.current?.focus(), 50);
    }
  }, [mode]);

  // Close prompt on click outside (only in prompting mode)
  useEffect(() => {
    if (mode !== 'prompting') return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        resetState();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mode]);

  // Force lavender color on AI-generated block elements
  const forceLavenderOnBlock = useCallback((el) => {
    el.style.setProperty('color', '#c4b5fd', 'important');
    el.querySelectorAll('*').forEach((child) => {
      child.style.setProperty('color', '#c4b5fd', 'important');
    });
  }, []);

  // Start MutationObserver to keep lavender enforced during re-renders
  const startObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const wrapper = document.querySelector('.blog-editor-wrapper');
    if (!wrapper) return;

    const observer = new MutationObserver(() => {
      observer.disconnect();
      wrapper.querySelectorAll('.ai-edit-new-block').forEach(forceLavenderOnBlock);
      observer.observe(wrapper, { childList: true, subtree: true, characterData: true });
    });
    observer.observe(wrapper, { childList: true, subtree: true, characterData: true });
    observerRef.current = observer;
  }, [forceLavenderOnBlock]);

  const stopObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  // Apply strikethrough + dim styling on original blocks via DOM
  const markOriginalBlocks = useCallback((ids) => {
    const wrapper = document.querySelector('.blog-editor-wrapper');
    if (!wrapper) return;
    for (const id of ids) {
      const el = wrapper.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.classList.add('ai-edit-original-block');
      }
    }
  }, []);

  // Apply lavender styling on AI blocks via DOM
  const markAiBlocks = useCallback((ids) => {
    const wrapper = document.querySelector('.blog-editor-wrapper');
    if (!wrapper) return;
    for (const id of ids) {
      const el = wrapper.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.classList.add('ai-edit-new-block');
        forceLavenderOnBlock(el);
      }
    }
  }, [forceLavenderOnBlock]);

  // Get current AI block IDs by position (after last original block)
  const getAiBlockIdsFromDoc = useCallback(() => {
    if (originalBlockIds.length === 0) return [];
    const doc = editor.document;
    const lastOrigIdx = doc.findIndex((b) => b.id === originalBlockIds[originalBlockIds.length - 1]);
    if (lastOrigIdx === -1) return [];
    return doc.slice(lastOrigIdx + 1, lastOrigIdx + 1 + aiBlockCountRef.current).map((b) => b.id);
  }, [editor, originalBlockIds]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !editor) return;

    // Mark original blocks with strikethrough
    markOriginalBlocks(selectedBlockIds);
    setOriginalBlockIds([...selectedBlockIds]);

    // Insert initial AI placeholder block after the last selected block
    const lastOrigId = selectedBlockIds[selectedBlockIds.length - 1];
    editor.insertBlocks([{ type: 'paragraph', content: [] }], lastOrigId, 'after');

    const doc = editor.document;
    const lastOrigIdx = doc.findIndex((b) => b.id === lastOrigId);
    const insertedBlock = doc[lastOrigIdx + 1];
    if (!insertedBlock) return;

    aiBlockCountRef.current = 1;
    const initialAiIds = [insertedBlock.id];
    setAiBlockIds(initialAiIds);

    setMode('streaming');

    // Apply lavender styling
    requestAnimationFrame(() => {
      markAiBlocks(initialAiIds);
      startObserver();
      const el = document.querySelector(`.blog-editor-wrapper [data-id="${insertedBlock.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const controller = new AbortController();
    abortRef.current = controller;

    // Build prompt with context
    let fullBlogText = '';
    try {
      fullBlogText = editor.document.map((b) => {
        const text = (b.content || []).map((c) => c.text || '').join('');
        if (b.type === 'heading') return `${'#'.repeat(b.props?.level || 1)} ${text}`;
        return text;
      }).filter(Boolean).join('\n');
    } catch {}

    const userPrompt = `## Full blog (for context):\n${fullBlogText}\n\n---\n\nSelected text to edit:\n\`\`\`\n${selectedText}\n\`\`\`\n\nInstruction: ${prompt}`;

    try {
      await streamAI({
        systemPrompt: EDIT_SYSTEM_PROMPT,
        userPrompt,
        signal: controller.signal,
        onChunk: (_chunk, fullText) => {
          const newBlocks = parseMarkdownToBlocks(fullText);
          const oldAiIds = getAiBlockIdsFromDoc();
          if (oldAiIds.length === 0) return;

          try {
            if (newBlocks.length !== aiBlockCountRef.current) {
              editor.replaceBlocks(oldAiIds, newBlocks);
              aiBlockCountRef.current = newBlocks.length;
            } else {
              const lastId = oldAiIds[oldAiIds.length - 1];
              const lastBlock = newBlocks[newBlocks.length - 1];
              editor.updateBlock(lastId, {
                type: lastBlock.type,
                props: lastBlock.props || {},
                content: lastBlock.content,
              });
            }
            const updatedIds = getAiBlockIdsFromDoc();
            setAiBlockIds(updatedIds);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                markAiBlocks(updatedIds);
                // Auto-scroll to last AI block
                const lastEl = document.querySelector(`.blog-editor-wrapper [data-id="${updatedIds[updatedIds.length - 1]}"]`);
                if (lastEl) {
                  const rect = lastEl.getBoundingClientRect();
                  if (rect.bottom > window.innerHeight * 0.7) {
                    window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.5, behavior: 'smooth' });
                  }
                }
              });
            });
          } catch { /* block may have been removed */ }
        },
        onDone: (fullText) => {
          const newBlocks = parseMarkdownToBlocks(fullText);
          const oldAiIds = getAiBlockIdsFromDoc();

          try {
            if (oldAiIds.length > 0) {
              editor.replaceBlocks(oldAiIds, newBlocks);
              aiBlockCountRef.current = newBlocks.length;
            }
          } catch {}

          const finalIds = getAiBlockIdsFromDoc();
          setAiBlockIds(finalIds);
          setMode('done');
          abortRef.current = null;

          requestAnimationFrame(() => {
            markAiBlocks(finalIds);
          });
        },
        onError: (err) => {
          console.error('AI stream error:', err);
          handleUndo();
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('AI error:', err);
        handleUndo();
      }
    }
  }, [prompt, selectedText, selectedBlockIds, editor, markOriginalBlocks, markAiBlocks, startObserver, getAiBlockIdsFromDoc]);

  const handleKeep = useCallback(() => {
    stopObserver();
    // Remove original (strikethrough) blocks
    try {
      if (originalBlockIds.length > 0) {
        editor.removeBlocks(originalBlockIds);
      }
    } catch {}
    // Clean up lavender styling from AI blocks
    const wrapper = document.querySelector('.blog-editor-wrapper');
    wrapper?.querySelectorAll('.ai-edit-new-block').forEach((el) => {
      el.classList.remove('ai-edit-new-block');
      el.style.removeProperty('color');
      el.querySelectorAll('*').forEach((child) => child.style.removeProperty('color'));
    });
    resetState();
  }, [editor, originalBlockIds, stopObserver]);

  const handleUndo = useCallback(() => {
    abortRef.current?.abort();
    stopObserver();
    // Remove AI-generated blocks
    const currentAiIds = getAiBlockIdsFromDoc();
    try {
      if (currentAiIds.length > 0) editor.removeBlocks(currentAiIds);
    } catch {}
    // Restore original blocks from snapshots
    if (selectedBlocks.length > 0 && originalBlockIds.length > 0) {
      try {
        editor.replaceBlocks(originalBlockIds, selectedBlocks);
      } catch {}
    }
    // Clean up strikethrough styling
    const wrapper = document.querySelector('.blog-editor-wrapper');
    wrapper?.querySelectorAll('.ai-edit-original-block').forEach((el) => {
      el.classList.remove('ai-edit-original-block');
    });
    resetState();
  }, [editor, selectedBlocks, originalBlockIds, getAiBlockIdsFromDoc, stopObserver]);

  function resetState() {
    setMode('idle');
    setPrompt('');
    setSelectedText('');
    setSelectedBlocks([]);
    setSelectedBlockIds([]);
    setOriginalBlockIds([]);
    setAiBlockIds([]);
    aiBlockCountRef.current = 0;
    // Clean up any leftover DOM classes
    const wrapper = document.querySelector('.blog-editor-wrapper');
    wrapper?.querySelectorAll('.ai-edit-original-block, .ai-edit-new-block').forEach((el) => {
      el.classList.remove('ai-edit-original-block', 'ai-edit-new-block');
      el.style.removeProperty('color');
      el.querySelectorAll('*').forEach((child) => child.style.removeProperty('color'));
    });
  }

  // Render the inline AI prompt (same style as space-trigger AICommandMenu)
  if (mode === 'prompting') {
    return (
      <div
        ref={menuRef}
        style={{
          position: 'absolute',
          top: promptPos.top,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <div className="mx-auto w-full max-w-[600px] bg-[#141a26] border border-[#232d3f] rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
              <img src="/base-logo.png" alt="AI" className="w-full h-full object-cover" />
            </div>
            <input
              ref={promptRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && prompt.trim()) { e.preventDefault(); handleSubmit(); }
                if (e.key === 'Escape') resetState();
              }}
              placeholder="Edit: improve, fix grammar, translate, rewrite..."
              className="flex-1 bg-transparent text-[14px] text-[#e0e0e0] placeholder-[#6b7a8d] outline-none"
              autoComplete="off"
              spellCheck="false"
            />
            <button
              onClick={() => prompt.trim() && handleSubmit()}
              disabled={!prompt.trim()}
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                prompt.trim()
                  ? 'bg-[#9b7bf7] hover:bg-[#b69aff] cursor-pointer'
                  : 'bg-[#232d3f] cursor-not-allowed'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${prompt.trim() ? 'text-white' : 'text-[#4a5568]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Streaming: show Elixpo typing bar at bottom
  if (mode === 'streaming') {
    return (
      <div className="elixpo-typing-bar">
        <div className="elixpo-typing-bar-inner">
          <img src="/base-logo.png" alt="Elixpo" className="elixpo-typing-avatar" />
          <div className="elixpo-typing-text">
            <span className="elixpo-typing-name">Elixpo</span>
            <span className="elixpo-typing-status">is editing<span className="elixpo-typing-dots"><span /><span /><span /></span></span>
          </div>
          <button className="elixpo-stop-btn" onClick={handleUndo}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="1" width="10" height="10" rx="2" />
            </svg>
            Stop
          </button>
        </div>
      </div>
    );
  }

  // Done: show keep/undo bar at bottom
  if (mode === 'done') {
    return (
      <div className="elixpo-done-bar">
        <div className="elixpo-done-bar-inner">
          <img src="/base-logo.png" alt="Elixpo" className="elixpo-typing-avatar" />
          <span className="elixpo-done-label">Elixpo finished editing</span>
          <div className="elixpo-done-actions">
            <button className="elixpo-done-keep" onClick={handleKeep} title="Keep">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Keep
            </button>
            <button className="elixpo-done-discard" onClick={handleUndo} title="Undo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Undo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
