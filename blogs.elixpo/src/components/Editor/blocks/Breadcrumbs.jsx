'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';

export const Breadcrumbs = createReactBlockSpec(
  {
    type: 'breadcrumbs',
    propSchema: {
      items: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      let items = [];
      try { items = JSON.parse(block.props.items); } catch {}

      const [editing, setEditing] = useState(items.length === 0);
      const [text, setText] = useState(items.map((i) => `${i.label}|${i.href || ''}`).join('\n'));

      const save = () => {
        const parsed = text.split('\n').filter(Boolean).map((line) => {
          const [label, href] = line.split('|');
          return { label: label?.trim() || 'Page', href: href?.trim() || '' };
        });
        editor.updateBlock(block, { props: { items: JSON.stringify(parsed) } });
        setEditing(false);
      };

      if (editing) {
        return (
          <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-4 my-2">
            <p className="text-[11px] text-[var(--text-muted)] font-medium mb-2">Breadcrumbs (one per line: label|url)</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Home|/\nBlog|/blog\nCurrent Page"}
              rows={4}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg p-3 text-[13px] text-[var(--text-primary)] font-mono resize-none outline-none focus:border-[var(--border-hover)] placeholder-[#6b7a8d]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditing(false)} className="px-3 py-1 text-[12px] text-[#888]">Cancel</button>
              <button onClick={save} className="px-3 py-1 text-[12px] bg-[#9b7bf7] text-[var(--text-primary)] rounded-md font-medium hover:bg-[#b69aff] transition-colors">Done</button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1.5 text-[13px] my-2 flex-wrap" onDoubleClick={() => setEditing(true)}>
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#4a5568]">/</span>}
              {item.href ? (
                <span className="text-[#9b7bf7] hover:text-[#b69aff] cursor-pointer transition-colors">{item.label}</span>
              ) : (
                <span className="text-[var(--text-muted)]">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      );
    },
  }
);
