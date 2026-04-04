'use client';

import { createReactInlineContentSpec } from '@blocknote/react';

export const OrgMentionInline = createReactInlineContentSpec(
  {
    type: 'orgMention',
    propSchema: {
      name: { default: '' },
      slug: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      return (
        <span className="inline-flex items-center gap-1 text-[#60a5fa] hover:text-[#93c5fd] cursor-pointer font-medium mx-0.5 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          @{inlineContent.props.name || inlineContent.props.slug}
        </span>
      );
    },
  }
);
