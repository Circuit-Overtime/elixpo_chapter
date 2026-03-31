'use client';

import { useEffect, useRef } from 'react';

const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'S'], desc: 'Save & sync to cloud' },
      { keys: ['Ctrl', 'Shift', 'P'], desc: 'Toggle editor / preview' },
      { keys: ['Ctrl', 'Z'], desc: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo' },
      { keys: ['Ctrl', 'A'], desc: 'Select all' },
      { keys: ['?'], desc: 'Show this help' },
    ],
  },
  {
    title: 'Text Formatting',
    shortcuts: [
      { keys: ['Ctrl', 'B'], desc: 'Bold' },
      { keys: ['Ctrl', 'I'], desc: 'Italic' },
      { keys: ['Ctrl', 'U'], desc: 'Underline' },
      { keys: ['Ctrl', 'E'], desc: 'Code (inline)' },
      { keys: ['Ctrl', 'Shift', 'S'], desc: 'Strikethrough' },
      { keys: ['Ctrl', 'K'], desc: 'Add link' },
    ],
  },
  {
    title: 'Blocks',
    shortcuts: [
      { keys: ['/'], desc: 'Slash commands menu' },
      { keys: ['Space'], desc: 'AI assistant (on empty line)' },
      { keys: ['@'], desc: 'Mention user/blog/org' },
      { keys: ['Tab'], desc: 'Indent block' },
      { keys: ['Shift', 'Tab'], desc: 'Outdent block' },
      { keys: ['Enter'], desc: 'New block' },
      { keys: ['Backspace'], desc: 'Delete block (when empty)' },
    ],
  },
  {
    title: 'AI',
    shortcuts: [
      { keys: ['Space'], desc: 'Open AI prompt (empty line)' },
      { keys: ['★', 'click'], desc: 'AI edit selected text' },
      { keys: ['Esc'], desc: 'Cancel AI / close menu' },
    ],
  },
];

export default function KeyboardShortcutsModal({ onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={ref}
        className="w-full max-w-[520px] max-h-[80vh] bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[rgba(196,181,253,0.15)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors p-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-6 space-y-6 scrollbar-thin">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] font-semibold text-[#c4b5fd] uppercase tracking-wider mb-3">{group.title}</h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-[var(--text-muted)]">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key, j) => (
                        <span key={j}>
                          {j > 0 && <span className="text-[#4a5568] text-[10px] mx-0.5">+</span>}
                          <kbd className="inline-block min-w-[24px] text-center px-1.5 py-0.5 text-[11px] font-medium text-[#c4b5fd] bg-[rgba(196,181,253,0.08)] border border-[rgba(196,181,253,0.15)] rounded-md">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
