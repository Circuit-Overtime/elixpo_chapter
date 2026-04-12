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
        <a href={`/${inlineContent.props.slugid}`} className="mention-chip" data-mention-type="blog" data-slugid={inlineContent.props.slugid} data-title={inlineContent.props.title} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }} spellCheck={false}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          {inlineContent.props.title || 'Untitled blog'}
        </a>
      );
    },
    parse: (el) => {
      if (el.getAttribute('data-mention-type') === 'blog') {
        return {
          title: el.getAttribute('data-title') || el.textContent?.trim() || '',
          slugid: el.getAttribute('data-slugid') || '',
        };
      }
      return undefined;
    },
  }
);
