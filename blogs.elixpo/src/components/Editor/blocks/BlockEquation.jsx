'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect, useRef } from 'react';
import katex from 'katex';

function renderKaTeX(latex, displayMode = true) {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false });
  } catch {
    return `<span style="color:#f87171">${latex}</span>`;
  }
}

export const BlockEquation = createReactBlockSpec(
  {
    type: 'blockEquation',
    propSchema: {
      latex: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const [editing, setEditing] = useState(false);
      const [value, setValue] = useState(block.props.latex || '');
      const inputRef = useRef(null);

      useEffect(() => {
        if (editing) inputRef.current?.focus();
      }, [editing]);

      const save = () => {
        editor.updateBlock(block, { props: { latex: value } });
        setEditing(false);
      };

      if (editing) {
        return (
          <div className="mermaid-block mermaid-block--editing">
            <div className="mermaid-block-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>
              </svg>
              <span>LaTeX Equation</span>
            </div>
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); save(); } }}
              placeholder="E = mc^2"
              rows={6}
              className="mermaid-block-textarea"
            />
            <div className="mermaid-block-actions">
              <button onClick={() => setEditing(false)} className="mermaid-btn-cancel">Cancel</button>
              <button onClick={save} className="mermaid-btn-save" disabled={!value.trim()}>Done</button>
            </div>
          </div>
        );
      }

      const latex = block.props.latex;
      if (!latex) {
        return (
          <div
            onClick={() => setEditing(true)}
            className="border border-dashed border-[var(--border-default)] rounded-xl bg-[#141a2680] px-5 py-6 my-2 text-center cursor-pointer hover:border-[var(--border-hover)] transition-colors"
          >
            <p className="text-[13px] text-[var(--text-muted)]">Click to add a block equation</p>
          </div>
        );
      }

      return (
        <div
          onClick={() => setEditing(true)}
          className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] px-5 py-4 my-2 cursor-pointer hover:border-[var(--border-hover)] transition-colors text-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: renderKaTeX(latex) }}
        />
      );
    },
  }
);
