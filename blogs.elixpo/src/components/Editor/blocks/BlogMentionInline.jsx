'use client';

import { createReactInlineContentSpec } from '@blocknote/react';

export const BlogMentionInline = createReactInlineContentSpec(
  {
    type: 'blogMention',
    propSchema: {
      title: { default: '' },
      slugid: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      return (
        <span className="inline-flex items-center gap-1 text-[#60a5fa] hover:text-[#93c5fd] cursor-pointer mx-0.5 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          {inlineContent.props.title || 'Untitled blog'}
        </span>
      );
    },
  }
);
