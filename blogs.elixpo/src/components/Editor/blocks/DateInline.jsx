'use client';

import { createReactInlineContentSpec } from '@blocknote/react';

export const DateInline = createReactInlineContentSpec(
  {
    type: 'dateInline',
    propSchema: {
      date: { default: new Date().toISOString().split('T')[0] },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      const d = inlineContent.props.date;
      let formatted;
      try {
        formatted = new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        formatted = d;
      }
      return (
        <span className="inline-flex items-center gap-1 text-[#9b7bf7] bg-[#9b7bf710] px-1.5 py-0.5 rounded text-[13px] font-medium mx-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} /><line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} /><line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} /><line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} /></svg>
          {formatted}
        </span>
      );
    },
  }
);
