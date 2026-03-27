'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamAI } from '../../ai/stream';
import { EDIT_SYSTEM_PROMPT, WRITE_SYSTEM_PROMPT } from '../../ai/prompts';

/**
 * AI toolbar that appears when text is selected.
 * Shows a star icon → on click opens prompt input → streams AI edits
 * with real-time diff (strikethrough old, blue new) → accept/undo.
 */
export default function AISelectionToolbar({ editor }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mode, setMode] = useState('idle'); // idle | prompting | streaming | done
  const [prompt, setPrompt] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [aiResult, setAiResult] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef(null);
  const promptRef = useRef(null);
  const toolbarRef = useRef(null);

  // Track text selection in the editor
  useEffect(() => {
    if (!editor) return;

    function checkSelection() {
      try {
        const sel = editor.getSelection();
        if (!sel) {
          // Only hide if we're in idle mode (not prompting/streaming)
          if (mode === 'idle') setVisible(false);
          return;
        }

        // Get selected text from the blocks
        const blocks = sel.blocks || [];
        if (blocks.length === 0) {
          if (mode === 'idle') setVisible(false);
          return;
        }

        const text = blocks
          .map((b) => {
            if (b.content && Array.isArray(b.content)) {
              return b.content.map((c) => c.text || '').join('');
            }
            return '';
          })
          .join('\n')
          .trim();

        if (!text) {
          if (mode === 'idle') setVisible(false);
          return;
        }

        setSelectedText(text);
        setSelectedBlockIds(blocks.map((b) => b.id));

        // Position the toolbar above the selection
        const domSel = window.getSelection();
        if (domSel && domSel.rangeCount > 0) {
          const range = domSel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0) {
            setPosition({
              top: rect.top + window.scrollY - 44,
              left: rect.left + rect.width / 2 + window.scrollX,
            });
            setVisible(true);
          }
        }
      } catch {
        // editor not ready
      }
    }

    // Poll for selection changes
    const interval = setInterval(checkSelection, 300);
    return () => clearInterval(interval);
  }, [editor, mode]);

  // Focus prompt input when entering prompting mode
  useEffect(() => {
    if (mode === 'prompting') {
      setTimeout(() => promptRef.current?.focus(), 50);
    }
  }, [mode]);

  const handleStarClick = () => {
    setMode('prompting');
    setPrompt('');
    setAiResult('');
    setStreamingText('');
  };

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
        onChunk: (chunk, full) => {
          setStreamingText(full);
        },
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
      // Replace the selected blocks with AI-generated content
      // Parse the markdown into blocks
      const lines = aiResult.split('\n');
      const newBlocks = lines
        .filter((line) => line.trim() !== '')
        .map((line) => {
          // Detect heading
          const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
          if (headingMatch) {
            return {
              type: 'heading',
              props: { level: headingMatch[1].length.toString() },
              content: [{ type: 'text', text: headingMatch[2] }],
            };
          }
          // Detect list item
          if (line.match(/^[-*]\s+/)) {
            return {
              type: 'bulletListItem',
              content: [{ type: 'text', text: line.replace(/^[-*]\s+/, '') }],
            };
          }
          if (line.match(/^\d+\.\s+/)) {
            return {
              type: 'numberedListItem',
              content: [{ type: 'text', text: line.replace(/^\d+\.\s+/, '') }],
            };
          }
          // Default paragraph
          return {
            type: 'paragraph',
            content: [{ type: 'text', text: line }],
          };
        });

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
    setVisible(false);
  }

  if (!visible && mode === 'idle') return null;

  // Idle: just the star button
  if (mode === 'idle') {
    return (
      <div
        ref={toolbarRef}
        className="fixed z-[60] -translate-x-1/2"
        style={{ top: position.top, left: position.left }}
      >
        <button
          onClick={handleStarClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141a26] border border-[#232d3f] rounded-lg shadow-xl hover:border-[#9b7bf7] hover:bg-[#9b7bf710] transition-all group"
          title="Edit with AI"
        >
          <svg className="w-4 h-4 text-[#9b7bf7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
          </svg>
          <span className="text-[12px] text-[#9b7bf7] font-medium hidden group-hover:inline">AI Edit</span>
        </button>
      </div>
    );
  }

  // Prompting / Streaming / Done: full panel
  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] -translate-x-1/2"
      style={{ top: position.top, left: position.left }}
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
            {/* Diff display */}
            <div className="max-h-[300px] overflow-y-auto p-4 scrollbar-thin">
              {/* Original text with strikethrough */}
              {selectedText && (
                <div className="mb-3">
                  <p className="text-[10px] text-[#6b7a8d] uppercase tracking-wider mb-1.5 font-bold">Original</p>
                  <div className="text-[13px] text-[#f8717180] leading-relaxed line-through decoration-[#f87171] whitespace-pre-wrap">
                    {selectedText}
                  </div>
                </div>
              )}

              {/* AI generated text (blue highlight) */}
              <div>
                <p className="text-[10px] text-[#6b7a8d] uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
                  AI Edit
                  {mode === 'streaming' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9b7bf7] animate-pulse" />
                  )}
                </p>
                <div className="text-[13px] text-[#93c5fd] leading-relaxed whitespace-pre-wrap bg-[#93c5fd08] rounded-lg px-3 py-2 border-l-2 border-[#93c5fd40]">
                  {streamingText || <span className="text-[#6b7a8d] italic">Generating...</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#232d3f] bg-[#0c101780]">
              {mode === 'streaming' ? (
                <button
                  onClick={handleCancel}
                  className="text-[12px] text-[#9ca3af] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAccept}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#9b7bf7] hover:bg-[#b69aff] rounded-lg transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Accept
                  </button>
                  <button
                    onClick={handleUndo}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#9ca3af] bg-[#232d3f] hover:text-white rounded-lg transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Undo
                  </button>
                </div>
              )}
              {mode === 'done' && (
                <button
                  onClick={() => { setMode('prompting'); setPrompt(''); }}
                  className="text-[12px] text-[#9b7bf7] hover:text-[#b69aff] font-medium transition-colors"
                >
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
