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
        <a href={`/${inlineContent.props.slugid}`} className="mention-chip" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {inlineContent.props.title || 'Untitled blog'}
        </a>
      );
    },
  }
);
