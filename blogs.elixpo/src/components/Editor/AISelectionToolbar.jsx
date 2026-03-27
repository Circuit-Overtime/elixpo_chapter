'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamAI } from '../../ai/stream';
import { EDIT_SYSTEM_PROMPT, WRITE_SYSTEM_PROMPT } from '../../ai/prompts';
import { parseMarkdownToBlocks } from './markdownToBlocks';

/**
 * AI toolbar button injected into BlockNote's native formatting toolbar.
 * Star icon appears inside .bn-toolbar → click opens prompt panel → streams AI edits.
 */
export default function AISelectionToolbar({ editor }) {
  const [mode, setMode] = useState('idle'); // idle | prompting | streaming | done
  const [prompt, setPrompt] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [aiResult, setAiResult] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const abortRef = useRef(null);
  const promptRef = useRef(null);
  const panelRef = useRef(null);
  const injectedRef = useRef(false);

  // Inject star button into BlockNote's native toolbar
  useEffect(() => {
    if (!editor) return;

    const interval = setInterval(() => {
      const toolbar = document.querySelector('.blog-editor-wrapper .bn-toolbar');
      if (!toolbar) {
        injectedRef.current = false;
        return;
      }

      // Already injected into this toolbar instance
      if (toolbar.querySelector('.ai-star-btn')) return;

      injectedRef.current = true;

      // Add a separator + star button
      const sep = document.createElement('div');
      sep.className = 'ai-toolbar-sep';

      const btn = document.createElement('button');
      btn.className = 'ai-star-btn';
      btn.title = 'Edit with AI';
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>';

      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Capture selection
        try {
          const sel = editor.getSelection();
          if (!sel?.blocks?.length) return;

          const text = sel.blocks
            .map((b) => (b.content && Array.isArray(b.content)) ? b.content.map((c) => c.text || '').join('') : '')
            .join('\n')
            .trim();
          if (!text) return;

          setSelectedText(text);
          setSelectedBlockIds(sel.blocks.map((b) => b.id));

          // Position panel below the toolbar
          const rect = toolbar.getBoundingClientRect();
          setPanelPos({
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2,
          });

          setMode('prompting');
          setPrompt('');
          setAiResult('');
          setStreamingText('');
        } catch { /* editor not ready */ }
      };

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

  // Close panel on click outside
  useEffect(() => {
    if (mode === 'idle') return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        handleCancel();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mode]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return;

    setMode('streaming');
    setStreamingText('');
    setAiResult('');

    const controller = new AbortController();
    abortRef.current = controller;

    const isEdit = selectedText.length > 0;
    const systemPrompt = isEdit ? EDIT_SYSTEM_PROMPT : WRITE_SYSTEM_PROMPT;
    const userPrompt = isEdit
      ? `Selected text:\n\`\`\`\n${selectedText}\n\`\`\`\n\nInstruction: ${prompt}`
      : prompt;

    try {
      await streamAI({
        systemPrompt,
        userPrompt,
        signal: controller.signal,
        onChunk: (chunk, full) => setStreamingText(full),
        onDone: (full) => {
          setAiResult(full);
          setStreamingText(full);
          setMode('done');
        },
        onError: (err) => {
          console.error('AI stream error:', err);
          setMode('prompting');
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('AI error:', err);
        setMode('prompting');
      }
    }
  }, [prompt, selectedText]);

  const handleAccept = useCallback(() => {
    if (!aiResult || !editor) return;
    try {
      const newBlocks = parseMarkdownToBlocks(aiResult);
      if (selectedBlockIds.length > 0 && newBlocks.length > 0) {
        editor.replaceBlocks(selectedBlockIds, newBlocks);
      }
    } catch (err) {
      console.error('Failed to apply AI edit:', err);
    }
    resetState();
  }, [aiResult, editor, selectedBlockIds]);

  const handleUndo = () => {
    abortRef.current?.abort();
    resetState();
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    resetState();
  };

  function resetState() {
    setMode('idle');
    setPrompt('');
    setAiResult('');
    setStreamingText('');
    setSelectedText('');
    setSelectedBlockIds([]);
  }

  if (mode === 'idle') return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] -translate-x-1/2"
      style={{ top: panelPos.top, left: panelPos.left }}
    >
      <div className="w-[420px] bg-[#141a26] border border-[#232d3f] rounded-xl shadow-2xl overflow-hidden">
        {/* Prompt input */}
        {mode === 'prompting' && (
          <div className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#9b7bf714] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#9b7bf7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                </svg>
              </div>
              <input
                ref={promptRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && prompt.trim()) { e.preventDefault(); handleSubmit(); }
                  if (e.key === 'Escape') handleCancel();
                }}
                placeholder="Improve, fix grammar, translate, rewrite..."
                className="flex-1 bg-transparent text-[13px] text-[#e0e0e0] placeholder-[#6b7a8d] outline-none"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  prompt.trim() ? 'bg-[#9b7bf7] hover:bg-[#b69aff]' : 'bg-[#232d3f]'
                }`}
              >
                <svg className={`w-3 h-3 ${prompt.trim() ? 'text-white' : 'text-[#4a5568]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Streaming / Done: diff view */}
        {(mode === 'streaming' || mode === 'done') && (
          <div>
            <div className="max-h-[300px] overflow-y-auto p-4 scrollbar-thin">
              {selectedText && (
                <div className="mb-3">
                  <p className="text-[10px] text-[#6b7a8d] uppercase tracking-wider mb-1.5 font-bold">Original</p>
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap ai-diff-deleted">
                    {selectedText}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] text-[#6b7a8d] uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
                  AI Edit
                  {mode === 'streaming' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd] animate-pulse" />
                  )}
                </p>
                <div className="text-[13px] text-[#c4b5fd] leading-relaxed whitespace-pre-wrap bg-[#c4b5fd08] rounded-lg px-3 py-2 border-l-2 border-[#c4b5fd40]">
                  {streamingText ? (
                    <span className={mode === 'streaming' ? 'ai-streaming-cursor' : ''}>{streamingText}</span>
                  ) : (
                    <span className="text-[#6b7a8d] italic">Generating...</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#232d3f] bg-[#0c101780]">
              {mode === 'streaming' ? (
                <button onClick={handleCancel} className="text-[12px] text-[#9ca3af] hover:text-white transition-colors">
                  Cancel
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleAccept} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#9b7bf7] hover:bg-[#b69aff] rounded-lg transition-colors">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Accept
                  </button>
                  <button onClick={handleUndo} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#9ca3af] bg-[#232d3f] hover:text-white rounded-lg transition-colors">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Undo
                  </button>
                </div>
              )}
              {mode === 'done' && (
                <button onClick={() => { setMode('prompting'); setPrompt(''); }} className="text-[12px] text-[#9b7bf7] hover:text-[#b69aff] font-medium transition-colors">
                  Edit again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
