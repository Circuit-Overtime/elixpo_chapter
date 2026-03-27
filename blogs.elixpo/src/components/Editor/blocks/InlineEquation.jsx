'use client';

import { createReactInlineContentSpec } from '@blocknote/react';

function renderKaTeXInline(latex) {
  try {
    const katex = require('katex');
    return katex.renderToString(latex, { displayMode: false, throwOnError: false });
  } catch {
    return `<span style="color:#f87171">${latex}</span>`;
  }
}

export const InlineEquation = createReactInlineContentSpec(
  {
    type: 'inlineEquation',
    propSchema: {
      latex: { default: 'x^2' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      const html = renderKaTeXInline(inlineContent.props.latex);
      return (
        <span
          className="inline-equation mx-0.5 cursor-pointer"
          dangerouslySetInnerHTML={{ __html: html }}
          title={inlineContent.props.latex}
        />
      );
    },
  }
);
