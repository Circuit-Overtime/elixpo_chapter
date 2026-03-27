'use client';

import { createReactInlineContentSpec } from '@blocknote/react';

export const MentionInline = createReactInlineContentSpec(
  {
    type: 'mention',
    propSchema: {
      username: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      return (
        <span className="text-[#9b7bf7] hover:text-[#b69aff] cursor-pointer font-medium mx-0.5 transition-colors">
          @{inlineContent.props.username}
        </span>
      );
    },
  }
);
