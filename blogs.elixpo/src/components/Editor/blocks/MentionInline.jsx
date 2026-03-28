'use client';

import { createReactInlineContentSpec } from '@blocknote/react';

export const MentionInline = createReactInlineContentSpec(
  {
    type: 'mention',
    propSchema: {
      username: { default: '' },
      displayName: { default: '' },
      avatarUrl: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      const { username, displayName, avatarUrl } = inlineContent.props;
      return (
        <span className="mention-chip">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="mention-chip-avatar" />
          ) : (
            <span className="mention-chip-initial">
              {(displayName || username || '?')[0].toUpperCase()}
            </span>
          )}
          @{displayName || username}
        </span>
      );
    },
  }
);
