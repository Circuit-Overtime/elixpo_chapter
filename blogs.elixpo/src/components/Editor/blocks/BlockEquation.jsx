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
          <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-4 my-2">
            <p className="text-[11px] text-[var(--text-muted)] mb-2 font-medium">LaTeX Equation</p>
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); save(); } }}
              placeholder="E = mc^2"
              rows={3}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg p-3 text-[13px] text-[var(--text-primary)] font-mono resize-none outline-none focus:border-[var(--border-hover)] transition-colors placeholder-[#6b7a8d]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditing(false)} className="px-3 py-1 text-[12px] text-[#888] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
              <button onClick={save} className="px-3 py-1 text-[12px] bg-[#9b7bf7] text-[var(--text-primary)] rounded-md font-medium hover:bg-[#b69aff] transition-colors">Done</button>
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
