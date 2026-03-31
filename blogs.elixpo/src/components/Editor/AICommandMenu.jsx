'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function AICommandMenu({ position, onSubmit, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && !query)) {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      onSubmit(query.trim());
    }
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: position?.top ?? 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <div className="ai-inline-input-container">
        <div className="flex items-center gap-2.5 px-3 py-2">
          {/* AI logo */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden">
            <img src="/base-logo.png" alt="AI" className="w-full h-full object-cover" />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything..."
            className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[#566479] outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Submit button */}
          <button
            onClick={() => query.trim() && onSubmit(query.trim())}
            disabled={!query.trim()}
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              query.trim()
                ? 'bg-[#9b7bf7] hover:bg-[#b69aff] cursor-pointer'
                : 'bg-transparent cursor-default'
            }`}
          >
            <svg className={`w-3 h-3 ${query.trim() ? 'text-[var(--text-primary)]' : 'text-[#3a4553]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
